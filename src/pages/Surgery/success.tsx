import { FiCalendar, FiCheckCircle, FiHome, FiMapPin } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import type { SurgeryBooking } from '../../services/consumerApi'
import { formatRupees, getSurgery } from './data'
import { SurgeryHeader } from './Header'
import './surgery.css'

export default function SurgerySuccess() {
  const navigate = useNavigate()
  const location = useLocation()
  const booking = location.state as SurgeryBooking | undefined
  const surgery = getSurgery(booking?.surgeryId)

  if (!booking) {
    return (
      <main className="surgery-page app-page-enter">
        <SurgeryHeader title="No confirmed booking" subtitle="Please request a treatment package again" />
        <section className="surgery-shell app-content-slide">
          <section className="surgery-form-card">
            <p>No surgery booking was found.</p>
            <button className="surgery-primary-btn app-pressable" type="button" onClick={() => navigate('/surgeries')}>Browse Treatments</button>
          </section>
        </section>
      </main>
    )
  }

  return (
    <main className="surgery-page app-page-enter">
      <SurgeryHeader title="Booking Confirmed" subtitle="Treatment consultation request created" />
      <section className="surgery-shell app-content-slide">
        <section className="surgery-form-card app-fade-stagger">
          <div className="surgery-success-icon"><FiCheckCircle /></div>
          <h2 className="surgery-success-title">Request Confirmed</h2>
          <p className="surgery-success-sub">Our care expert will call you back in around 15 minutes.</p>
          <div className="surgery-summary-line"><span>Booking ID</span><strong>{booking.bookingId}</strong></div>
          <div className="surgery-summary-line"><span>Status</span><strong>{booking.status}</strong></div>
        </section>

        <article className="surgery-price-card app-fade-stagger">
          <div className="surgery-starting-box">
            <span>{booking.packageName}</span>
            <strong>{formatRupees(booking.packagePrice || surgery.startingPrice)}</strong>
          </div>
          <div className="surgery-benefit-stack">
            <div className="surgery-benefit">
              <span className="surgery-benefit-icon"><FiHome /></span>
              <div><h3>{booking.surgeryName}</h3><p>{booking.treatmentType}</p></div>
            </div>
            <div className="surgery-benefit">
              <span className="surgery-benefit-icon"><FiMapPin /></span>
              <div><h3>{booking.hospitalName}</h3><p>{booking.location}</p></div>
            </div>
            <div className="surgery-benefit">
              <span className="surgery-benefit-icon"><FiCalendar /></span>
              <div><h3>{booking.time}</h3><p>{booking.slotType}</p></div>
            </div>
          </div>
        </article>

        <button className="surgery-primary-btn app-pressable" type="button" onClick={() => navigate('/home')}>Back to Home</button>
      </section>
    </main>
  )
}
