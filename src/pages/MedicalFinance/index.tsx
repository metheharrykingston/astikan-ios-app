import { useEffect, useMemo, useState } from 'react'
import { FiAlertCircle, FiArrowLeft, FiArrowRight, FiCalendar, FiCheckCircle, FiCreditCard, FiFileText, FiMail, FiPhone, FiShield, FiUpload, FiUser } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import type { FinanceApplicationInput, FinanceDocument } from '../../services/consumerApi'
import './medical-finance.css'
import '../HospitalBooking/hospital-booking.css'

type FinanceDocState = FinanceDocument & {
  required: boolean
  helper: string
}

const MAX_FILE_SIZE = 8 * 1024 * 1024
const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.webp'

const initialDocuments: FinanceDocState[] = [
  { label: 'PAN Card', fileName: '', status: 'Missing', required: true, helper: 'Upload clear copy of PAN card' },
  { label: 'Aadhaar Card', fileName: '', status: 'Missing', required: true, helper: 'Upload clear copy of Aadhaar card' },
  { label: 'Medical Estimate / Hospital Quotation', fileName: '', status: 'Missing', required: true, helper: 'Upload treatment estimate or quotation' },
  { label: 'Additional Documents (Optional)', fileName: '', status: 'Missing', required: false, helper: 'Any other supporting document' },
]

function normalizeMobile(value: string) {
  return value.replace(/\D/g, '').slice(0, 10)
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function isValidPan(value: string) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.trim().toUpperCase())
}

const FINANCE_DRAFT_KEY = 'medical_finance_draft_v2'
const MIN_LOAN_AMOUNT = 10000
const MAX_LOAN_AMOUNT = 1000000

function normalizeLoanAmount(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 7)
  if (!digits) return ''
  const amount = Math.max(MIN_LOAN_AMOUNT, Math.min(MAX_LOAN_AMOUNT, Number(digits) || 0))
  return String(amount)
}

function maxEligibleDob() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 21)
  return date.toISOString().slice(0, 10)
}

function isValidDob(value: string) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age -= 1
  return age >= 21 && age <= 100
}

function fileError(file: File) {
  if (!ACCEPTED_MIME.includes(file.type)) return 'Only PDF, JPG, PNG or WEBP files are allowed.'
  if (file.size > MAX_FILE_SIZE) return 'File must be smaller than 8 MB.'
  return ''
}

export default function MedicalFinanceForm() {
  const navigate = useNavigate()
  const savedDraft = (() => {
    try { return JSON.parse(localStorage.getItem(FINANCE_DRAFT_KEY) || '{}') } catch { return {} }
  })() as Record<string, any>
  const [loanAmount, setLoanAmount] = useState(savedDraft.loanAmount || '')
  const [tenure, setTenure] = useState(savedDraft.tenure || '12 Months')
  const [fullName, setFullName] = useState(savedDraft.fullName || '')
  const [mobileNumber, setMobileNumber] = useState(savedDraft.mobileNumber || '')
  const [email, setEmail] = useState(savedDraft.email || '')
  const [panNumber, setPanNumber] = useState(savedDraft.panNumber || '')
  const [dateOfBirth, setDateOfBirth] = useState(savedDraft.dateOfBirth || '')
  const [documents, setDocuments] = useState<FinanceDocState[]>(Array.isArray(savedDraft.documents) ? savedDraft.documents : initialDocuments)
  const [consentToShareWithPartners, setConsentToShareWithPartners] = useState(Boolean(savedDraft.consentToShareWithPartners))
  const [acceptedTerms, setAcceptedTerms] = useState(Boolean(savedDraft.acceptedTerms))
  const [submitted, setSubmitted] = useState(false)
  const [fileMessages, setFileMessages] = useState<Record<string, string>>({})

  useEffect(() => {
    localStorage.setItem(FINANCE_DRAFT_KEY, JSON.stringify({
      loanAmount, tenure, fullName, mobileNumber, email, panNumber, dateOfBirth, documents, consentToShareWithPartners, acceptedTerms,
    }))
  }, [acceptedTerms, consentToShareWithPartners, dateOfBirth, documents, email, fullName, loanAmount, mobileNumber, panNumber, tenure])

  const errors = useMemo(() => {
    const amount = Number(loanAmount || 0)
    const missingDocuments = documents.filter((doc) => doc.required && doc.status !== 'Uploaded')
    return {
      loanAmount: loanAmount && amount >= 10000 && amount <= 1000000 ? '' : 'Enter amount between ₹10,000 and ₹10,00,000.',
      fullName: fullName.trim().length >= 2 ? '' : 'Enter patient full name.',
      mobileNumber: mobileNumber.length === 10 ? '' : 'Enter a valid 10-digit mobile number.',
      email: isValidEmail(email) ? '' : 'Enter a valid email address.',
      panNumber: isValidPan(panNumber) ? '' : 'Enter a valid PAN format, for example ABCDE1234F.',
      dateOfBirth: isValidDob(dateOfBirth) ? '' : 'Patient must be between 21 and 100 years old.',
      documents: missingDocuments.length ? 'PAN, Aadhaar and medical estimate are required.' : '',
      consent: consentToShareWithPartners ? '' : 'Consent to share with lending partners is required.',
      terms: acceptedTerms ? '' : 'Please accept Terms and Privacy Policy.',
    }
  }, [acceptedTerms, consentToShareWithPartners, dateOfBirth, documents, email, fullName, loanAmount, mobileNumber, panNumber])

  const canContinue = Object.values(errors).every((error) => !error)
  const payload: FinanceApplicationInput = {
    requiredLoanAmount: loanAmount,
    loanAmount,
    tenure,
    fullName: fullName.trim(),
    mobileNumber: `+91 ${mobileNumber}`,
    email: email.trim().toLowerCase(),
    panNumber: panNumber.trim().toUpperCase(),
    dateOfBirth,
    documents: documents.map(({ helper: _helper, ...doc }) => doc),
    consentToShareWithPartners,
    acceptedTerms,
  }

  function updateDocument(index: number, file: File | null) {
    if (!file) return
    const message = fileError(file)
    if (message) {
      setFileMessages((prev) => ({ ...prev, [documents[index].label]: message }))
      return
    }
    setDocuments((prev) => prev.map((doc, docIndex) => docIndex === index
      ? { ...doc, fileName: file.name, status: 'Uploaded', sizeBytes: file.size, mimeType: file.type }
      : doc))
    setFileMessages((prev) => ({ ...prev, [documents[index].label]: '' }))
  }

  function continueToReview() {
    setSubmitted(true)
    if (!canContinue) return
    localStorage.setItem(FINANCE_DRAFT_KEY, JSON.stringify({ loanAmount, tenure, fullName, mobileNumber, email, panNumber, dateOfBirth, documents, consentToShareWithPartners, acceptedTerms }))
    navigate('/medical-finance/review', { state: payload })
  }

  const showError = (key: keyof typeof errors) => submitted && errors[key]

  return (
    <main className="finance-page app-page-enter">
      <header className="consumer-topbar finance-fixed-header"><button className="consumer-back" type="button" onClick={() => navigate(-1)}><FiArrowLeft /></button><div><h1 className="consumer-title">Medical Finance</h1></div><span /></header>
      <section className="finance-form-card"><h2 className="finance-section-title">1. Loan Details</h2><div className="finance-grid-two"><div><label className="field-label">Required Loan Amount</label><div className="finance-amount-input"><span>₹</span><input inputMode="numeric" placeholder="Enter amount" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value.replace(/\D/g, '').slice(0, 7))} onBlur={(e) => setLoanAmount(normalizeLoanAmount(e.target.value))} /></div><p className="finance-hint">Enter amount between ₹10,000 - ₹10,00,000</p>{showError('loanAmount') && <p className="finance-error"><FiAlertCircle /> {errors.loanAmount}</p>}</div><div><label className="field-label">Preferred Tenure</label><div className="tenure-grid">{['6 Months', '12 Months', '24 Months', '36 Months'].map((item) => <button key={item} type="button" onClick={() => setTenure(item)} className={`tenure-pill ${tenure === item ? 'active' : ''}`}>{item}</button>)}</div></div></div></section>
      <section className="finance-form-card"><h2 className="finance-section-title">2. Personal Information</h2>
        <div className="finance-input-row"><label><FiUser />Full Name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter full name" />{showError('fullName') && <p className="finance-error"><FiAlertCircle /> {errors.fullName}</p>}</div>
        <div className="finance-input-row"><label><FiPhone />Mobile Number</label><div className="finance-phone"><span>+91</span><input value={mobileNumber} onChange={(e) => setMobileNumber(normalizeMobile(e.target.value))} inputMode="numeric" placeholder="Enter mobile number" /></div>{showError('mobileNumber') && <p className="finance-error"><FiAlertCircle /> {errors.mobileNumber}</p>}</div>
        <div className="finance-input-row"><label><FiMail />Email Address</label><input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" placeholder="Enter email address" />{showError('email') && <p className="finance-error"><FiAlertCircle /> {errors.email}</p>}</div>
        <div className="finance-input-row"><label><FiCreditCard />PAN Number</label><input value={panNumber} onChange={(e) => setPanNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} placeholder="Enter PAN number" /><p className="finance-hint">Your PAN will be used for Verification Purposes only!</p>{showError('panNumber') && <p className="finance-error"><FiAlertCircle /> {errors.panNumber}</p>}</div>
        <div className="finance-input-row"><label><FiCalendar />Date of Birth</label><input type="date" max={maxEligibleDob()} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />{showError('dateOfBirth') && <p className="finance-error"><FiAlertCircle /> {errors.dateOfBirth}</p>}</div>
      </section>
      <section className="finance-form-card"><h2 className="finance-section-title">3. Upload Documents</h2><p className="finance-hint" style={{ marginTop: -10, marginBottom: 12 }}>Please upload clear PDF or image files. Max 8 MB each.</p><div className="document-list">{documents.map((doc, index) => <div className="document-row" key={doc.label}><span className="doc-icon">{index < 2 ? <FiCreditCard /> : <FiFileText />}</span><div><h3>{doc.label}{doc.required ? ' *' : ''}</h3><p>{doc.fileName || doc.helper}</p>{fileMessages[doc.label] && <p className="finance-error"><FiAlertCircle /> {fileMessages[doc.label]}</p>}</div><label className="upload-btn"><FiUpload /> {doc.status === 'Uploaded' ? 'Change' : 'Upload'}<input type="file" accept={ACCEPTED_EXTENSIONS} onChange={(event) => updateDocument(index, event.target.files?.[0] ?? null)} hidden /></label>{doc.status === 'Uploaded' && <span className="uploaded"><FiCheckCircle /> Uploaded</span>}</div>)}</div>{showError('documents') && <p className="finance-error"><FiAlertCircle /> {errors.documents}</p>}<p className="finance-hint" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><FiShield /> Your documents are used only for application processing and partner forwarding.</p></section>
      <div className="finance-checks"><label><input type="checkbox" checked={consentToShareWithPartners} onChange={(event) => setConsentToShareWithPartners(event.target.checked)} />I authorize Astikan to forward my medical finance request and documents to lending partners for evaluation.</label>{showError('consent') && <p className="finance-error"><FiAlertCircle /> {errors.consent}</p>}<label><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />I agree to the <strong style={{ color: '#0b66f6' }}>Terms &amp; Conditions</strong> and <strong style={{ color: '#0b66f6' }}>Privacy Policy</strong>.</label>{showError('terms') && <p className="finance-error"><FiAlertCircle /> {errors.terms}</p>}</div>
      <button className="primary-cta finance-bottom-cta" type="button" onClick={continueToReview} disabled={!canContinue} aria-disabled={!canContinue}>Apply for Medical Finance <FiArrowRight /></button>
    </main>
  )
}
