import { FiActivity, FiBell, FiCalendar, FiChevronDown, FiFilter, FiGrid, FiHeart, FiMapPin, FiSearch, FiStar } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { BottomNav, TrustStrip } from './common'
import { hospitals } from './data'
import './hospital-booking.css'

const categories = [
  { label: 'All Hospitals', icon: FiGrid, active: true },
  { label: 'Orthopedics', icon: FiActivity },
  { label: 'Cardiology', icon: FiHeart },
  { label: 'Neurology', icon: FiStar },
  { label: 'General', icon: FiActivity },
  { label: 'More', icon: FiGrid },
]

export default function HospitalList() {
  const navigate = useNavigate()
  return (
    <main className="consumer-screen with-nav app-page-enter">
      <header>
        <div className="location-row"><FiMapPin /> Bengaluru, Karnataka <FiChevronDown /></div>
        <button type="button" className="consumer-icon-btn" style={{ position: 'absolute', right: 22, top: 47 }} onClick={() => navigate('/notifications')} aria-label="Notifications">
          <FiBell />
        </button>
        <h1 className="hospital-headline">Find &amp; Book<br />Hospital Slots</h1>
        <p className="hospital-list-sub">Book trusted hospitals near you</p>
      </header>
      <div className="hospital-search-row">
        <div className="hospital-search"><FiSearch /> Search hospitals, specialities or treatments</div>
        <button className="filter-button" type="button"><FiFilter /> Filters</button>
      </div>
      <div className="specialty-row">
        {categories.map((item) => {
          const Icon = item.icon
          return <button key={item.label} className={`specialty-pill ${item.active ? 'active' : ''}`} type="button"><Icon />{item.label}</button>
        })}
      </div>
      <div className="results-sort-row"><span>52 hospitals found</span><span>Sort by: <strong>Relevance</strong> <FiChevronDown /></span></div>
      <section className="hospital-card-list">
        {hospitals.map((hospital) => (
          <article className="hospital-list-card" key={hospital.id} onClick={() => navigate(`/hospitals/${hospital.id}`)} role="button" tabIndex={0}>
            <div className="hospital-card-image"><img src={hospital.image} alt={hospital.name} /><span className="open-badge">Open Now</span></div>
            <div className="hospital-list-info">
              <FiHeart className="hospital-like" />
              <h3>{hospital.name}</h3>
              <div className="rating-line"><span className="star">★</span> <strong>{hospital.rating}</strong> ({hospital.reviews})</div>
              <p className="meta-line"><FiMapPin /> {hospital.address.replace(', Karnataka 560076', '')}</p>
              <p className="meta-line speciality-line"><FiActivity /> {hospital.specialties}</p>
              <p className="meta-line available-line"><FiCalendar /> Next Available: <strong>{hospital.nextAvailable}</strong></p>
              <button className="card-book-btn" type="button" onClick={(e) => { e.stopPropagation(); navigate(`/hospitals/${hospital.id}/book`) }}><FiCalendar /> Book Slot</button>
            </div>
          </article>
        ))}
      </section>
      <TrustStrip />
      <BottomNav active="Home" />
    </main>
  )
}
