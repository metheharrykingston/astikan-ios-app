import { useNavigate } from "react-router-dom"
import "./legal.css"

export default function Terms() {
  const navigate = useNavigate()

  return (
    <main className="legal-screen app-page-enter">
      <article className="legal-card app-fade-stagger">
        <h1>Terms of Service</h1>
        <div className="legal-scroll">
          <p><strong>Astikan role:</strong> Astikan operates a healthcare services platform for booking consultations, hospital slots, lab tests, medicine orders, support services and medical finance referrals. Some services are fulfilled by Astikan operations and some are delivered by qualified doctors, hospitals, laboratories, medicine brands/vendors, logistics partners, payment partners or lending partners.</p>
          <p><strong>Medical guidance:</strong> App content, AI suggestions and symptom tools are informational support only. They do not replace diagnosis, treatment or emergency care from a registered medical practitioner. In an emergency, contact local emergency services immediately.</p>
          <p><strong>Teleconsultation:</strong> Teleconsultation and video consultation are subject to doctor availability, user eligibility, network quality and clinical discretion. A doctor may ask the user to visit a physical facility when remote consultation is not appropriate.</p>
          <p><strong>Medicines:</strong> Astikan manages medicine orders, stock visibility, packaging, shipping and delivery status through its operations. Medicine brands/vendors are partners. Prescription-only medicines may require a valid prescription and may be rejected if documents are missing, invalid or non-compliant.</p>
          <p><strong>Lab tests:</strong> Astikan manages lab booking, collection coordination, report flow and support. Sample collection timing, report turnaround and availability may vary by city, test type and operational conditions.</p>
          <p><strong>Medical finance:</strong> Astikan is not a lender, loan broker guaranteeing approval, credit bureau or financial institution. Astikan forwards medical finance information for requests between ₹10,000 and ₹10,00,000 to lending partners only after user consent. Astikan does not verify PAN, approve loans, set final lending terms or disburse funds. PAN is checked only for format validation before submission.</p>
          <p><strong>Payments, cancellation and refunds:</strong> Payments and refunds depend on service type, booking stage, partner confirmation, dispatch/sample/consultation status and payment gateway timelines.</p>
          <p><strong>User responsibility:</strong> You must provide accurate information, use your own documents, keep login details secure and avoid fraudulent bookings, abusive behavior or misuse of services.</p>
          <p><strong>Changes:</strong> Astikan may update services, pricing, partners, policies and these terms. Continued use means you accept the latest version shown in the app.</p>
        </div>
        <button className="legal-back app-pressable" onClick={() => navigate(-1)}>Back</button>
      </article>
    </main>
  )
}
