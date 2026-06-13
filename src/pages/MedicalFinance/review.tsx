import { useState } from 'react'
import { FiAlertCircle, FiArrowLeft, FiCheckCircle, FiCreditCard, FiEdit2, FiFileText, FiInfo, FiLock, FiShield, FiUser } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import { createFinanceApplication, type FinanceApplicationInput } from '../../services/consumerApi'
import './medical-finance.css'
import '../HospitalBooking/hospital-booking.css'

function formatAmount(value: string) {
  return Number(value.replace(/\D/g, '') || 0).toLocaleString('en-IN')
}

export default function MedicalFinanceReview() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state?: FinanceApplicationInput }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const application = state

  async function submit() {
    if (!application || isSubmitting) return
    setError('')
    setIsSubmitting(true)
    try {
      const result = await createFinanceApplication(application)
      navigate('/medical-finance/success', { state: result })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your application. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (!application) {
    return (
      <main className="finance-page app-page-enter">
        <header className="consumer-topbar"><button className="consumer-back" type="button" onClick={() => navigate('/medical-finance')}><FiArrowLeft /></button><div><h1 className="consumer-title">Application not ready</h1><p className="consumer-subtitle">Please complete the finance form first.</p></div><span /></header>
        <section className="finance-form-card"><p className="finance-error"><FiAlertCircle /> No application details were found for review.</p><button className="primary-cta" type="button" onClick={() => navigate('/medical-finance')}>Go back to form</button></section>
      </main>
    )
  }

  return (
    <main className="finance-page app-page-enter">
      <header className="consumer-topbar"><button className="consumer-back" type="button" onClick={() => navigate(-1)}><FiArrowLeft /></button><div><h1 className="consumer-title">Confirm Your Details</h1><p className="consumer-subtitle">Please review your information before submission</p></div><span /></header>
      <section className="finance-secure-card"><span className="form-title-icon"><FiShield /></span><div><strong>Your information is protected</strong><p>Astikan forwards finance requests to lending partners only after your consent.</p></div></section>
      <section className="review-detail-card finance-section-card"><div className="finance-section-title"><span><span className="circle-icon"><FiCreditCard /></span> 1. Loan Details</span><button className="review-edit" type="button" onClick={() => navigate(-1)}><FiEdit2 /> Edit</button></div><div className="finance-grid-two"><div><p className="finance-hint">Required Loan Amount</p><h2 style={{ margin: '4px 0 0' }}>₹{formatAmount(application.requiredLoanAmount)}</h2></div><div><p className="finance-hint">Preferred Tenure</p><h2 style={{ margin: '4px 0 0' }}>{application.tenure}</h2></div></div></section>
      <section className="review-detail-card finance-section-card"><div className="finance-section-title"><span><span className="circle-icon"><FiUser /></span> 2. Personal Information</span><button className="review-edit" type="button" onClick={() => navigate(-1)}><FiEdit2 /> Edit</button></div><div className="finance-detail-row"><span>Full Name</span><strong>{application.fullName}</strong></div><div className="finance-detail-row"><span>Mobile Number</span><strong>{application.mobileNumber}</strong></div><div className="finance-detail-row"><span>Email Address</span><strong>{application.email}</strong></div><div className="finance-detail-row"><span>PAN Number</span><strong>{application.panNumber}</strong></div><div className="finance-detail-row"><span>Date of Birth</span><strong>{application.dateOfBirth}</strong></div><p className="finance-hint">PAN is format checked only. Astikan does not verify PAN or approve loans.</p></section>
      <section className="review-detail-card finance-section-card"><div className="finance-section-title"><span><span className="circle-icon"><FiFileText /></span> 3. Documents</span><button className="review-edit" type="button" onClick={() => navigate(-1)}><FiEdit2 /> Edit</button></div><div className="finance-document-review">{application.documents.map((doc, index) => <div className="document-row" key={doc.label}><span className="doc-icon">{index < 2 ? <FiUser /> : <FiFileText />}</span><div><h3>{doc.label}</h3><p>{doc.fileName}</p></div><span className="uploaded"><FiCheckCircle /> Uploaded</span></div>)}</div></section>
      <div className="finance-legal"><FiInfo /> By confirming, you agree that Astikan may share this information with lending partners for application review. Astikan is not the lender and does not approve or disburse loans.</div>
      {error && <p className="finance-error finance-submit-error"><FiAlertCircle /> {error}</p>}
      <button className="primary-cta" type="button" onClick={submit} disabled={isSubmitting}><FiShield /> {isSubmitting ? 'Submitting...' : 'Confirm & Submit Application'}</button>
      <p className="secure-footnote"><FiLock /> Your information is protected and shared only as described in the consent.</p>
    </main>
  )
}
