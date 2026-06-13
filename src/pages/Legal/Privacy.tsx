import { useNavigate } from "react-router-dom"
import "./legal.css"

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <main className="legal-screen app-page-enter">
      <article className="legal-card app-fade-stagger">
        <h1>Privacy Policy</h1>
        <div className="legal-scroll">
          <p><strong>Data we collect:</strong> Astikan may collect account details, phone number, email, profile details, appointment details, lab order details, medicine order details, uploaded documents, payment status, device information, support messages and consent records needed to run the service.</p>
          <p><strong>Health and service data:</strong> Health-related data is used to provide consultations, lab tests, medicine fulfilment, care support, booking history, reports and user support. AI features may process user-provided symptoms or documents for informational assistance.</p>
          <p><strong>Medical finance sharing:</strong> If you apply for medical finance between ₹10,000 and ₹10,00,000 and give consent, Astikan may share your finance form, contact details and uploaded documents with lending partners for their review. Astikan does not sell this data and does not verify PAN, approve loans or disburse funds.</p>
          <p><strong>Partners:</strong> Depending on the service, data may be shared with doctors, hospitals, labs, medicine vendors/brands, logistics providers, payment gateways, communication providers, cloud/storage providers and lending partners strictly for service delivery, compliance, support or fraud prevention.</p>
          <p><strong>Access control:</strong> Data access is role-based. Users, doctors, support staff and superadmin operations should only see information required for their role. Uploaded documents and personal information must not be exposed publicly.</p>
          <p><strong>Security:</strong> Astikan uses access controls, encryption in transit, backend validation, session protection and operational monitoring. No digital system is risk-free, so report suspicious activity immediately.</p>
          <p><strong>Your rights:</strong> You may request correction, access or deletion where legally applicable. Some records may be retained for legal, medical, tax, payment, fraud prevention or dispute-resolution reasons.</p>
          <p><strong>Contact:</strong> For privacy or data requests, use in-app support or contact Astikan support with your registered phone/email and booking reference.</p>
        </div>
        <button className="legal-back app-pressable" onClick={() => navigate(-1)}>Back</button>
      </article>
    </main>
  )
}
