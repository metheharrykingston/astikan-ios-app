import { useEffect, useState } from 'react'
import {
  FiBriefcase,
  FiCalendar,
  FiChevronRight,
  FiHeart,
  FiHelpCircle,
  FiHome,
  FiPlus,
  FiShare2,
  FiShield,
  FiStar,
  FiTool,
  FiUser,
} from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchSurgeryById } from '../../services/surgeryCatalogApi'
import { findSurgery, formatRupees, type SurgeryItem } from './data'
import { SurgeryHeader } from './Header'
import './surgery.css'

const inclusionIcons = [FiUser, FiHome, FiTool, FiBriefcase, FiCalendar, FiHelpCircle]

export default function SurgeryDetail() {
  const navigate = useNavigate()
  const { surgeryId } = useParams()
  const [surgery, setSurgery] = useState<SurgeryItem | null>(findSurgery(surgeryId) ?? null)
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)

  useEffect(() => {
    if (!surgeryId) return
    let cancelled = false
    fetchSurgeryById(surgeryId)
      .then((item) => {
        if (!cancelled) {
          setSurgery(item)
          setSelectedPackageId(item.packages[0]?.id ?? null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          const fallback = findSurgery(surgeryId) ?? null
          setSurgery(fallback)
          setSelectedPackageId(fallback?.packages[0]?.id ?? null)
        }
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

  const selectedPackage = surgery.packages.find((tier) => tier.id === selectedPackageId) ?? surgery.packages[0]

  return (
    <main className="surgery-page app-page-enter">
      <SurgeryHeader
        title={surgery.name}
        subtitle={surgery.subtitle}
        right={(
          <>
            <button className="surgery-header-action app-pressable" type="button" aria-label="Save"><FiHeart /></button>
            <button className="surgery-header-action app-pressable" type="button" aria-label="Share"><FiShare2 /></button>
          </>
        )}
      />

      <section className="surgery-shell with-bottom-cta app-content-slide">
        <section className="surgery-detail-hero-row app-fade-stagger">
          <div className="surgery-detail-copy">
            <h2>{surgery.name}</h2>
            <p>{surgery.subtitle}</p>
            <div className="surgery-rating-line"><FiStar /><strong>{surgery.rating}</strong><span>({surgery.reviews})</span></div>
          </div>
          <div className="surgery-detail-illustration"><img src={surgery.detailImage} alt={surgery.heroAlt} /></div>
        </section>

        <section className="surgery-price-card app-fade-stagger">
          <div className="surgery-starting-box">
            <span>Starting From</span>
            <strong>{formatRupees(surgery.startingPrice)}</strong>
          </div>
          <div className="surgery-benefit-stack">
            <div className="surgery-benefit">
              <span className="surgery-benefit-icon"><FiCalendar /></span>
              <div><h3>EMI Available</h3><p>Starting ₹{surgery.emiFrom.toLocaleString('en-IN')}/month</p></div>
            </div>
            <div className="surgery-benefit">
              <span className="surgery-benefit-icon"><FiShield /></span>
              <div><h3>Insurance Accepted</h3><p>Cashless facility available</p></div>
            </div>
          </div>
        </section>

        <section className="surgery-white-card app-fade-stagger">
          <h2>What’s Included</h2>
          <div className="surgery-inclusion-grid">
            {surgery.inclusions.map((item, index) => {
              const Icon = inclusionIcons[index % inclusionIcons.length]
              return (
                <div key={item} className="surgery-inclusion-item">
                  <span className="surgery-inclusion-icon"><Icon /></span>
                  <span>{item}</span>
                  <FiChevronRight className="inclusion-arrow" />
                </div>
              )
            })}
          </div>
        </section>

        <section className="surgery-white-card app-fade-stagger">
          <h2>Choose Your Package</h2>
          <div className="surgery-package-tier-grid">
            {surgery.packages.map((tier, index) => (
              <button
                key={tier.id}
                className={`surgery-tier-card app-pressable ${selectedPackage?.id === tier.id || (!selectedPackageId && index === 0) ? 'active' : ''}`}
                type="button"
                onClick={() => setSelectedPackageId(tier.id)}
              >
                <h3>{tier.label}</h3>
                <strong>{formatRupees(tier.price)}</strong>
                <p>{tier.room}<br />{tier.stay}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="surgery-white-card app-fade-stagger">
          <div className="surgery-section-head">
            <h2>Top Hospitals</h2>
            <button
              className="surgery-link-btn app-pressable"
              type="button"
              onClick={() => document.getElementById('surgery-booking-cta')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            >
              View All
            </button>
          </div>
          <div className="surgery-hospital-row">
            {surgery.hospitals.map((hospital) => (
              <button
                key={hospital.id}
                className="surgery-hospital-card app-pressable"
                type="button"
                onClick={() => navigate(`/surgeries/${surgery.id}/book`, {
                  state: {
                    preferredHospitalId: hospital.id,
                    preferredHospitalName: hospital.name,
                    selectedPackageId: selectedPackage?.id ?? null,
                  },
                })}
              >
                <img src={hospital.logo} alt={hospital.name} />
                <h3>{hospital.name}</h3>
                <p>{hospital.rating} <FiStar /></p>
              </button>
            ))}
          </div>
        </section>

        <section className="surgery-faq-card app-fade-stagger">
          {surgery.faqs.map((faq) => {
            const open = openFaq === faq.question
            return (
              <div key={faq.question} className="surgery-faq-item">
                <button className="surgery-faq-question app-pressable" type="button" onClick={() => setOpenFaq(open ? null : faq.question)}>
                  <span>{faq.question}</span>
                  <FiPlus />
                </button>
                {open ? <p className="surgery-faq-answer">{faq.answer}</p> : null}
              </div>
            )
          })}
        </section>
      </section>

      <footer id="surgery-booking-cta" className="surgery-bottom-cta app-fade-stagger">
        <div className="surgery-help-mini">
          <span className="surgery-help-mini-icon"><FiHelpCircle /></span>
          <div><h3>Need Help?</h3><p>Talk to our care expert</p></div>
        </div>
        <button
          className="surgery-primary-btn app-pressable"
          type="button"
          onClick={() => navigate(`/surgeries/${surgery.id}/book`, {
            state: {
              selectedPackageId: selectedPackage?.id ?? null,
              selectedPackageLabel: selectedPackage?.label ?? null,
            },
          })}
        >
          <span>Request Free Consultation</span>
          <small>Call back in 15 mins</small>
        </button>
      </footer>
    </main>
  )
}
