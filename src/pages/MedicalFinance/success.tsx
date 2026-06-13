import { FiArrowLeft, FiCheck, FiClock, FiCopy, FiFileText, FiHome, FiLock, FiMail, FiPhone, FiSearch, FiSend, FiShield } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import { getLatestFinanceApplication, type FinanceApplication } from '../../services/consumerApi'
import './medical-finance.css'
import '../HospitalBooking/hospital-booking.css'

export default function MedicalFinanceSuccess() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state?: FinanceApplication }
  const application = state ?? getLatestFinanceApplication()

  if (!application) {
    return (
      <main className="finance-page app-page-enter">
        <header className="consumer-topbar"><button className="consumer-back" type="button" onClick={() => navigate('/medical-finance')}><FiArrowLeft /></button><div><h1 className="consumer-title">No submitted application</h1><p className="consumer-subtitle">Please submit the finance form first.</p></div><span /></header>
        <button className="primary-cta" type="button" onClick={() => navigate('/medical-finance')}>Start Application</button>
      </main>
    )
  }

  return (
    <main className="finance-page app-page-enter">
      <header className="consumer-topbar"><button className="consumer-back" type="button" onClick={() => navigate('/medical-finance')}><FiArrowLeft /></button><span /><span /></header>
      <section className="finance-success-hero"><div className="finance-success-check"><FiCheck /></div><h1>Application Submitted!</h1><p>We have received your medical finance request. Astikan will forward the information to lending partners for review.</p></section>
      <section className="finance-success-card"><div className="finance-status-row"><span className="form-title-icon" style={{ color: '#079455', background: '#e9f8f0' }}><FiFileText /></span><div><h3>Application Reference ID</h3><strong>{application.referenceId}</strong></div><span className="copy-link"><FiCopy /> Copy</span></div><div className="finance-status-row"><span className="form-title-icon"><FiClock /></span><div><h3>Expected Response</h3><strong>Partner review timeline may vary</strong></div><span className="notify-chip">We'll notify you</span></div><div className="finance-status-row"><span className="form-title-icon" style={{ color: '#7c3aed', background: '#f2ebff' }}><FiMail /></span><div><h3>Updates will be sent to</h3><strong>{application.email} &nbsp; | &nbsp; {application.mobileNumber}</strong></div></div></section>
      <section className="finance-success-card whats-next-card"><h2>What’s Next?</h2><div className="next-step-row"><span className="form-title-icon" style={{ color: '#079455', background: '#e9f8f0' }}><FiSearch /></span><div><h3>Application details will be checked</h3><p>Astikan operations will check whether required fields and files are complete.</p></div></div><div className="next-step-row"><span className="form-title-icon" style={{ color: '#079455', background: '#e9f8f0' }}><FiSend /></span><div><h3>Forwarded to lending partners</h3><p>Your request may be shared with partner lenders for eligibility review.</p></div></div><div className="next-step-row"><span className="form-title-icon" style={{ color: '#079455', background: '#e9f8f0' }}><FiPhone /></span><div><h3>Partner or Astikan may contact you</h3><p>Additional information may be requested if the partner requires it.</p></div></div></section>
      <section className="finance-secure-card"><span className="form-title-icon"><FiShield /></span><div><strong>Your information is protected</strong><p>Astikan does not verify PAN, approve loans, lend money or disburse funds.</p></div></section>
      <button className="primary-cta" type="button">Track Application</button>
      <button className="primary-cta" type="button" style={{ background: '#fff', color: '#0b66f6', border: '1px solid #0b66f6', boxShadow: 'none', marginTop: 12 }} onClick={() => navigate('/home')}><FiHome /> Back to Home</button>
      <p className="secure-footnote"><FiLock /> Information is shared only as described in your consent and privacy policy.</p>
    </main>
  )
}
