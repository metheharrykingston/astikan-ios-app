import { useState } from 'react'
import { FiArrowLeft, FiCalendar, FiChevronRight, FiClock, FiShield, FiUser, FiUsers } from 'react-icons/fi'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getHospital } from './data'
import './hospital-booking.css'

type Gender = 'Male' | 'Female' | 'Other'

export default function HospitalBookSlot() {
  const navigate = useNavigate()
  const { hospitalId } = useParams()
  const { state } = useLocation() as { state?: { slot?: string } }
  const hospital = getHospital(hospitalId)
  const [fullName, setFullName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender>('Male')
  const slot = state?.slot ?? '04:30 PM'
  const payload = {
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    location: hospital.address,
    date: '20 May 2024',
    day: 'Tuesday',
    time: slot,
    slotType: 'General Slot',
    patient: {
      fullName: fullName.trim() || 'Rohan Sharma',
      mobileNumber: mobileNumber.trim() || '+91 98765 43210',
      age: age.trim() || '28',
      gender,
    },
    amount: 0,
  }
  return (
    <main className="consumer-screen app-page-enter">
      <header className="consumer-topbar">
        <button className="consumer-back" type="button" onClick={() => navigate(-1)} aria-label="Back"><FiArrowLeft /></button>
        <div><h1 className="consumer-title">Book Your Slot</h1><p className="consumer-subtitle">Step 1 of 2</p></div>
        <span />
      </header>
      <div className="stepper"><div className="step active"><span>1</span>Your Details</div><div className="step"><span>2</span>Confirm Booking</div></div>
      <section className="appointment-summary-card">
        <div className="summary-photo"><img src={hospital.image} alt={hospital.name} /></div>
        <div>
          <div className="summary-heading"><h2>{hospital.name}</h2><span className="status-chip">Open Now</span></div>
          <p className="meta-line"><FiCalendar /> {hospital.address}</p>
          <div className="summary-grid"><div><FiCalendar /><strong>20 May 2024</strong><span>Tuesday</span></div><div><FiClock /><strong>{slot}</strong><span>Time</span></div><div><FiCalendar /><strong>General Slot</strong><span>Slot Type</span></div></div>
        </div>
      </section>
      <section className="form-card">
        <div className="form-title-row"><span className="form-title-icon"><FiUser /></span><h2>Patient Details</h2></div>
        <label className="field-label required">Full Name</label>
        <div className="input-box"><input placeholder="Enter full name" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <label className="field-label required">Mobile Number</label>
        <div className="input-box"><span className="input-prefix">+91</span><input inputMode="tel" placeholder="Enter mobile number" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} /></div>
        <label className="field-label required">Age</label>
        <div className="input-box"><input inputMode="numeric" placeholder="Enter age" value={age} onChange={(e) => setAge(e.target.value)} /><span className="input-suffix">years</span></div>
        <label className="field-label required">Gender</label>
        <div className="gender-row">{(['Male', 'Female', 'Other'] as Gender[]).map((item) => <button key={item} className={`gender-card ${gender === item ? 'active' : ''}`} type="button" onClick={() => setGender(item)}>{item === 'Male' ? <FiUser /> : <FiUsers />}{item}</button>)}</div>
      </section>
      <div className="security-inline"><FiShield /> Your information is secure and will not be shared.</div>
      <section className="sticky-summary">
        <div className="sticky-summary-info"><div><h4>Booking Summary</h4><p>20 May 2024, {slot}<br />{hospital.name}, Bengaluru</p></div><span className="divider" /><div><h4>Total Amount</h4><div className="total-free">FREE</div><p>No hidden charges</p></div></div>
        <button className="primary-cta" type="button" onClick={() => navigate(`/hospitals/${hospital.id}/confirm`, { state: payload })}>Continue <FiChevronRight /></button>
      </section>
    </main>
  )
}
