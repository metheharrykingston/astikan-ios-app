import { useState } from 'react'
import { FiAlertCircle, FiCalendar, FiCheckCircle, FiCreditCard, FiMapPin } from 'react-icons/fi'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { createSurgeryBooking, type SurgeryBookingInput } from '../../services/consumerApi'
import { formatRupees, getSurgery } from './data'
import { SurgeryHeader } from './Header'
import './surgery.css'

export default function SurgeryConfirm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { surgeryId } = useParams()
  const surgery = getSurgery(surgeryId)
  const booking = location.state as SurgeryBookingInput | undefined
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function confirmBooking() {
    if (!booking || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const result = await createSurgeryBooking(booking)
      navigate('/surgeries/booking-success', { state: result })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to confirm surgery booking.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!booking) {
    return (
      <main className="surgery-page app-page-enter">
        <SurgeryHeader title="Booking not ready" subtitle="Please select a treatment package first" />
        <section className="surgery-shell app-content-slide">
          <section className="surgery-form-card">
            <p className="surgery-summary-line"><span><FiAlertCircle /> Missing booking details.</span></p>
            <button className="surgery-primary-btn app-pressable" type="button" onClick={() => navigate('/surgeries')}>Select Package</button>
          </section>
        </section>
      </main>
    )
  }

  return (
    <main className="surgery-page app-page-enter">
      <SurgeryHeader title="Confirm Booking" subtitle={booking.surgeryName} />
      <section className="surgery-shell with-bottom-cta app-content-slide">
        <article className="surgery-price-card app-fade-stagger">
          <div className="surgery-starting-box">
            <span>Package Amount</span>
            <strong>{formatRupees(booking.packagePrice || surgery.startingPrice)}</strong>
          </div>
          <div className="surgery-benefit-stack">
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

        <section className="surgery-form-card app-fade-stagger">
          <h2>Patient</h2>
          <div className="surgery-summary-line"><span>Name</span><strong>{booking.patient.fullName || '--'}</strong></div>
          <div className="surgery-summary-line"><span>Mobile</span><strong>{booking.patient.mobileNumber || '--'}</strong></div>
          <div className="surgery-summary-line"><span>Age / Gender</span><strong>{booking.patient.age || '--'} / {booking.patient.gender || '--'}</strong></div>
        </section>

        <section className="surgery-form-card app-fade-stagger">
          <h2>Booking Summary</h2>
          <div className="surgery-summary-line"><span>Treatment</span><strong>{booking.surgeryName}</strong></div>
          <div className="surgery-summary-line"><span>Treatment</span><strong>{booking.treatmentType}</strong></div>
          <div className="surgery-summary-line"><span>Package</span><strong>{booking.packageName}</strong></div>
          <div className="surgery-summary-line"><span>Status</span><strong>Free consultation request</strong></div>
        </section>

        {error ? <section className="surgery-form-card"><div className="surgery-summary-line"><span><FiAlertCircle /> {error}</span></div></section> : null}
      </section>

      <footer className="surgery-bottom-cta app-fade-stagger">
        <div className="surgery-help-mini">
          <span className="surgery-help-mini-icon"><FiCreditCard /></span>
          <div><h3>No Payment Now</h3><p>Care team will call</p></div>
        </div>
        <button className="surgery-primary-btn app-pressable" type="button" onClick={() => void confirmBooking()} disabled={submitting}>
          <span>{submitting ? 'Confirming...' : 'Confirm Booking'}</span>
          <small>{submitting ? 'Please wait' : 'Create surgery request'}</small>
          <FiCheckCircle />
        </button>
      </footer>
    </main>
  )
}
