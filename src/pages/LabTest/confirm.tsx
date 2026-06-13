import { useEffect, useRef, useState } from "react"
import { FiAlertCircle, FiArrowLeft, FiCheck, FiCreditCard, FiFileText, FiMapPin } from "react-icons/fi"
import { RiHandCoinLine, RiTestTubeLine } from "react-icons/ri"
import { useLocation, useNavigate } from "react-router-dom"
import { ensureUserActor } from "../../services/actorsApi"
import { getEmployeeAuthSession, getEmployeeCompanySession } from "../../services/authApi"
import { bookLabOrder } from "../../services/labApi"
import { fetchPaymentQuote, initiatePayment, openCashfreeCheckout, verifyPayment, type PaymentQuote } from "../../services/paymentsApi"
import { goBackOrFallback } from "../../utils/navigation"
import successSound from "../../assets/audio/success.mp3"
import failedSound from "../../assets/audio/Failed.wav"
import "./labtest.css"

type LabTestItem = {
  id?: string
  code?: string
  name: string
  price?: number | null
}

const DEFAULT_LAB_BOOKING_AMOUNT_INR = 999
const SAFE_BOOKING_ERROR = "Booking could not be confirmed yet. Please try again shortly."

function safeLabBookingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "")
  const lower = message.toLowerCase()

  if (
    lower.includes("valid login token") ||
    lower.includes("authentication required") ||
    lower.includes("user login required") ||
    lower.includes("user session is incomplete")
  ) {
    return "Please login again to continue your lab booking."
  }

  if (lower.includes("payment not completed")) {
    return "Payment was not completed, so the booking was not created."
  }

  if (
    lower.includes("cashfree") ||
    lower.includes("payment gateway") ||
    lower.includes("not configured") ||
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("400")
  ) {
    return message
  }

  return message || SAFE_BOOKING_ERROR
}
type LabUserActor = Awaited<ReturnType<typeof ensureUserActor>>

function fallbackActorFromSession(input: {
  companyReference: string
  fullName: string
  email: string
  phone: string
}): LabUserActor {
  return {
    companyId: input.companyReference,
    userId: "",
    userCode: "",
    employeeUserId: "",
    employeeCode: "",
    email: input.email,
    phone: input.phone,
  }
}

function extractPincode(address?: string) {
  const match = String(address ?? "").match(/\b(\d{6})\b/)
  return match?.[1] ?? ""
}

function displayLabBookingId(value: string) {
  const digits = String(value || "").replace(/\D/g, "")
  if (digits.length >= 12) return digits.slice(-12)
  let hash = 0
  for (const char of String(value || "")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return String(hash).padStart(12, "0").slice(-12)
}

async function waitForPaymentStatus(transactionId: string, cashfreeOrderId: string | null, localOrderId?: string | null) {
  let latest = ""
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await verifyPayment(transactionId, cashfreeOrderId, localOrderId ?? null)
    latest = String(result.paymentStatus ?? "").trim().toUpperCase()
    if (latest === "SUCCESS" || latest === "PAID") return latest
    if (latest === "FAILED" || latest === "CANCELLED") throw new Error("Payment was not completed.")
    await new Promise((resolve) => window.setTimeout(resolve, 1400))
  }
  throw new Error("Payment is still verifying. Please wait a few seconds and try again.")
}

export default function LabConfirm() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<"ready" | "processing" | "confirmed" | "failed">("ready")
  const [bookingId, setBookingId] = useState<string>("")
  const [bookingReference, setBookingReference] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [quote, setQuote] = useState<PaymentQuote | null>(null)
  const successAudioRef = useRef<HTMLAudioElement | null>(null)
  const failedAudioRef = useRef<HTMLAudioElement | null>(null)
  const { state } = useLocation() as {
    state?: {
      selectedTest?: LabTestItem
      collectionType?: string
      address?: string
      date?: string
      time?: string
      etaMinutes?: number
      etaStartAt?: string
      readinessQuestions?: Array<{ id: string; question: string; options: Array<{ value: string; label: string }> }>
      readiness?: Record<string, "yes" | "no">
      addressDetails?: {
        line1?: string
        line2?: string
        city?: string
        state?: string
        pincode?: string
        country?: string
      }
      contactPhone?: string
      contactEmail?: string
    }
  }

  const dateTime = state?.date ? `${state.date}${state?.time ? ` ${state.time}` : ""}` : "On-demand collection"
  const authSession = getEmployeeAuthSession()
  const companySession = getEmployeeCompanySession()
  const collectionType = state?.collectionType === "office" ? "Office Collection" : "Home Collection"
  const selectedTest = state?.selectedTest?.name ?? "Complete Blood Count (CBC)"
  const selectedTestPrice = Number(state?.selectedTest?.price ?? DEFAULT_LAB_BOOKING_AMOUNT_INR)
  const labBookingAmountInr = Number.isFinite(selectedTestPrice)
    ? Math.max(1, Math.round(selectedTestPrice))
    : DEFAULT_LAB_BOOKING_AMOUNT_INR
  const collectionAddress = state?.address ?? "Collection address not provided"
  const addressPincode = state?.addressDetails?.pincode ?? extractPincode(state?.address)
  const readinessQuestions = state?.readinessQuestions ?? []
  const employeeName = authSession?.fullName?.trim() || "Astikan Member"
  const employeeEmail = state?.contactEmail?.trim() || authSession?.email?.trim() || `${authSession?.userId ?? "member"}@user.astikan.local`
  const employeePhone = state?.contactPhone?.trim() || authSession?.phone?.trim() || "9999999999"
  const employeeHandle = authSession?.email?.trim() || authSession?.userId || employeeName

  function buildPatientNotes() {
    if (!readinessQuestions.length || !state?.readiness) return ""
    return readinessQuestions
      .map((question) => {
        const answer = state.readiness?.[question.id]
        if (!answer) return null
        const answerLabel =
          question.options.find((option) => option.value === answer)?.label ?? answer
        return `Q: ${question.question} A: ${answerLabel}`
      })
      .filter(Boolean)
      .join(" | ")
  }

  useEffect(() => {
    let active = true
    void fetchPaymentQuote("lab", labBookingAmountInr)
      .then((data) => {
        if (active) setQuote(data)
      })
      .catch(() => {
        // The payment quote is only for display. Lab booking must not fail
        // just because payment/wallet quote is temporarily unavailable.
        if (active) setQuote(null)
      })
    return () => {
      active = false
    }
  }, [labBookingAmountInr])

  async function confirmBooking(paymentMethod: "CASHFREE" | "COD") {
    setPhase("processing")
    setErrorMessage("")

    const companyReference = companySession?.companyId ?? "astikan-demo-company"
    const companyName = companySession?.companyName ?? "Astikan"
    let actor: LabUserActor = fallbackActorFromSession({
      companyReference,
      fullName: employeeName,
      email: employeeEmail,
      phone: employeePhone,
    })

    let effectivePaymentMethod: "CASHFREE" | "COD" = paymentMethod
    let transactionId = ""
    let cashfreeOrderId: string | null = null
    let onlinePaymentInr = 0
    let walletUsedInr = 0
    let paymentNote = paymentMethod === "COD" ? "Pay after collection" : "Online payment requested"

    try {
      if (paymentMethod === "CASHFREE") {
        try {
          actor = await ensureUserActor({
            companyReference,
            companyName,
            fullName: employeeName,
            handle: employeeHandle,
            email: employeeEmail,
            phone: employeePhone,
          })

          const payment = await initiatePayment({
            serviceType: "lab",
            amountInr: labBookingAmountInr,
            paymentMethod,
            employeeId: actor.userId || actor.employeeUserId,
            companyId: actor.companyId || companyReference,
            metadata: {
              employeeName,
              employeeEmail: actor.email || employeeEmail,
              employeePhone: actor.phone ?? employeePhone,
              companyName,
              testName: selectedTest,
            },
          })
          transactionId = payment.transactionId
          cashfreeOrderId = payment.cashfreeOrderId ?? null
          walletUsedInr = 0
          onlinePaymentInr = labBookingAmountInr
          if (!payment.paymentSessionId) {
            throw new Error("Payment gateway did not return a checkout session.")
          }
          const checkout = await openCashfreeCheckout(payment.paymentSessionId, payment.cashfreeOrderId)
          if (checkout.state !== "SUCCESS") {
            await waitForPaymentStatus(transactionId, cashfreeOrderId, null)
          }
          paymentNote = "Online payment completed"
        } catch (paymentError) {
          throw paymentError instanceof Error ? paymentError : new Error("Payment could not be completed right now.")
        }
      }

      const response = await bookLabOrder({
        companyReference: actor.companyId || companyReference,
        companyName,
        email: actor.email || employeeEmail,
        customer_name: employeeName,
        mobile: actor.phone ?? employeePhone,
        address: collectionAddress,
        pincode: addressPincode,
        test_name: selectedTest,
        lab_test_catalog_id: state?.selectedTest?.id,
        test_id: state?.selectedTest?.code ?? state?.selectedTest?.id,
        testid: state?.selectedTest?.code ?? state?.selectedTest?.id,
        test_code: state?.selectedTest?.code,
        provider_test_code: state?.selectedTest?.code,
        test_parameter: state?.selectedTest?.name,
        amount: labBookingAmountInr,
        date: state?.date,
        time: state?.time,
        collection_type: collectionType,
        readiness: state?.readiness ?? {},
        patient_notes: [buildPatientNotes(), paymentNote].filter(Boolean).join(" | "),
        walletUsedInr,
        onlinePaymentInr,
        paymentMethod: effectivePaymentMethod,
        paymentStatus: effectivePaymentMethod === "COD" ? "PAY_AFTER_COLLECTION" : "PAID",
        paymentTransactionId: transactionId || undefined,
        cashfreeOrderId: cashfreeOrderId || undefined,
      })
      const ref =
        (response?.providerReference as string | undefined) ??
        (response?.reference_id as string | undefined) ??
        (response?.order_id as string | undefined) ??
        (response?.localOrderId as string | undefined)
      if (response?.success && ref) {
        const bookingIdValue = displayLabBookingId(String(ref))
        const localOrderId =
          (response?.localOrderId as string | undefined) ?? bookingIdValue
        const status = String(response?.providerStatus ?? "created")
        const scheduledAtValue = state?.date
          ? new Date(dateTime).toISOString()
          : new Date().toISOString()
        void status
        void scheduledAtValue
        if (transactionId) {
          void verifyPayment(transactionId, cashfreeOrderId, localOrderId).catch(() => undefined)
        }
        const audio = successAudioRef.current ?? new Audio(successSound)
        audio.volume = 0.6
        audio.currentTime = 0
        successAudioRef.current = audio
        audio.play().catch(() => undefined)
        setBookingId(bookingIdValue)
        setBookingReference(localOrderId)
        if (paymentMethod === "CASHFREE" && paymentNote.includes("could not start")) {
          setErrorMessage(paymentNote)
        }
        setPhase("confirmed")
        // No preferred collection-window popup after booking. Tracking/admin handles the next steps.
      } else {
        setErrorMessage(SAFE_BOOKING_ERROR)
        const audio = failedAudioRef.current ?? new Audio(failedSound)
        audio.volume = 0.6
        audio.currentTime = 0
        failedAudioRef.current = audio
        audio.play().catch(() => undefined)
        setPhase("failed")
      }
    } catch (error) {
      setErrorMessage(safeLabBookingError(error))
      const audio = failedAudioRef.current ?? new Audio(failedSound)
      audio.volume = 0.6
      audio.currentTime = 0
      failedAudioRef.current = audio
      audio.play().catch(() => undefined)
      setPhase("failed")
    }
  }

  return (
    <div className="lab-page lab-page--confirm">
      <div className="lab-header">
        <button className="lab-back" onClick={() => goBackOrFallback(navigate)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>Lab Test</h1>
          <p>Book tests & get reports online</p>
        </div>
      </div>

      <div className="lab-steps">
        <div className="step done">1. Readiness</div>
        <span>-</span>
        <div className="step done">2. Location</div>
        <span>-</span>
        <div className="step active">3. Confirm</div>
      </div>

      {phase === "ready" ? (
        <>
          <div className="detail-box">
            <h3>Payment Summary</h3>
            <div className="detail-item">
              <RiTestTubeLine />
              <div>
                <span>Test</span>
                <strong>{selectedTest}</strong>
              </div>
            </div>
            <div className="detail-item">
              <FiMapPin />
              <div>
                <span>Collection Type</span>
                <strong>{collectionType}</strong>
              </div>
            </div>
            <div className="detail-item">
              <FiMapPin />
              <div>
                <span>Collection Address</span>
                <strong>{collectionAddress}</strong>
              </div>
            </div>
            <div className="detail-item">
              <FiFileText />
              <div>
                <span>Contact</span>
                <strong>{employeePhone}</strong>
                <small>{employeeEmail}</small>
              </div>
            </div>
            <div className="detail-item">
              <FiFileText />
              <div>
                <span>Total</span>
                <strong>₹{labBookingAmountInr.toFixed(2)}</strong>
              </div>
            </div>
            <div className="detail-item">
              <FiAlertCircle />
              <div>
                <span>Amount to Pay</span>
                <strong>₹{labBookingAmountInr.toFixed(2)}</strong>
                <small>Final payable amount is shown before booking confirmation.</small>
              </div>
            </div>
            <div className="payment-option-grid">
              <button
                type="button"
                disabled={quote ? quote.cashfreeEnabled === false : false}
                className="payment-option-card"
                onClick={() => confirmBooking("CASHFREE")}
              >
                <span className="payment-option-icon payment-option-icon--online"><FiCreditCard /></span>
                <span className="payment-option-copy">
                  <strong>Pay Now (Online)</strong>
                  <small>Secure online payment</small>
                </span>
              </button>
              <button
                type="button"
                disabled={quote ? quote.codEnabled === false : false}
                className="payment-option-card payment-option-card--secondary"
                onClick={() => confirmBooking("COD")}
              >
                <span className="payment-option-icon payment-option-icon--cod"><RiHandCoinLine /></span>
                <span className="payment-option-copy">
                  <strong>Pay After Collection</strong>
                  <small>Pay after your sample is collected</small>
                </span>
              </button>
            </div>
            {errorMessage && <div className="confirm-error">{errorMessage}</div>}
          </div>
        </>
      ) : phase === "processing" ? (
        <div className="confirm-top processing">
          <div className="processing-ring">
            <span />
          </div>
          <h2>Processing Booking...</h2>
          <p>Please wait while we confirm your lab appointment</p>
        </div>
      ) : phase === "confirmed" ? (
        <>
          <div className="confirm-top">
            <div className="confirm-check confirm-check--success">
              <span className="confirm-check-inner">
                <FiCheck />
              </span>
            </div>
            <h2>Booking Confirmed!</h2>
            <p>Your lab test has been booked successfully</p>
            {errorMessage ? <p className="confirm-soft-note">{errorMessage}</p> : null}
          </div>

          <div className="detail-box">
            <h3>Booking Detail</h3>

            <div className="detail-item">
              <FiMapPin />
              <div>
                <span>Collection Type</span>
                <strong>{collectionType}</strong>
              </div>
            </div>

          <div className="detail-item">
            <RiTestTubeLine />
            <div>
              <span>Tests Selected</span>
              <strong>{selectedTest}</strong>
            </div>
          </div>

          {bookingId && (
            <div className="detail-item">
              <FiFileText />
              <div>
                <span>Booking ID</span>
                <strong>{bookingId}</strong>
              </div>
            </div>
          )}
        </div>

          <div className="bottom-buttons single">
            <button className="btn-primary" onClick={() => navigate(`/lab-tests/track/${bookingReference || bookingId}`)} type="button">
              Track Status
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="confirm-top">
            <div className="confirm-check confirm-check--pending">
              <span className="confirm-check-inner">
                <FiAlertCircle />
              </span>
            </div>
            <h2>Payment / Booking Pending</h2>
            <p>{errorMessage || "We couldn't confirm the booking yet. Please try again in a moment."}</p>
            <p>Choose Retry Payment or continue with Pay After Collection.</p>
          </div>
          <div className="bottom-buttons">
            <button className="btn-primary" type="button" onClick={() => confirmBooking("CASHFREE")}>Retry Payment</button>
            <button className="btn-secondary" type="button" onClick={() => confirmBooking("COD")}>Pay After Collection</button>
          </div>
        </>
      )}
    </div>
  )
}
