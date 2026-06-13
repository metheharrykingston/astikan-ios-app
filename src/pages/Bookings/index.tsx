import { useEffect, useMemo, useState } from "react"
import { FiArrowLeft, FiShoppingBag } from "react-icons/fi"
import { useNavigate, useSearchParams } from "react-router-dom"
import "../Settings/settings.css"
import { ensureEmployeeActor } from "../../services/actorsApi"
import { getLabOrders, requestLabOrderCancellation, type LabOrder } from "../../services/labApi"
import { listEmployeeAppointments, type EmployeeAppointment } from "../../services/appointmentsApi"
import { getEmployeeAuthSession, getEmployeeCompanySession } from "../../services/authApi"
import { createEmployeeSupportTicket } from "../../services/supportApi"
import { cancelPharmacyOrder, fetchPharmacyOrder, type PharmacyOrderDetail } from "../../services/pharmacyApi"

type TeleBooking = {
  id: string
  sessionId: string
  doctorId: string
  doctorName: string
  specialty: string
  status?: string
  scheduledAt: string
  joinWindowStart: string
}

type StoredPharmacyOrder = {
  id: string
  orderId: string
  createdAt: string
  totalInr?: number
  expectedDelivery?: string
}

type BookingFilter = "all" | "medicine" | "lab" | "teleconsultation" | "opd"

type BookingItem = {
  id: string
  title: string
  at: string
  status?: string
  scheduledAt?: string
  joinWindowStart?: string
  sessionId?: string | null
  doctorId?: string
  type: "pharmacy" | "lab" | "teleconsult" | "opd"
  bookingId?: string
  orderId?: string
  amountLabel?: string
  description?: string
}

const TELE_BOOKINGS_KEY = "teleconsult_bookings"
const PHARMACY_ORDERS_KEY = "pharmacy_orders"

const filterCopy: Record<BookingFilter, { title: string; subtitle: string; empty: string }> = {
  all: {
    title: "Orders & Bookings",
    subtitle: "Your latest medicine, lab, teleconsultation and OPD activity.",
    empty: "No orders or bookings yet.",
  },
  medicine: {
    title: "Medicine Orders",
    subtitle: "Only your medicine orders are shown here.",
    empty: "No medicine orders yet.",
  },
  lab: {
    title: "Lab Tests",
    subtitle: "Only your lab test bookings are shown here.",
    empty: "No lab test bookings yet.",
  },
  teleconsultation: {
    title: "Teleconsultation Bookings",
    subtitle: "Only your online doctor consultations are shown here.",
    empty: "No teleconsultation bookings yet.",
  },
  opd: {
    title: "OPD Bookings",
    subtitle: "Only your OPD clinic visits are shown here.",
    empty: "No OPD bookings yet.",
  },
}

function normalizeBookingFilter(value: string | null): BookingFilter {
  const normalized = String(value || "all").trim().toLowerCase()
  if (normalized === "medicine" || normalized === "pharmacy" || normalized === "orders") return "medicine"
  if (normalized === "lab" || normalized === "labs" || normalized === "lab-tests") return "lab"
  if (normalized === "teleconsult" || normalized === "teleconsultation" || normalized === "tele") return "teleconsultation"
  if (normalized === "opd" || normalized === "hospital" || normalized === "clinic") return "opd"
  return "all"
}

function readStoredList<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "Time not available"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Time not available"
  return date.toLocaleString()
}

function toInr(value?: number | null) {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric) || numeric <= 0) return ""
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(numeric))}`
}

function formatStatus(value?: string) {
  if (!value) return ""
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusClassName(value?: string) {
  if (!value) return ""
  return `status-${String(value).toLowerCase().replace(/\s+/g, "-")}`
}

export default function Bookings() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const activeFilter = normalizeBookingFilter(searchParams.get("type"))
  const copy = filterCopy[activeFilter]
  const [actionNote, setActionNote] = useState("")
  const [labOrders, setLabOrders] = useState<LabOrder[]>([])
  const [labLoading, setLabLoading] = useState(false)
  const [appointments, setAppointments] = useState<EmployeeAppointment[]>([])
  const [pharmacyDetails, setPharmacyDetails] = useState<PharmacyOrderDetail[]>([])
  const [requestItem, setRequestItem] = useState<BookingItem | null>(null)
  const [requestReason, setRequestReason] = useState("")
  const [requestFiles, setRequestFiles] = useState<Array<{ name: string; size: number; type: string }>>([])
  const [requestNote, setRequestNote] = useState("")

  const teleBookings = useMemo(() => readStoredList<TeleBooking>(TELE_BOOKINGS_KEY), [])
  const pharmacyOrders = useMemo(() => readStoredList<StoredPharmacyOrder>(PHARMACY_ORDERS_KEY), [])

  useEffect(() => {
    let active = true
    setLabLoading(true)
    void (async () => {
      try {
        const actor = await ensureEmployeeActor({ companyReference: "astikan-demo-company", companyName: "Astikan" })
        const orders = await getLabOrders(actor.employeeUserId)
        if (!active) return
        setLabOrders(orders)
      } catch {
        if (active) setLabOrders([])
      } finally {
        if (active) setLabLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const auth = getEmployeeAuthSession()
    const company = getEmployeeCompanySession()
    if (!auth?.userId) return
    let active = true
    void (async () => {
      try {
        const rows = await listEmployeeAppointments({
          employeeId: auth.userId,
          companyId: auth.companyId ?? company?.companyId ?? null,
          limit: 50,
        })
        if (active) setAppointments(rows)
      } catch {
        if (active) setAppointments([])
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const ids = pharmacyOrders.map((order) => String(order.id || order.orderId || "").trim()).filter(Boolean)
    if (!ids.length) {
      setPharmacyDetails([])
      return
    }
    void (async () => {
      const settled = await Promise.allSettled(ids.map((id) => fetchPharmacyOrder(id)))
      if (!active) return
      setPharmacyDetails(
        settled
          .filter((result): result is PromiseFulfilledResult<PharmacyOrderDetail> => result.status === "fulfilled")
          .map((result) => result.value),
      )
    })()
    return () => {
      active = false
    }
  }, [pharmacyOrders])

  const appointmentItems = appointments.map<BookingItem>((item) => {
    const doctorName = item.doctor_name?.trim() || "doctor"
    const isOpd = item.appointment_type === "opd"
    return {
      id: item.id,
      title: isOpd ? `OPD visit with ${doctorName}` : `Teleconsultation with ${doctorName}`,
      description: item.opd_visits?.clinic_location || undefined,
      at: formatDateTime(item.scheduled_start),
      status: item.status ?? "scheduled",
      scheduledAt: item.scheduled_start,
      joinWindowStart: item.teleconsult_sessions?.[0]?.scheduled_at ?? item.scheduled_start,
      sessionId: item.teleconsult_sessions?.[0]?.id ?? null,
      type: isOpd ? "opd" : "teleconsult",
    }
  })

  const teleLocal = teleBookings.map<BookingItem>((booking) => ({
    id: booking.id,
    title: `Teleconsultation with ${booking.doctorName}`,
    description: booking.specialty,
    at: formatDateTime(booking.scheduledAt),
    status: booking.status ?? "confirmed",
    scheduledAt: booking.scheduledAt,
    joinWindowStart: booking.joinWindowStart,
    sessionId: booking.sessionId,
    doctorId: booking.doctorId,
    type: "teleconsult",
  }))

  const mergedLabOrders = labOrders.map<BookingItem>((item) => ({
        id: item.id,
        title: `Lab Test • ${item.testName}`,
        at: formatDateTime(item.slotAt ?? item.createdAt),
        status: item.status,
        bookingId: item.providerOrderReference ?? item.id,
        type: "lab",
      }))

  const liveOrderById = useMemo(() => {
    const map = new Map<string, PharmacyOrderDetail>()
    pharmacyDetails.forEach((order) => {
      if (order.id) map.set(String(order.id), order)
      if (order.order_id) map.set(String(order.order_id), order)
    })
    return map
  }, [pharmacyDetails])

  const pharmacyItems = pharmacyOrders.map<BookingItem>((order) => {
    const live = liveOrderById.get(String(order.id)) || liveOrderById.get(String(order.orderId))
    const medicineNames = live?.items?.map((item) => item.name).filter(Boolean).slice(0, 2).join(", ")
    const amountLabel = toInr(live?.payable_inr ?? order.totalInr)
    return {
      id: order.id || order.orderId,
      orderId: live?.order_id || order.orderId,
      title: medicineNames ? `Medicine Order • ${medicineNames}` : `Medicine Order • #${order.orderId || order.id}`,
      description: amountLabel ? `Total ${amountLabel}` : "Astikan Pharmacy",
      at: formatDateTime(live?.created_at ?? order.createdAt),
      status: live?.status || "placed",
      type: "pharmacy",
      amountLabel,
    }
  })

  const allItems = [...pharmacyItems, ...mergedLabOrders, ...appointmentItems, ...teleLocal]
  const items = allItems.filter((item) => {
    if (activeFilter === "all") return true
    if (activeFilter === "medicine") return item.type === "pharmacy"
    if (activeFilter === "lab") return item.type === "lab"
    if (activeFilter === "teleconsultation") return item.type === "teleconsult"
    if (activeFilter === "opd") return item.type === "opd"
    return true
  })

  async function submitServiceRequest() {
    if (!requestItem || !requestReason.trim()) {
      setRequestNote("Please write the reason first.")
      return
    }
    const auth = getEmployeeAuthSession()
    const company = getEmployeeCompanySession()
    const subject = `Cancel request • ${requestItem.title || requestItem.id}`
    const message = [
      `Request type: Cancel`,
      `Service: ${requestItem.type || "service"}`,
      `Booking/Order ID: ${requestItem.bookingId || requestItem.orderId || requestItem.id || "--"}`,
      `Reason: ${requestReason}`,
    ].join("\n")
    const result = await createEmployeeSupportTicket({
      companyId: auth?.companyId || company?.companyId,
      employeeId: auth?.userId,
      corporateName: auth?.companyName || company?.companyName,
      reporterName: auth?.fullName || "Employee",
      reporterEmail: auth?.email || "",
      subject,
      category: "Service Issue",
      assignedTeam: "Care Operations",
      priority: "Normal",
      attachments: requestFiles,
      message,
    })
    setRequestNote(`Request sent to Care Operations. Ticket ID: ${result.id}`)
    setRequestReason("")
    setRequestFiles([])
  }

  return (
    <main className="account-page booking-page app-page-enter">
      <header className="account-header app-fade-stagger">
        <button className="account-back app-pressable" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <h1>{copy.title}</h1>
      </header>
      <section className="account-shell app-content-slide">
        <article className="account-card booking-filter-card app-fade-stagger">
          <h3>{copy.title}</h3>
          <p>{copy.subtitle}</p>
        </article>

        {actionNote ? <p className="service-request-note app-fade-stagger">{actionNote}</p> : null}
        <div className="notice-list app-fade-stagger">
          {items.length === 0 ? (
            <article className="notice-item booking-empty-card">
              {activeFilter === "medicine" ? <FiShoppingBag className="booking-empty-icon" /> : null}
              <h4>{labLoading && activeFilter === "lab" ? "Loading lab bookings..." : copy.empty}</h4>
              <p>{activeFilter === "medicine" ? "Place a medicine order from the Medicine page and it will appear here with live status." : "New activity will appear here after booking."}</p>
              {activeFilter === "medicine" ? (
                <button className="booking-empty-action app-pressable" type="button" onClick={() => navigate("/pharmacy")}>
                  Order Medicines
                </button>
              ) : null}
            </article>
          ) : null}
          {items.map((item) => {
            const canJoin = Boolean(item.sessionId)
            const statusLabel = formatStatus(item.status)
            const statusClass = statusClassName(item.status)
            return (
              <article className="notice-item booking-item" key={`${item.type}-${item.id || item.title}`}>
                <div className="booking-head">
                  <h4>{item.title}</h4>
                  {item.status ? <span className={`booking-status ${statusClass}`}>{statusLabel}</span> : null}
                </div>
                {item.description ? <p className="booking-description">{item.description}</p> : null}
                <div className="booking-meta">
                  <span>{item.at}</span>
                  {item.orderId ? <span>#{item.orderId}</span> : null}
                  {item.bookingId ? <span>#{item.bookingId}</span> : null}
                  {item.type === "lab" && <span className="booking-tag">Lab</span>}
                  {item.type === "opd" && <span className="booking-tag">OPD</span>}
                  {item.type === "teleconsult" && <span className="booking-tag">Teleconsult</span>}
                  {item.type === "pharmacy" && <span className="booking-tag">Medicine</span>}
                </div>
                <div className="booking-actions service-request-actions booking-actions--compact">
                  <button
                    className="app-pressable booking-btn secondary"
                    type="button"
                    onClick={async () => {
                      if (item.type === "lab") {
                        await requestLabOrderCancellation(item.bookingId || item.id, "Cancelled by user")
                        setActionNote("Lab booking cancellation requested.")
                        return
                      }
                      if (item.type === "pharmacy") {
                        await cancelPharmacyOrder(item.id)
                        setActionNote("Medicine order cancellation requested.")
                        return
                      }
                      setRequestItem(item)
                      setRequestNote("")
                    }}
                  >
                    {item.type === "pharmacy" ? "Cancel Order" : item.type === "lab" ? "Cancel Booking" : "Cancel Request"}
                  </button>
                  {item.type === "lab" ? (
                    <button className="app-pressable booking-btn primary" type="button" onClick={() => navigate(`/lab-tests/track/${item.id}`)}>
                      Track Status
                    </button>
                  ) : null}
                  {item.type === "pharmacy" ? (
                    <button className="app-pressable booking-btn primary" type="button" onClick={() => navigate(`/pharmacy/tracking?orderId=${encodeURIComponent(item.id)}`)}>
                      Track Status
                    </button>
                  ) : null}
                  {item.type === "opd" ? (
                    <button className="app-pressable booking-btn primary" type="button" onClick={() => setRequestItem(item)}>
                      Need Help
                    </button>
                  ) : null}
                  {item.type === "teleconsult" && !canJoin ? (
                    <button className="app-pressable booking-btn primary" type="button" onClick={() => navigate(`/teleconsultation/overview/${item.id}`)}>
                      View Details
                    </button>
                  ) : null}
                </div>
                {canJoin && item.sessionId ? (
                  <div className="booking-actions">
                    <button className="app-pressable booking-btn secondary" type="button" onClick={() => navigate(`/teleconsultation/overview/${item.id}`)}>
                      View Details
                    </button>
                    <button
                      className="app-pressable booking-btn primary"
                      type="button"
                      onClick={() =>
                        navigate("/teleconsultation", {
                          state: {
                            startVideo: true,
                            selectedDoctorId: item.doctorId,
                            teleconsultSessionId: item.sessionId,
                            scheduledAt: item.scheduledAt,
                          },
                        })
                      }
                    >
                      Join Call
                    </button>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>

      {requestItem ? (
        <div className="service-request-overlay">
          <section className="service-request-card app-page-enter">
            <h3>Cancel request</h3>
            <p>{requestItem.title}</p>
            <textarea rows={5} value={requestReason} onChange={(e) => setRequestReason(e.target.value)} placeholder="Tell us why you want to cancel this booking/order." />
            <label className="service-request-upload">
              Attach pictures
              <input type="file" accept="image/*" multiple onChange={(e) => setRequestFiles(Array.from(e.target.files || []).map((file) => ({ name: file.name, size: file.size, type: file.type })))} />
            </label>
            {requestFiles.length ? <small>{requestFiles.length} photo(s) selected</small> : null}
            {requestNote ? <p className="service-request-note">{requestNote}</p> : null}
            <div className="service-request-footer">
              <button className="booking-btn secondary" type="button" onClick={() => setRequestItem(null)}>Close</button>
              <button className="booking-btn primary" type="button" onClick={() => void submitServiceRequest()}>Submit Cancel Request</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}
