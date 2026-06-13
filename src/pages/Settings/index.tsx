import { useState } from "react"
import { FiArrowLeft, FiChevronRight, FiFileText, FiLogOut, FiPackage, FiUser } from "react-icons/fi"
import { FaFlask, FaHospital, FaVideo } from "react-icons/fa"
import { useNavigate } from "react-router-dom"
import AppBottomNav from "../../components/AppBottomNav"
import {
  clearEmployeeAuthSession,
  clearEmployeeCompanySession,
  getEmployeeAuthSession,
} from "../../services/authApi"
import "./settings.css"

type OrderOption = {
  title: string
  to: string
  icon: JSX.Element
}

function capitalizeFirst(value: string) {
  const text = String(value || "").trim()
  if (!text) return "Astikan Member"
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const orderOptions: OrderOption[] = [
  { title: "Medicine Orders", to: "/bookings?type=medicine", icon: <FiPackage /> },
  { title: "Lab Tests", to: "/bookings?type=lab", icon: <FaFlask /> },
  { title: "Teleconsultation Bookings", to: "/bookings?type=teleconsultation", icon: <FaVideo /> },
  { title: "OPD Bookings", to: "/bookings?type=opd", icon: <FaHospital /> },
]

export default function Settings() {
  const navigate = useNavigate()
  const auth = getEmployeeAuthSession()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const displayName = capitalizeFirst(auth?.fullName?.trim() || auth?.email?.split("@")[0] || "Astikan Member")
  const displayEmail = auth?.email?.trim() || "member@astikan.com"

  function confirmLogout() {
    clearEmployeeAuthSession()
    clearEmployeeCompanySession()
    navigate("/login")
  }

  return (
    <main className="account-page account-page--clean app-page-enter">
      <header className="account-header app-fade-stagger">
        <button className="account-back app-pressable" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <h1>Account</h1>
      </header>

      <section className="account-shell app-content-slide">
        <article className="account-card account-hero-card account-hero-card--compact app-fade-stagger">
          <div className="account-hero-main">
            <div className="account-avatar-badge" aria-hidden="true"><FiUser /></div>
            <div className="account-hero-copy-block">
              <h2>{displayName}</h2>
              <p>{displayEmail}</p>
            </div>
          </div>
        </article>

        <article className="account-section-card account-orders-card app-fade-stagger">
          <div className="account-section-head">
            <div><h3>Orders & Bookings</h3></div>
          </div>
          <div className="account-menu-list">
            {orderOptions.map((item) => (
              <button key={item.title} className="account-menu-item app-pressable" onClick={() => navigate(item.to)} type="button">
                <span className="account-menu-icon" aria-hidden="true">{item.icon}</span>
                <span className="account-menu-copy"><strong>{item.title}</strong></span>
                <span className="account-menu-arrow" aria-hidden="true"><FiChevronRight /></span>
              </button>
            ))}
          </div>
        </article>

        <article className="account-section-card app-fade-stagger">
          <div className="account-menu-list">
            <button className="account-menu-item app-pressable" onClick={() => navigate("/reports")} type="button">
              <span className="account-menu-icon" aria-hidden="true"><FiFileText /></span>
              <span className="account-menu-copy"><strong>Bills & Reports</strong></span>
              <span className="account-menu-arrow" aria-hidden="true"><FiChevronRight /></span>
            </button>
          </div>
        </article>

        <article className="account-card account-logout-card account-logout-card--clean app-fade-stagger">
          <button className="logout-btn account-logout-btn app-pressable" onClick={() => setLogoutConfirmOpen(true)} type="button">
            <FiLogOut /><span>Logout</span>
          </button>
        </article>
      </section>

      {logoutConfirmOpen ? (
        <div className="account-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
          <section className="account-confirm-card app-page-enter">
            <div className="account-confirm-icon" aria-hidden="true"><FiLogOut /></div>
            <h2 id="logout-confirm-title">Are you sure?</h2>
            <p>You will be logged out of your Astikan account on this device.</p>
            <div className="account-confirm-actions">
              <button className="account-confirm-secondary app-pressable" type="button" onClick={() => setLogoutConfirmOpen(false)}>
                Stay logged in
              </button>
              <button className="account-confirm-danger app-pressable" type="button" onClick={confirmLogout}>
                Yes, logout
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <AppBottomNav active="Account" />
    </main>
  )
}
