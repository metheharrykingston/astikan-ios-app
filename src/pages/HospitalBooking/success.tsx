import { FiArrowLeft, FiCalendar, FiCheck, FiChevronRight, FiCopy, FiDownload, FiFileText, FiHeadphones, FiMapPin, FiNavigation, FiUser } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import { getLatestHospitalBooking, type HospitalSlotBooking } from '../../services/consumerApi'
import { getHospital } from './data'
import './hospital-booking.css'

export default function HospitalSuccess() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state?: HospitalSlotBooking }
  const booking = state ?? getLatestHospitalBooking()
  if (!booking) {
    return (
      <main className="consumer-screen app-page-enter">
          <header className="consumer-topbar"><button className="consumer-back" type="button" onClick={() => navigate('/hospitals')} aria-label="Back"><FiArrowLeft /></button><h1 className="consumer-title">No confirmed booking</h1><span /></header>
        <section className="success-card"><p>No hospital booking was found. Please select a slot and confirm it again.</p><button className="primary-cta green" type="button" onClick={() => navigate('/hospitals')}>Find Hospitals</button></section>
      </main>
    )
  }
  const hospital = getHospital(booking.hospitalId)
  const item = booking
  return (
    <main className="consumer-screen app-page-enter">
      <header className="consumer-topbar"><button className="consumer-back" type="button" onClick={() => navigate('/hospitals')} aria-label="Back"><FiArrowLeft /></button><h1 className="consumer-title">Booking Confirmed</h1><span /></header>
      <section className="success-hero"><div className="success-check"><FiCheck /></div><h1>Your slot is booked!</h1><p>We've sent the booking details to your mobile number.</p></section>
      <section className="success-card success-hospital-card"><img src={hospital.image} alt={item.hospitalName} /><div><div className="summary-heading"><h2>{item.hospitalName}</h2><span className="status-chip">Open Now</span></div><p className="meta-line"><FiMapPin /> {item.location}</p><div className="summary-grid"><div><FiCalendar /><strong>{item.date}</strong><span>{item.day}</span></div><div><FiClockIcon /><strong>{item.time}</strong><span>Time</span></div><div><FiFileText /><strong>{item.slotType}</strong><span>Slot Type</span></div></div></div></section>
      <section className="success-card booking-id-row"><div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><span className="form-title-icon" style={{ color: '#079455', background: '#e9f8f0' }}><FiFileText /></span><div><span style={{ color: '#667085', fontWeight: 700 }}>Booking ID</span><h2 style={{ margin: '3px 0 0', fontFamily: 'Satoshi', fontSize: 20 }}>{item.bookingId}</h2></div></div><span className="copy-link"><FiCopy /> Copy</span></section>
      <section className="success-card patient-tile"><span className="form-title-icon" style={{ color: '#079455', background: '#e9f8f0' }}><FiUser /></span><div><h3>Patient</h3><p>{item.patient.fullName} · {item.patient.age} Years · {item.patient.gender}</p></div><FiChevronRight /></section>
      <section className="success-card important-card"><h3>Important Information</h3><p>• Please arrive 15 minutes before your scheduled time.</p><p>• Carry a valid ID proof for verification.</p></section>
      <section className="next-actions"><h2>What’s Next?</h2><div className="next-action-grid"><button className="next-action" type="button"><FiCalendar />Add to Calendar</button><button className="next-action" type="button"><FiNavigation />Get Directions</button><button className="next-action" type="button"><FiDownload />Download Details</button></div></section>
      <button className="primary-cta green" style={{ marginTop: 24 }} type="button" onClick={() => navigate('/home')}>Go to Home</button>
      <section className="help-strip"><FiHeadphones /><div><h3>Need Help?</h3><p>Contact our support team</p></div><span className="copy-link">Contact Us <FiChevronRight /></span></section>
    </main>
  )
}
function FiClockIcon() { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> }
