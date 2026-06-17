import { useState } from 'react'
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
import { formatRupees, getSurgery } from './data'
import { SurgeryHeader } from './Header'
import './surgery.css'

const inclusionIcons = [FiUser, FiHome, FiTool, FiBriefcase, FiCalendar, FiHelpCircle]

export default function SurgeryDetail() {
  const navigate = useNavigate()
  const { surgeryId } = useParams()
  const surgery = getSurgery(surgeryId)
  const [openFaq, setOpenFaq] = useState<string | null>(null)

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
              <button key={tier.id} className={`surgery-tier-card app-pressable ${index === 0 ? 'active' : ''}`} type="button">
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
            <button className="surgery-link-btn app-pressable" type="button">View All</button>
          </div>
          <div className="surgery-hospital-row">
            {surgery.hospitals.map((hospital) => (
              <article key={hospital.id} className="surgery-hospital-card">
                <img src={hospital.logo} alt={hospital.name} />
                <h3>{hospital.name}</h3>
                <p>{hospital.rating} <FiStar /></p>
              </article>
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

      <footer className="surgery-bottom-cta app-fade-stagger">
        <div className="surgery-help-mini">
          <span className="surgery-help-mini-icon"><FiHelpCircle /></span>
          <div><h3>Need Help?</h3><p>Talk to our care expert</p></div>
        </div>
        <button className="surgery-primary-btn app-pressable" type="button" onClick={() => navigate(`/surgeries/${surgery.id}/book`)}>
          <span>Book Free Consultation</span>
          <small>Call back in 15 mins</small>
        </button>
      </footer>
    </main>
  )
}
