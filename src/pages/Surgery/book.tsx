import { useMemo, useState } from 'react'
import { FiCalendar, FiChevronRight, FiUser } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import { formatRupees, getSurgery } from './data'
import { SurgeryHeader } from './Header'
import './surgery.css'

type Gender = 'Male' | 'Female' | 'Other'

export default function SurgeryBook() {
  const navigate = useNavigate()
  const { surgeryId } = useParams()
  const surgery = getSurgery(surgeryId)
  const [fullName, setFullName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender>('Male')
  const selectedPackage = surgery.packages[0]

  const payload = useMemo(() => ({
    surgeryId: surgery.id,
    surgeryName: surgery.name,
    treatmentType: surgery.subtitle,
    packageName: selectedPackage.label,
    packagePrice: selectedPackage.price,
    hospitalName: surgery.hospitals[0]?.name ?? 'Partner Hospital',
    date: 'Today',
    day: 'Care team callback',
    time: 'Within 15 mins',
    slotType: 'Free consultation',
    location: 'Astikan partner hospital',
    patient: { fullName, mobileNumber, age, gender },
    amount: selectedPackage.price,
  }), [age, fullName, gender, mobileNumber, selectedPackage.label, selectedPackage.price, surgery])

  function continueToConfirm() {
    navigate(`/surgeries/${surgery.id}/confirm`, { state: payload })
  }

  return (
    <main className="surgery-page app-page-enter">
      <SurgeryHeader title="Book Consultation" subtitle={surgery.name} />
      <section className="surgery-shell with-bottom-cta app-content-slide">
        <article className="surgery-price-card app-fade-stagger">
          <div className="surgery-starting-box">
            <span>Selected Package</span>
            <strong>{formatRupees(selectedPackage.price)}</strong>
          </div>
          <div className="surgery-benefit-stack">
            <div className="surgery-benefit">
              <span className="surgery-benefit-icon"><FiCalendar /></span>
              <div><h3>{surgery.name}</h3><p>{selectedPackage.room} · {selectedPackage.stay}</p></div>
            </div>
          </div>
        </article>

        <section className="surgery-form-card app-fade-stagger">
          <h2>Patient Details</h2>
          <div className="surgery-form-grid">
            <label className="surgery-field"><span>Full Name</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Enter patient name" /></label>
            <label className="surgery-field"><span>Mobile Number</span><input value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} inputMode="tel" placeholder="10 digit mobile number" /></label>
            <label className="surgery-field"><span>Age</span><input value={age} onChange={(event) => setAge(event.target.value)} inputMode="numeric" placeholder="Patient age" /></label>
            <label className="surgery-field"><span>Gender</span><select value={gender} onChange={(event) => setGender(event.target.value as Gender)}><option>Male</option><option>Female</option><option>Other</option></select></label>
          </div>
        </section>

        <section className="surgery-form-card app-fade-stagger">
          <h2>Booking Summary</h2>
          <div className="surgery-summary-line"><span>Surgery</span><strong>{surgery.name}</strong></div>
          <div className="surgery-summary-line"><span>Package</span><strong>{selectedPackage.label}</strong></div>
          <div className="surgery-summary-line"><span>Hospital</span><strong>{payload.hospitalName}</strong></div>
          <div className="surgery-summary-line"><span>Callback</span><strong>Within 15 mins</strong></div>
        </section>
      </section>

      <footer className="surgery-bottom-cta app-fade-stagger">
        <div className="surgery-help-mini">
          <span className="surgery-help-mini-icon"><FiUser /></span>
          <div><h3>Care Expert</h3><p>Free consultation</p></div>
        </div>
        <button className="surgery-primary-btn app-pressable" type="button" onClick={continueToConfirm}>
          <span>Continue</span>
          <small>Review booking</small>
          <FiChevronRight />
        </button>
      </footer>
    </main>
  )
}
