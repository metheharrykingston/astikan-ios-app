import { useState } from 'react'
import { FiAlertCircle, FiArrowLeft, FiCalendar, FiCheckCircle, FiClock, FiEdit2, FiFileText, FiInfo, FiMapPin, FiShield, FiUser } from 'react-icons/fi'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { createHospitalBooking, type HospitalSlotBookingInput } from '../../services/consumerApi'
import { getHospital } from './data'
import './hospital-booking.css'

export default function HospitalConfirm() {
  const navigate = useNavigate()
  const { hospitalId } = useParams()
  const { state } = useLocation() as { state?: HospitalSlotBookingInput }
  const hospital = getHospital(hospitalId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const booking = state
  async function confirmBooking() {
    if (!booking || isSubmitting) return
    setError('')
    setIsSubmitting(true)
    try {
      const result = await createHospitalBooking(booking)
      navigate('/hospitals/booking-success', { state: result })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm booking. Please try again.')
      setIsSubmitting(false)
    }
  }
  if (!booking) {
    return (
      <main className="consumer-screen app-page-enter">
          <header className="consumer-topbar"><button className="consumer-back" type="button" onClick={() => navigate('/hospitals')} aria-label="Back"><FiArrowLeft /></button><div><h1 className="consumer-title">Booking not ready</h1><p className="consumer-subtitle">Please select a hospital slot first.</p></div><span /></header>
        <section className="confirm-card"><p className="finance-error"><FiAlertCircle /> Missing booking details.</p><button className="primary-cta" type="button" onClick={() => navigate('/hospitals')}>Select Slot</button></section>
      </main>
    )
  }
  return (
    <main className="consumer-screen app-page-enter">
      <header className="consumer-topbar"><button className="consumer-back" type="button" onClick={() => navigate(-1)} aria-label="Back"><FiArrowLeft /></button><div><h1 className="consumer-title">Confirm Your Booking</h1><p className="consumer-subtitle">Please confirm your details before booking</p></div><span /></header>
      <section className="confirm-card confirm-hospital-card"><img src={hospital.image} alt={hospital.name} /><div><h2>{booking.hospitalName}</h2><p className="detail-meta"><FiMapPin /> {booking.location}</p><div className="summary-grid"><div><FiCalendar /><strong>{booking.date}</strong><span>{booking.day}</span></div><div><FiClock /><strong>{booking.time}</strong><span>Time</span></div><div><FiCalendar /><strong>{booking.slotType}</strong><span>Slot Type</span></div></div></div></section>
      <section className="confirm-card"><div className="confirm-section-head"><h2><span className="form-title-icon"><FiUser /></span>Patient Details</h2><button className="edit-link" type="button" onClick={() => navigate(-1)}><FiEdit2 /> Edit</button></div><div className="detail-row"><span>Full Name</span><strong>{booking.patient.fullName}</strong></div><div className="detail-row"><span>Mobile Number</span><strong>{booking.patient.mobileNumber}</strong></div><div className="detail-row"><span>Age</span><strong>{booking.patient.age} Years</strong></div><div className="detail-row"><span>Gender</span><strong>{booking.patient.gender}</strong></div></section>
      <section className="note-card"><FiInfo /><div><h3>Please Note</h3><p><FiCheckCircle /> Please arrive 15 minutes before your scheduled time.</p><p><FiCheckCircle /> Carry a valid ID proof for verification.</p></div></section>
      <section className="confirm-card"><div className="confirm-section-head"><h2><span className="form-title-icon"><FiFileText /></span>Booking Summary</h2></div><div className="detail-row"><span>Hospital</span><strong>{booking.hospitalName}</strong></div><div className="detail-row"><span>Date &amp; Time</span><strong>{booking.date}, {booking.time}</strong></div><div className="detail-row"><span>Slot Type</span><strong>{booking.slotType}</strong></div></section>
      {error && <p className="finance-error finance-submit-error"><FiAlertCircle /> {error}</p>}<button className="primary-cta green" type="button" onClick={confirmBooking} disabled={isSubmitting}><FiShield /> {isSubmitting ? 'Confirming...' : 'Confirm Booking'}</button><p className="secure-footnote"><FiShield /> Your details are protected and used for booking operations.</p>
    </main>
  )
}
