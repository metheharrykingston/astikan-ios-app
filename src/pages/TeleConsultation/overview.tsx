import { useEffect, useMemo, useState } from "react"
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiClock, FiUser } from "react-icons/fi"
import { useNavigate, useParams } from "react-router-dom"
import { goBackOrFallback } from "../../utils/navigation"
import "./tele-overview.css"

type TeleBooking = {
  id: string
  sessionId: string
  doctorId: string
  doctorName: string
  specialty: string
  doctorAvatar?: string
  status?: string
  scheduledAt: string
  joinWindowStart: string
  durationMinutes?: number
}

const TELE_BOOKINGS_KEY = "teleconsult_bookings"

function loadBooking(id?: string) {
  const raw = localStorage.getItem(TELE_BOOKINGS_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as TeleBooking[]
    if (!id) return parsed[0] ?? null
    return parsed.find((item) => item.id === id) ?? null
  } catch {
    return null
  }
}

export default function TeleOverview() {
  const navigate = useNavigate()
  const { id } = useParams()
  const booking = loadBooking(id)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const scheduledLabel = useMemo(() => {
    if (!booking?.scheduledAt) return "Not scheduled yet"
    return new Date(booking.scheduledAt).toLocaleString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }, [booking?.scheduledAt])

  const joinWindowLabel = useMemo(() => {
    if (!booking?.joinWindowStart) return null
    return new Date(booking.joinWindowStart).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
  }, [booking?.joinWindowStart])

  const joinWindowMs = useMemo(() => {
    if (!booking?.joinWindowStart) return null
    const ts = Date.parse(booking.joinWindowStart)
    return Number.isNaN(ts) ? null : ts
  }, [booking?.joinWindowStart])

  const scheduledMs = useMemo(() => {
    if (!booking?.scheduledAt) return null
    const ts = Date.parse(booking.scheduledAt)
    return Number.isNaN(ts) ? null : ts
  }, [booking?.scheduledAt])

  const joinReady = joinWindowMs !== null ? now >= joinWindowMs : true
  const joinCountdown = useMemo(() => {
    if (joinReady || joinWindowMs === null) return null
    const diff = Math.max(0, joinWindowMs - now)
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }, [joinReady, joinWindowMs, now])

  const sessionEndLabel = useMemo(() => {
    if (!scheduledMs) return null
    const end = new Date(scheduledMs + (Math.max(5, Number(booking?.durationMinutes ?? 30)) * 60 * 1000))
    return end.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
  }, [booking?.durationMinutes, scheduledMs])

  if (!booking) {
    return (
      <main className="tele-overview-page app-page-enter">
        <header className="tele-overview-header">
          <button className="tele-overview-back" onClick={() => goBackOrFallback(navigate)} type="button" aria-label="Back">
            <FiArrowLeft />
          </button>
          <div>
            <h1>Teleconsultation</h1>
            <p>Overview</p>
          </div>
        </header>
        <section className="tele-overview-card">
          <h2>No booking found</h2>
          <p>This booking is no longer available.</p>
          <button className="tele-overview-primary" type="button" onClick={() => navigate("/bookings")}>
            Back to Bookings
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="tele-overview-page app-page-enter">
      <header className="tele-overview-header">
        <button className="tele-overview-back" onClick={() => goBackOrFallback(navigate)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>Teleconsultation</h1>
          <p>Overview</p>
        </div>
      </header>

      <section className="tele-overview-card">
        <div className="tele-overview-doc">
          <img src={booking.doctorAvatar || "https://ui-avatars.com/api/?name=Doctor"} alt={booking.doctorName} />
          <div>
            <h2>{booking.doctorName}</h2>
            <span>{booking.specialty}</span>
          </div>
        </div>

        <div className="tele-overview-details">
          <div>
            <FiUser />
            <div>
              <span>Booking ID</span>
              <strong>{booking.id}</strong>
            </div>
          </div>
          {booking.status && (
            <div>
              <FiCheckCircle />
              <div>
                <span>Status</span>
                <strong>{booking.status}</strong>
              </div>
            </div>
          )}
          <div>
            <FiCalendar />
            <div>
              <span>Scheduled</span>
              <strong>{scheduledLabel}</strong>
            </div>
          </div>
          {joinWindowLabel && (
            <div>
              <FiClock />
              <div>
                <span>Join opens</span>
                <strong>{joinWindowLabel}</strong>
                {joinCountdown && <small>Opens in {joinCountdown}</small>}
              </div>
            </div>
          )}
          {sessionEndLabel && (
            <div>
              <FiClock />
              <div>
                <span>Session ends</span>
                <strong>{sessionEndLabel}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="tele-overview-actions">
          <button className="tele-overview-secondary" type="button" onClick={() => navigate("/bookings")}>
            Back to Bookings
          </button>
          <button
            className="tele-overview-primary"
            type="button"
            disabled={!joinReady}
            onClick={() =>
              navigate("/teleconsultation", {
                state: {
                  startVideo: true,
                  selectedDoctorId: booking.doctorId,
                  teleconsultSessionId: booking.sessionId,
                  scheduledAt: booking.scheduledAt,
                  bookingId: booking.id,
                  autoJoin: true,
                },
              })
            }
          >
            {joinReady ? "Join Call" : "Join opens soon"}
          </button>
        </div>
      </section>
    </main>
  )
}
