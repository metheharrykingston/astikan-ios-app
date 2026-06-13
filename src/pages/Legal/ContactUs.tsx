import { useNavigate } from "react-router-dom"
import "./legal.css"

export default function ContactUs() {
  const navigate = useNavigate()

  return (
    <main className="legal-screen app-page-enter">
      <article className="legal-card app-fade-stagger">
        <h1>Contact Us</h1>
        <div className="legal-scroll">
          <p><strong>Astikan Healthcare Pvt Ltd</strong> supports users for bookings, payments, technical issues, and care journey queries.</p>
          <p><strong>Email:</strong> care@astikan.com</p>
          <p><strong>Support:</strong> Use the in-app Support page for technical bugs, booking issues, invoice questions, wallet concerns, or service complaints.</p>
          <p><strong>Emergency note:</strong> For medical emergencies, do not wait for app support. Please contact local emergency services or the nearest hospital immediately.</p>
        </div>
        <button className="legal-back app-pressable" onClick={() => navigate(-1)}>Back</button>
      </article>
    </main>
  )
}
