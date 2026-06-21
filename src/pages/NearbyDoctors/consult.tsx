import { useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { FiArrowLeft, FiCheckCircle, FiChevronRight, FiMapPin, FiMonitor, FiShield, FiStar, FiUser } from "react-icons/fi"
import { goBackOrFallback } from "../../utils/navigation"
import type { NearbyDoctorPlace } from "../../services/doctorsApi"
import "./nearby-doctors.css"

type ConsultType = "clinic" | "video"

type ConsultState = {
  doctor?: NearbyDoctorPlace
  userLocation?: { lat: number; lng: number } | null
}

function prettyType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Doctor"
}

export default function NearbyDoctorConsultType() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as ConsultState | undefined
  const doctor = state?.doctor
  const [selected, setSelected] = useState<ConsultType>("clinic")

  const selectedLabel = useMemo(() => selected === "clinic" ? "Clinic Visit" : "Video Consultation", [selected])

  if (!doctor) {
    return (
      <main className="nearby-page nearby-centered app-page-enter">
        <h1>Select doctor again</h1>
        <p>We could not find the selected doctor details.</p>
        <button className="nearby-primary-btn app-pressable" type="button" onClick={() => navigate("/nearby-doctors")}>Find nearby doctors</button>
      </main>
    )
  }

  return (
    <main className="nearby-page app-page-enter">
      <header className="nearby-simple-header">
        <button className="nearby-back app-pressable" type="button" onClick={() => goBackOrFallback(navigate, "/nearby-doctors")} aria-label="Back"><FiArrowLeft /></button>
        <div>
          <h1>How would you like to consult?</h1>
          <p>Astikan will confirm availability and pricing before final booking.</p>
        </div>
      </header>

      <section className="nearby-content nearby-consult-content">
        <article className="nearby-selected-doctor-card">
          <div className="nearby-blur-avatar"><FiUser /></div>
          <div>
            <h2>{doctor.name}</h2>
            <strong>{prettyType(doctor.primaryType)}</strong>
            <p><FiMapPin /> {doctor.address}</p>
          </div>
          {typeof doctor.rating === "number" ? <span className="nearby-rating"><FiStar /> {doctor.rating.toFixed(1)}</span> : null}
        </article>

        <button className={`nearby-option-card ${selected === "clinic" ? "active" : ""}`} type="button" onClick={() => setSelected("clinic")}>
          <span className="nearby-option-icon clinic"><FiMapPin /></span>
          <div>
            <h3>Visit clinic</h3>
            <p>Physical appointment at doctor/clinic location</p>
            <ul>
              <li><FiCheckCircle /> Checkup</li>
              <li><FiCheckCircle /> Physical examination</li>
              <li><FiCheckCircle /> Reports review</li>
            </ul>
          </div>
          <FiChevronRight />
        </button>

        <button className={`nearby-option-card ${selected === "video" ? "active teal" : ""}`} type="button" onClick={() => setSelected("video")}>
          <span className="nearby-option-icon video"><FiMonitor /></span>
          <div>
            <h3>Video consultation</h3>
            <p>Consult online if this doctor supports it</p>
            <ul>
              <li><FiCheckCircle /> Follow-up</li>
              <li><FiCheckCircle /> Mild symptoms</li>
              <li><FiCheckCircle /> Medicine advice</li>
            </ul>
          </div>
          <FiChevronRight />
        </button>

        <div className="nearby-note"><FiShield /> This creates a booking request. Astikan confirms doctor availability and consultation price before final confirmation.</div>
      </section>

      <footer className="nearby-sticky-actions">
        <button className="nearby-secondary-btn app-pressable" type="button" onClick={() => navigate("/nearby-doctors")}>Back</button>
        <button
          className="nearby-primary-btn app-pressable"
          type="button"
          onClick={() => navigate("/nearby-doctors/request", { state: { doctor, consultationType: selected, consultationLabel: selectedLabel } })}
        >
          Continue
        </button>
      </footer>
    </main>
  )
}
