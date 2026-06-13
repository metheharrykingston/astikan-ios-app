import { useState } from "react"
import { FiArrowLeft, FiSend } from "react-icons/fi"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { requestLabOrderCancellation } from "../../services/labApi"
import { goBackOrFallback } from "../../utils/navigation"
import "./labtest.css"

type BookingState = {
  booking?: {
    id?: string
    bookingId?: string
    title?: string
    status?: string
  }
}

export default function LabCancelRequest() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { state } = useLocation() as { state?: BookingState }
  const booking = state?.booking
  const reference = String(id || booking?.id || booking?.bookingId || "")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  async function submit() {
    if (!reference) {
      setMessage("Booking reference is missing. Please open this from Bookings again.")
      return
    }
    if (reason.trim().length < 5) {
      setMessage("Please write a short cancellation reason.")
      return
    }
    setSubmitting(true)
    setMessage("")
    try {
      await requestLabOrderCancellation(reference, reason.trim())
      navigate(`/lab-tests/track/${reference}`, { replace: true })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send cancellation request right now.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="lab-page lab-cancel-page app-page-enter">
      <header className="lab-header app-fade-stagger">
        <button className="lab-back" onClick={() => goBackOrFallback(navigate, "/bookings")} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>Cancel Lab Booking</h1>
          <p>Send a cancellation request to Astikan Care Operations</p>
        </div>
      </header>

      <section className="lab-cancel-card app-content-slide">
        <span className="cancel-pill">Cancellation Request</span>
        <h2>{booking?.title || "Lab Test Booking"}</h2>
        <p className="cancel-ref">Booking ID: {booking?.bookingId || reference}</p>
        <label>
          Reason for cancellation
          <textarea rows={6} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: I am not available today / booked by mistake / want to reschedule later." />
        </label>
        {message ? <div className="confirm-error">{message}</div> : null}
        <button className="lab-primary-btn" type="button" disabled={submitting} onClick={submit}>
          <FiSend /> {submitting ? "Sending request..." : "Submit Cancel Request"}
        </button>
        <button className="btn-secondary" type="button" onClick={() => navigate(`/lab-tests/track/${reference}`)}>
          Track Status
        </button>
      </section>
    </main>
  )
}
