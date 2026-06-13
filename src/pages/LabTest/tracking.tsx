import { FiArrowLeft, FiCheckCircle, FiClock, FiMapPin } from "react-icons/fi"
import { RiTestTubeLine } from "react-icons/ri"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getLabOrderById, getLabReportLink, buildReportDownloadName } from "../../services/labApi"
import { getEmployeeAuthSession } from "../../services/authApi"
import "./labtest.css"

type LabBooking = {
  id: string
  bookingId: string
  status: string
  testName: string
  collectionType: string
  scheduledAt: string
  reportKey?: string | null
}

const NORMAL_STEPS = [
  { id: "pending", label: "Pending registration" },
  { id: "phlebo", label: "Phlebo assigned" },
  { id: "sample", label: "Sample collected" },
  { id: "lab", label: "Received in lab" },
  { id: "reported", label: "Report ready" },
]

const CANCELLATION_STEPS = [
  { id: "cancellation_requested", label: "Cancellation Requested" },
  { id: "cancellation_accepted", label: "Cancellation Accepted" },
  { id: "processing_refund", label: "Processing Refund" },
  { id: "refunded", label: "Refunded" },
]

const CANCELLATION_REJECTED_STEPS = [
  { id: "cancellation_requested", label: "Cancellation Requested" },
  { id: "cancellation_rejected", label: "Cancellation Rejected" },
]

function normalizeStatus(status: string) {
  return status.toLowerCase().replace(/[\s-]+/g, "_")
}

function isCancellationStatus(status: string) {
  const normalized = normalizeStatus(status)
  return normalized.includes("cancel") || normalized.includes("refund")
}

function activeStepId(status: string) {
  const normalized = normalizeStatus(status)
  if (normalized.includes("refund") && (normalized.includes("done") || normalized.includes("success") || normalized === "refunded")) return "refunded"
  if (normalized.includes("processing_refund") || normalized.includes("refund_processing") || normalized.includes("refund_pending")) return "processing_refund"
  if (normalized.includes("accepted") || normalized === "cancelled") return "cancellation_accepted"
  if (normalized.includes("rejected")) return "cancellation_rejected"
  if (normalized.includes("cancel")) return "cancellation_requested"
  if (normalized.includes("report") || normalized.includes("complete")) return "reported"
  if (normalized.includes("received_in_lab") || normalized.includes("in_lab") || normalized.includes("processing")) return "lab"
  if (normalized.includes("sample_collected") || normalized.includes("sample_collection") || normalized.includes("sample")) return "sample"
  if (normalized.includes("phlebo") || normalized.includes("assigned") || normalized.includes("collection_team")) return "phlebo"
  return "pending"
}

function stepsForStatus(status: string) {
  const normalized = normalizeStatus(status)
  if (normalized.includes("rejected")) return CANCELLATION_REJECTED_STEPS
  if (isCancellationStatus(status)) return CANCELLATION_STEPS
  return NORMAL_STEPS
}

export default function LabTracking() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [liveBooking, setLiveBooking] = useState<LabBooking | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState("")

  const resolvedBooking = liveBooking
  const status = resolvedBooking?.status ?? "pending_registration"
  const stepId = activeStepId(status)
  const steps = stepsForStatus(status)
  const activeIndex = Math.max(0, steps.findIndex((item) => item.id === stepId))

  useEffect(() => {
    if (!id) return
    let active = true
    const orderId = id

    async function loadOrder() {
      try {
        const order = await getLabOrderById(orderId)
        if (!active || !order) return
        setLiveBooking({
          id: order.id,
          bookingId: order.providerOrderReference ?? order.id,
          status: order.status,
          testName: order.testName,
          collectionType: "Home Collection",
          scheduledAt: order.slotAt ?? order.createdAt,
          reportKey: order.reportKey,
        })
      } catch {
        // The page will retry the live backend lookup.
      }
    }

    void loadOrder()
    const interval = window.setInterval(loadOrder, 7000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [id])


  async function downloadReport() {
    if (!id) return
    setReportLoading(true)
    setReportError("")
    try {
      const auth = getEmployeeAuthSession()
      const employeeId = auth?.userId || ""
      if (!employeeId) throw new Error("Please login again to download the report.")
      const url = await getLabReportLink(id, employeeId)
      if (!url) throw new Error("Report is not uploaded yet.")
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.target = "_blank"
      anchor.rel = "noopener noreferrer"
      anchor.download = buildReportDownloadName(resolvedBooking?.testName ?? "lab-report", resolvedBooking?.scheduledAt ?? new Date().toISOString())
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Report is not available yet.")
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <main className="lab-page tracking-page tracking-page--no-map app-page-enter">
      <header className="lab-header app-fade-stagger">
        <button className="lab-back" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>Lab Test Tracking</h1>
          <p>Track sample progress in real time</p>
        </div>
      </header>

      <section className="lab-test-card static-card tracking-card app-fade-stagger">
        <div className="lab-icon red"><RiTestTubeLine /></div>
        <div className="lab-info">
          <h3>{resolvedBooking?.testName ?? "Lab Test"}</h3>
          <div className="lab-meta-row">
            <span><FiMapPin /> {resolvedBooking?.collectionType ?? "Home Collection"}</span>
            <span><FiClock /> {resolvedBooking?.scheduledAt ? new Date(resolvedBooking.scheduledAt).toLocaleString() : "Pending"}</span>
          </div>
          <div className="lab-meta-row muted">
            <span><FiCheckCircle /> Booking ID {resolvedBooking?.bookingId ?? "Pending"}</span>
            <span>{isCancellationStatus(status) ? "Cancellation/refund workflow" : "Collection team coordinating"}</span>
          </div>
        </div>
      </section>

      <section className="lab-status-list app-fade-stagger">
        {steps.map((step, index) => {
          const isActive = index === activeIndex
          const isDone = index < activeIndex
          return (
            <article key={step.id} className={`lab-status-item ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}>
              <span className="lab-status-dot" aria-hidden="true" />
              <div>
                <h4>{step.label}</h4>
                <p>{isActive ? "In progress" : isDone ? "Completed" : "Awaiting update"}</p>
              </div>
            </article>
          )
        })}
      </section>

      {stepId === "reported" && (
        <div className="lab-actions app-fade-stagger">
          <button className="lab-primary-btn" type="button" onClick={() => void downloadReport()} disabled={reportLoading}>
            {reportLoading ? "Opening Report..." : resolvedBooking?.reportKey ? "Download Report" : "Report Upload Pending"}
          </button>
          {reportError ? <p className="location-error">{reportError}</p> : null}
        </div>
      )}
    </main>
  )
}
