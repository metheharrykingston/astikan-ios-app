import { useNavigate } from "react-router-dom"
import "../Settings/settings.css"

const items = [
  { title: "Profile Information", desc: "Name, email, phone", to: "/profile-info" },
  { title: "Health Information", desc: "Vitals and history", to: "/health-info" },
  { title: "Address", desc: "Home and office", to: "/address" },
  { title: "Orders & Bookings", desc: "Medicine orders and lab bookings", to: "/bookings" },
  { title: "Reports", desc: "Invoices, bills, health reports", to: "/reports" },
]

export default function AccountSettings() {
  const navigate = useNavigate()

  return (
    <main className="account-page app-page-enter">
      <header className="account-header app-fade-stagger">
        <button className="account-back app-pressable" onClick={() => navigate(-1)} type="button" aria-label="Back">&lt;</button>
        <h1>Settings</h1>
      </header>

      <section className="account-shell app-content-slide">
        <article className="account-card app-fade-stagger">
          <h3>Manage your account</h3>
          <p>All profile, health, booking, report, and notification preferences in one place.</p>
        </article>

        <div className="setting-list app-fade-stagger">
          {items.map((item) => (
            <button key={item.title} className="setting-item app-pressable" onClick={() => navigate(item.to)} type="button">
              <span>{item.title}<br /><small>{item.desc}</small></span>
              <span>&gt;</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
