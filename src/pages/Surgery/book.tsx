import { useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiChevronRight, FiUser } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchSurgeryById } from '../../services/surgeryCatalogApi'
import { findSurgery, formatRupees, type SurgeryItem } from './data'
import { SurgeryHeader } from './Header'
import './surgery.css'

type Gender = 'Male' | 'Female' | 'Other'

export default function SurgeryBook() {
  const navigate = useNavigate()
  const { surgeryId } = useParams()
  const [surgery, setSurgery] = useState<SurgeryItem | null>(findSurgery(surgeryId) ?? null)
  const [fullName, setFullName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender>('Male')

  useEffect(() => {
    if (!surgeryId) return
    let cancelled = false
    fetchSurgeryById(surgeryId)
      .then((item) => {
        if (!cancelled) setSurgery(item)
      })
      .catch(() => {
        if (!cancelled) setSurgery(findSurgery(surgeryId) ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [surgeryId])

  if (!surgery) {
    return (
      <main className="surgery-page app-page-enter">
        <SurgeryHeader title="Treatment not found" subtitle="Please choose another surgery or treatment" />
        <section className="surgery-shell app-content-slide">
          <section className="surgery-form-card">
            <button className="surgery-primary-btn app-pressable" type="button" onClick={() => navigate('/surgeries')}>Browse Treatments</button>
          </section>
        </section>
      </main>
    )
  }

  const activeSurgery: SurgeryItem = surgery
  const selectedPackage = activeSurgery.packages[0]

  const payload = useMemo(() => ({
    surgeryId: activeSurgery.id,
    surgeryName: activeSurgery.name,
    treatmentType: activeSurgery.subtitle,
    packageName: selectedPackage.label,
    packagePrice: selectedPackage.price,
    hospitalName: activeSurgery.hospitals[0]?.name ?? 'Partner Hospital',
    date: 'Today',
    day: 'Care team callback',
    time: 'Within 15 mins',
    slotType: 'Free consultation',
    location: 'Astikan partner hospital',
    patient: { fullName, mobileNumber, age, gender },
    amount: selectedPackage.price,
  }), [activeSurgery, age, fullName, gender, mobileNumber, selectedPackage.label, selectedPackage.price])

  function continueToConfirm() {
    navigate(`/surgeries/${activeSurgery.id}/confirm`, { state: payload })
  }

  return (
    <main className="surgery-page app-page-enter">
      <SurgeryHeader title="Book Consultation" subtitle={activeSurgery.name} />
      <section className="surgery-shell with-bottom-cta app-content-slide">
        <article className="surgery-price-card app-fade-stagger">
          <div className="surgery-starting-box">
            <span>Selected Package</span>
            <strong>{formatRupees(selectedPackage.price)}</strong>
          </div>
          <div className="surgery-benefit-stack">
            <div className="surgery-benefit">
              <span className="surgery-benefit-icon"><FiCalendar /></span>
              <div><h3>{activeSurgery.name}</h3><p>{selectedPackage.room} · {selectedPackage.stay}</p></div>
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
          <div className="surgery-summary-line"><span>Surgery</span><strong>{activeSurgery.name}</strong></div>
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
