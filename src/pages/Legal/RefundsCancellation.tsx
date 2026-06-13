import { useNavigate } from "react-router-dom"
import "./legal.css"

export default function RefundsCancellation() {
  const navigate = useNavigate()

  return (
    <main className="legal-screen app-page-enter">
      <article className="legal-card app-fade-stagger">
        <h1>Refunds & Cancellations</h1>
        <div className="legal-scroll">
          <p><strong>Lab tests:</strong> Cancellation depends on whether the slot has been confirmed, sample collection has started, or reports are already processed. Refunds may not apply after sample collection.</p>
          <p><strong>Medicines:</strong> Astikan manages medicine order fulfilment and stock operations. Orders may not be cancellable after packing, dispatch or delivery. Prescription-only, temperature-sensitive, opened or non-returnable medicines may be rejected for return unless required by law.</p>
          <p><strong>Consultations:</strong> OPD, teleconsultation and video consultation refunds depend on doctor assignment, user attendance, consultation start status, missed slots, rescheduling and payment gateway status.</p>
          <p><strong>Medical finance:</strong> Astikan does not charge or disburse loan amounts through this form. Any fees, approvals, cancellations or disbursement terms are controlled by the lending partner and must be reviewed with that partner.</p>
          <p><strong>Failed payments:</strong> If money is debited and the order is not confirmed, reconciliation will be handled through the payment gateway and banking timeline.</p>
          <p><strong>Processing timeline:</strong> Approved refunds are processed to the original payment mode or wallet according to payment partner and banking timelines.</p>
          <p><strong>Support:</strong> For refund or cancellation help, contact support from the app with your booking/order/payment reference.</p>
        </div>
        <button className="legal-back app-pressable" onClick={() => navigate(-1)}>Back</button>
      </article>
    </main>
  )
}
