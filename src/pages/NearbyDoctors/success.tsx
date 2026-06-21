import { useLocation, useNavigate } from "react-router-dom"
import { FiBell, FiCheckCircle, FiClock, FiCreditCard, FiHome, FiMapPin, FiUserCheck } from "react-icons/fi"
import type { NearbyDoctorBookingResult, NearbyDoctorPlace } from "../../services/doctorsApi"
import "./nearby-doctors.css"

type SuccessState = {
  result?: NearbyDoctorBookingResult
  doctor?: NearbyDoctorPlace
  consultationType?: "clinic" | "video"
  selectedDate?: string
  timeSlot?: string
}

export default function NearbyDoctorSuccess() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as SuccessState | undefined
  const result = state?.result
  const doctor = state?.doctor

  return (
    <main className="nearby-page nearby-success-page app-page-enter">
      <section className="nearby-success-card">
        <div className="nearby-success-icon"><FiCheckCircle /></div>
        <h1>Your request has been sent!</h1>
        <p>Astikan is now checking doctor availability and consultation price.</p>
      </section>

      <section className="nearby-summary-card">
        <div><span>Request ID</span><strong>{result?.requestId ?? "Created"}</strong></div>
        <div><span>Doctor</span><strong>{doctor?.name ?? "Selected doctor"}</strong></div>
        <div><span>Consultation Type</span><strong>{state?.consultationType === "video" ? "Video Consultation" : "Clinic Visit"}</strong></div>
        <div><span>Preferred Date & Time</span><strong>{state?.selectedDate ?? "Flexible"} · {state?.timeSlot ?? "Any time"}</strong></div>
        {doctor?.address ? <p><FiMapPin /> {doctor.address}</p> : null}
      </section>

      <section className="nearby-progress-card">
        <h2>What happens next?</h2>
        <div className="nearby-progress-item active"><FiUserCheck /><div><strong>Checking Availability</strong><p>We are checking with the doctor/clinic.</p></div><span>In Progress</span></div>
        <div className="nearby-progress-item"><FiClock /><div><strong>Price & Slot Confirmation</strong><p>You will get the price and available slot.</p></div></div>
        <div className="nearby-progress-item"><FiCreditCard /><div><strong>Payment</strong><p>Pay securely if required to confirm your booking.</p></div></div>
        <div className="nearby-progress-item"><FiCheckCircle /><div><strong>Appointment Confirmed</strong><p>You will receive confirmation and details.</p></div></div>
      </section>

      <div className="nearby-note"><FiBell /> You will get updates in notifications and in your bookings.</div>
      <footer className="nearby-sticky-actions">
        <button className="nearby-secondary-btn" type="button" onClick={() => navigate("/bookings")}>View My Requests</button>
        <button className="nearby-primary-btn" type="button" onClick={() => navigate("/home")}><FiHome /> Back to Home</button>
      </footer>
    </main>
  )
}
