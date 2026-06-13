import { useEffect, useMemo } from "react"
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiClock, FiUser } from "react-icons/fi"
import { useLocation, useNavigate } from "react-router-dom"
import { goBackOrFallback } from "../../utils/navigation"
import successSound from "../../assets/audio/success.mp3"
import "./tele-confirm.css"

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
  mode?: "tele" | "opd"
}

const TELE_BOOKINGS_KEY = "teleconsult_bookings"

function loadLatestBooking() {
  const raw = localStorage.getItem(TELE_BOOKINGS_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as TeleBooking[]
    return parsed[0] ?? null
  } catch {
    return null
  }
}

export default function TeleConfirm() {
  const navigate = useNavigate()
  const { state } = useLocation() as {
    state?: {
      booking?: TeleBooking
      nextPickup?: boolean
      doctor?: { id: string; name: string; specialty: string }
      analysisQuery?: string
      selectedSymptoms?: string[]
    }
  }
  const booking = state?.booking ?? loadLatestBooking()

  useEffect(() => {
    if (!booking) return
    const audio = new Audio(successSound)
    audio.volume = 0.6
    audio.play().catch(() => undefined)
  }, [booking])

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

  const joinReady = useMemo(() => {
    if (!booking?.joinWindowStart) return true
    return Date.now() >= Date.parse(booking.joinWindowStart)
  }, [booking?.joinWindowStart])

  if (!booking) {
    return (
      <main className="tele-confirm-page app-page-enter">
        <header className="tele-confirm-header">
          <button className="tele-confirm-back" onClick={() => goBackOrFallback(navigate)} type="button" aria-label="Back">
            <FiArrowLeft />
          </button>
          <div>
            <h1>Teleconsultation</h1>
          </div>
        </header>
        <section className="tele-confirm-card">
          <h2>No booking found</h2>
          <p>We could not locate your booking details. Please start a new consultation.</p>
          <button className="tele-confirm-primary" type="button" onClick={() => navigate("/teleconsultation")}>
            Go to Consultations
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="tele-confirm-page app-page-enter">
      <header className="tele-confirm-header">
        <button className="tele-confirm-back" onClick={() => goBackOrFallback(navigate)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>Teleconsultation</h1>
        </div>
      </header>

      <section className="tele-confirm-card">
        <div className="tele-confirm-icon">
          <FiCheckCircle />
        </div>
        <h2>Booking Confirmed</h2>
        <p>{booking.mode === "opd" ? "Your OPD visit is locked in. Continue to pickup and clinic directions next." : "Your consultation slot is locked in. Join will open 1 minute before time."}</p>

        <div className="tele-confirm-details">
          <div>
            <FiUser />
            <div>
              <span>Doctor</span>
              <strong>{booking.doctorName}</strong>
              <small>{booking.specialty}</small>
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
              </div>
            </div>
          )}
        </div>

        <div className="tele-confirm-actions">
          <button className="tele-confirm-secondary" type="button" onClick={() => navigate("/bookings")}>
            View Bookings
          </button>
          <button
            className="tele-confirm-primary"
            type="button"
            disabled={booking.mode !== "opd" && !booking.sessionId}
            onClick={() => {
              if (booking.mode === "opd" || state?.nextPickup) {
                navigate("/teleconsultation/pickup", {
                  state: {
                    doctor: state?.doctor ?? { id: booking.doctorId, name: booking.doctorName, specialty: booking.specialty },
                    analysisQuery: state?.analysisQuery,
                    selectedSymptoms: state?.selectedSymptoms,
                  },
                })
                return
              }
              navigate("/teleconsultation", {
                state: {
                  startVideo: true,
                  selectedDoctorId: booking.doctorId,
                  teleconsultSessionId: booking.sessionId,
                  scheduledAt: booking.scheduledAt,
                },
              })
            }}
          >
            {booking.mode === "opd" ? "Continue to Pickup" : joinReady ? "Join Call" : "Join When Ready"}
          </button>
        </div>
      </section>
    </main>
  )
}
