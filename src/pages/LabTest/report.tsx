import { FiArrowLeft, FiDownloadCloud } from "react-icons/fi"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ensureEmployeeActor } from "../../services/actorsApi"
import { buildReportDownloadName, getLabOrderById, getLabReportLink } from "../../services/labApi"
import "./labtest.css"

export default function LabReportViewer() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [reportName, setReportName] = useState("lab-report.pdf")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        if (!id) return
        const actor = await ensureEmployeeActor({ companyReference: "astikan-demo-company", companyName: "Astikan" })
        const order = await getLabOrderById(id)
        const link = await getLabReportLink(id, actor.employeeUserId)
        if (!active) return
        if (link) setReportUrl(link)
        else setError("Report not available yet.")
        if (order) {
          setReportName(buildReportDownloadName(order.testName, order.createdAt))
        } else {
          setReportName(buildReportDownloadName("Lab Report", new Date().toISOString()))
        }
      } catch {
        if (active) setError("Unable to load report right now.")
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  return (
    <main className="lab-page report-page app-page-enter">
      <header className="lab-header app-fade-stagger">
        <button className="lab-back" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>Lab Report</h1>
          <p>View your diagnostic report</p>
        </div>
        {reportUrl && (
          <button
            className="lab-report-download app-pressable"
            type="button"
            onClick={async () => {
              if (!reportUrl) return
              const response = await fetch(reportUrl)
              const blob = await response.blob()
              const url = URL.createObjectURL(blob)
              const link = document.createElement("a")
              link.href = url
              link.download = reportName
              document.body.appendChild(link)
              link.click()
              link.remove()
              URL.revokeObjectURL(url)
            }}
          >
            <FiDownloadCloud />
          </button>
        )}
      </header>

      <section className="lab-report-shell app-content-slide">
        {error && <div className="lab-map-error">{error}</div>}
        {!error && !reportUrl && (
          <div className="lab-loading-wrap" aria-live="polite">
            <span className="lab-loading-spinner" />
            <p>Loading report...</p>
          </div>
        )}
        {reportUrl && (
          <iframe
            title="Lab report"
            src={reportUrl}
            className="lab-report-frame"
            allow="fullscreen"
          />
        )}
      </section>
    </main>
  )
}
