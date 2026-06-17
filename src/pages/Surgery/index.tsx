import { FiCheckCircle, FiChevronRight, FiFilter, FiSearch, FiShield, FiSliders } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { formatRupees, surgeries } from './data'
import { SurgeryHeader } from './Header'
import './surgery.css'

export default function SurgeryList() {
  const navigate = useNavigate()

  return (
    <main className="surgery-page app-page-enter">
      <SurgeryHeader
        title="Surgery"
        subtitle="Safe. Trusted. Affordable."
        right={(
          <span className="surgery-insurance-pill">
            <FiShield />
            <span>Insurance<br />Accepted</span>
          </span>
        )}
      />

      <section className="surgery-shell app-content-slide">
        <article className="surgery-main-hero app-fade-stagger">
          <img src="/assets/surgery/surgery-hero.webp" alt="Surgery operation room" />
          <div className="surgery-hero-copy">
            <h2>Quality care for a better you</h2>
            <p>Advanced treatment by expert surgeons</p>
            <button className="surgery-primary-btn app-pressable" type="button" onClick={() => document.getElementById('surgery-packages')?.scrollIntoView({ behavior: 'smooth' })}>
              Explore Surgeries
            </button>
          </div>
        </article>

        <div className="surgery-search-bar app-fade-stagger">
          <FiSearch />
          <span>Search for surgeries...</span>
          <FiFilter />
        </div>

        <section className="app-fade-stagger">
          <div className="surgery-section-head">
            <h2>Popular Surgeries</h2>
            <button className="surgery-link-btn app-pressable" type="button">View All</button>
          </div>
          <div className="popular-surgeries-row">
            {surgeries.map((surgery) => (
              <button key={surgery.id} className="popular-surgery-card app-pressable" type="button" onClick={() => navigate(`/surgeries/${surgery.id}`)}>
                <img src={surgery.icon} alt={surgery.shortName} />
                <span>{surgery.shortName}</span>
              </button>
            ))}
          </div>
        </section>

        <section id="surgery-packages" className="app-fade-stagger">
          <div className="surgery-section-head">
            <div>
              <h2>Surgery Packages</h2>
              <p>All prices are starting from</p>
            </div>
            <span className="surgery-sort-btn"><FiSliders /> Sort</span>
          </div>

          <div className="surgery-package-list">
            {surgeries.filter((surgery) => surgery.id !== 'gallbladder-stone-surgery').map((surgery) => (
              <article key={surgery.id} className="surgery-package-card app-pressable" onClick={() => navigate(`/surgeries/${surgery.id}`)} role="button" tabIndex={0}>
                <div className="surgery-card-image"><img src={surgery.cardImage} alt={surgery.heroAlt} /></div>
                <div className="surgery-card-content">
                  <div className="surgery-card-top">
                    <div className="surgery-card-copy">
                      <h3>{surgery.name}</h3>
                      <p>{surgery.subtitle}</p>
                      <span className="surgery-price-label">Starting from</span>
                      <h4 className="surgery-card-price">{formatRupees(surgery.startingPrice)}</h4>
                    </div>
                    <div className="surgery-feature-list">
                      {surgery.features.map((feature) => <span key={feature}><FiCheckCircle />{feature}</span>)}
                    </div>
                  </div>
                  <button className="surgery-view-package app-pressable" type="button" onClick={(event) => { event.stopPropagation(); navigate(`/surgeries/${surgery.id}`) }}>
                    View Package <FiChevronRight />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
