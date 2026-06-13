import { FiActivity, FiArrowLeft, FiCalendar, FiChevronRight, FiClock, FiHeart, FiMapPin, FiMoreHorizontal, FiShare2, FiShield, FiTruck, FiZap } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import { afternoonSlots, dateSlots, getHospital, morningSlots } from './data'
import './hospital-booking.css'

export default function HospitalDetail() {
  const navigate = useNavigate()
  const { hospitalId } = useParams()
  const hospital = getHospital(hospitalId)
  const selectedSlot = '04:30 PM'
  return (
    <main className="consumer-screen app-page-enter">
      <header className="consumer-topbar">
        <button className="consumer-back" type="button" onClick={() => navigate(-1)} aria-label="Back"><FiArrowLeft /></button>
        <span />
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="consumer-icon-btn" type="button" aria-label="Share"><FiShare2 /></button>
          <button className="consumer-icon-btn" type="button" aria-label="Save"><FiHeart /></button>
        </div>
      </header>
      <section className="hospital-detail-hero">
        <div className="detail-photo"><img src={hospital.image} alt={hospital.name} /><span className="photo-count">25+ Photos</span></div>
        <div>
          <h1 className="detail-name">{hospital.name}</h1>
          <div className="rating-line"><span className="star">★</span><strong>{hospital.rating}</strong> ({hospital.reviews})</div>
          <p className="detail-meta"><FiMapPin /> {hospital.address}</p>
          <p className="detail-meta open"><span className="open-badge" style={{ position: 'static', boxShadow: 'none', padding: 0, background: 'transparent' }}>Open Now</span> · Closes at 10:00 PM</p>
        </div>
      </section>
      <div className="detail-feature-row">
        <div className="detail-feature"><FiZap />24x7<br />Emergency</div>
        <div className="detail-feature"><FiShield />Pharmacy</div>
        <div className="detail-feature"><FiActivity />Diagnostics</div>
        <div className="detail-feature"><FiTruck />ICU<br />Available</div>
        <div className="detail-feature"><FiMoreHorizontal />+12<br />More</div>
      </div>
      <div className="verified-card"><FiShield /><div>Trusted Care, Verified<span>NABH Accredited · 20+ Years of Excellence</span></div><FiChevronRight /></div>
      <section className="about-block">
        <h2>About Hospital</h2>
        <p>{hospital.description}</p>
        <span className="read-more">Read more</span>
      </section>
      <section className="slots-block">
        <div className="slots-header"><div><h2>Available Slots</h2><p>Select a date to see available slots</p></div><span className="calendar-link"><FiCalendar /> Calendar</span></div>
        <div className="date-row">{dateSlots.map((slot, index) => <button key={slot.date} type="button" className={`date-chip ${index === 0 ? 'active' : ''}`}><span>{slot.label || slot.date}</span><span>{index === 0 ? slot.date : slot.day}</span><span>{index === 0 ? slot.day : ''}</span></button>)}</div>
        <div className="slot-section-title">☀️ Today, 20 May</div>
        <div className="slot-grid">{morningSlots.map((slot) => <button key={slot} className="slot-pill" type="button">{slot}</button>)}</div>
        <div className="slot-section-title">☼ Afternoon</div>
        <div className="slot-grid">{afternoonSlots.map((slot) => <button key={slot} className={`slot-pill ${slot === selectedSlot ? 'selected' : ''} ${slot === '05:30 PM' ? 'disabled' : ''}`} type="button">{slot}</button>)}</div>
        <div className="next-slot"><FiClock /> Next available slot: Today, {selectedSlot}</div>
      </section>
      <div className="booking-bottom-bar"><div><strong>Free Booking</strong><span>No hidden charges</span></div><button className="primary-cta" type="button" onClick={() => navigate(`/hospitals/${hospital.id}/book`, { state: { slot: selectedSlot } })}>Continue to Book <FiChevronRight /></button></div>
    </main>
  )
}
