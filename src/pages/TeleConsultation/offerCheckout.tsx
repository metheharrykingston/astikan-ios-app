import { useMemo, useState } from "react"
import {
  FiActivity,
  FiArrowLeft,
  FiClipboard,
  FiCoffee,
  FiCreditCard,
  FiFileText,
  FiLock,
  FiUploadCloud,
  FiZap,
} from "react-icons/fi"
import { useLocation, useNavigate } from "react-router-dom"
import { getEmployeeAuthSession } from "../../services/authApi"
import { initiatePayment, openCashfreeCheckout, verifyPayment } from "../../services/paymentsApi"
import { getTeleconsultPaidAccessStatus } from "../../services/teleconsultPaidApi"
import { goBackOrFallback } from "../../utils/navigation"
import "./tele-offer-checkout.css"

type OfferCheckoutState = {
  feelingId?: string
  source?: "banner" | "feeling-card"
  continueRoute?: string
  continueState?: Record<string, unknown>
}

const CONSULT_PRICE_INR = 49
const CONSULT_DURATION_MINUTES = 15

const includedItems = [
  { title: "Instant Doctor Access", icon: FiZap, tone: "mint" },
  { title: "Symptom Guidance", icon: FiActivity, tone: "peach" },
  { title: "Lab Test Support", icon: FiClipboard, tone: "blue" },
  { title: "Medicine Prescription", icon: FiFileText, tone: "purple" },
  { title: "Diet Planning", icon: FiCoffee, tone: "mint" },
  { title: "Insurance Assistance", icon: FiUploadCloud, tone: "mint" },
  { title: "Finance Support", icon: FiCreditCard, tone: "blue" },
  { title: "Health Document Guidance", icon: FiFileText, tone: "peach", wide: true },
] as const

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export default function TeleOfferCheckout() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as OfferCheckoutState | undefined) ?? undefined
  const authSession = getEmployeeAuthSession()
  const [isPaying, setIsPaying] = useState(false)
  const [errorText, setErrorText] = useState("")

  const sourceLabel = useMemo(() => (state?.source === "feeling-card" ? "Feeling Doctor Access" : "Featured Doctor Consult"), [state?.source])

  async function handlePayNow() {
    if (isPaying) return
    setIsPaying(true)
    setErrorText("")
    try {
      const payment = await initiatePayment({
        serviceType: "teleconsult",
        amountInr: CONSULT_PRICE_INR,
        paymentMethod: "CASHFREE",
        metadata: {
          offerCode: "teleconsult_49",
          source: state?.source ?? "banner",
          feelingId: state?.feelingId ?? null,
          consultDurationMinutes: CONSULT_DURATION_MINUTES,
          employeeName: authSession?.fullName ?? "Astikan Employee",
          employeeEmail: authSession?.email ?? "employee@astikan.local",
          employeePhone: authSession?.phone ?? "9999999999",
        },
      })
      if (!payment.paymentSessionId) {
        throw new Error("Payment session could not be created right now.")
      }
      await openCashfreeCheckout(payment.paymentSessionId, payment.cashfreeOrderId)

      let paidStatus = await getTeleconsultPaidAccessStatus().catch(() => ({
        unlocked: false,
        availablePasses: 0,
        consultationMinutes: CONSULT_DURATION_MINUTES,
      }))

      let verificationStatus = ""
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const verification = await verifyPayment(payment.transactionId, payment.cashfreeOrderId ?? null, null)
        verificationStatus = String(verification.paymentStatus ?? "").trim().toUpperCase()
        if (verificationStatus === "SUCCESS" || verificationStatus === "PAID") {
          break
        }
        await sleep(1800)
        paidStatus = await getTeleconsultPaidAccessStatus().catch(() => paidStatus)
        if (paidStatus.availablePasses > 0) {
          verificationStatus = "SUCCESS"
          break
        }
      }

      if (verificationStatus !== "SUCCESS" && verificationStatus !== "PAID" && paidStatus.availablePasses <= 0) {
        throw new Error("Payment is still verifying. Please wait a few seconds and try again.")
      }

      if (paidStatus.availablePasses <= 0) {
        paidStatus = await getTeleconsultPaidAccessStatus().catch(() => ({
          unlocked: true,
          availablePasses: 1,
          consultationMinutes: CONSULT_DURATION_MINUTES,
        }))
      }

      navigate(state?.continueRoute ?? "/home", {
        replace: true,
        state: {
          ...(state?.continueState ?? {}),
          teleconsultPaidUnlocked: true,
          paidUnlocked: true,
          paidConsultPasses: paidStatus.availablePasses,
          autoStartCall: true,
          sessionDurationMinutes: paidStatus.consultationMinutes || CONSULT_DURATION_MINUTES,
          paidSessionExpiresAt: new Date(
            Date.now() + (paidStatus.consultationMinutes || CONSULT_DURATION_MINUTES) * 60 * 1000,
          ).toISOString(),
        } as Record<string, unknown>,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment could not be completed right now."
      setErrorText(message.toLowerCase().includes("payment not completed") ? "Payment was not completed, so your ₹49 doctor consultation was not activated." : message)
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <main className="tele-offer-page app-page-enter">
      <header className="tele-offer-header app-fade-stagger">
        <div className="tele-offer-header-inner">
          <button className="tele-offer-back app-pressable" type="button" onClick={() => goBackOrFallback(navigate)} aria-label="Back">
            <FiArrowLeft />
          </button>
          <div className="tele-offer-title-wrap">
            <h1>Teleconsultation</h1>
            <p>Doctor Consultation at Just ₹49</p>
          </div>
        </div>
      </header>

      <section className="tele-offer-shell app-content-slide">
        <section className="tele-offer-hero app-fade-stagger">
          <img src="/assets/reference-ui/tele-offer-doctor-banner-v2.png" alt={`${sourceLabel} doctor consult offer`} className="tele-offer-hero-frame" />
        </section>

        <section className="tele-offer-included app-fade-stagger" aria-label="Teleconsultation benefits">
          <div className="tele-offer-feature-grid">
            {includedItems.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className={`tele-offer-feature-card ${item.tone}${"wide" in item && item.wide ? " wide" : ""}`}>
                  <span><Icon /></span>
                  <strong>{item.title}</strong>
                </article>
              )
            })}
          </div>
        </section>

        {errorText ? <p className="tele-offer-error app-fade-stagger">{errorText}</p> : null}
      </section>

      <footer className="tele-offer-footer app-fade-stagger">
        <div className="tele-offer-footer-inner">
          <button className="tele-offer-primary app-pressable" type="button" onClick={handlePayNow} disabled={isPaying}>
            <FiLock />
            {isPaying ? "Opening payment..." : `Start Consultation — ₹${CONSULT_PRICE_INR}`}
          </button>
        </div>
      </footer>
    </main>
  )
}
