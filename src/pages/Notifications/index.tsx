import { FiArrowLeft, FiBellOff } from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import "./notifications.css"

export default function Notifications() {
  const navigate = useNavigate()
  return (
    <main className="notif-page app-page-enter">
      <header className="notif-header app-fade-stagger">
        <button className="notif-back app-pressable" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div className="notif-title-wrap">
          <h1>Notifications</h1>
          <p>No notifications</p>
        </div>
        <span />
      </header>
      <section className="notif-shell app-content-slide">
        <article className="notif-empty-card app-fade-stagger">
          <FiBellOff />
          <h2>No notifications</h2>
          <p>New alerts are hidden for now.</p>
        </article>
      </section>
    </main>
  )
}
