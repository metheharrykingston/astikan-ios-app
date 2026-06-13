import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Capacitor, type PluginListenerHandle } from "@capacitor/core"
import { FirebaseAuthentication } from "@capacitor-firebase/authentication"
import { FcGoogle } from "react-icons/fc"
import { FiArrowLeft, FiArrowRight, FiEdit2, FiLock } from "react-icons/fi"
import { MdPhoneIphone } from "react-icons/md"
import {
  fetchAuthConfig,
  getEmployeeAuthSession,
  loginWithFirebaseGoogle,
  loginWithFirebasePhone,
  loginWithGoogle,
  requestPhoneOtp,
  saveEmployeeAuthSession,
  verifyPhoneOtp,
  type EmployeeLoginResponse,
} from "../../services/authApi"
import "./login.css"

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void
          prompt: () => void
        }
      }
    }
  }
}

const FIREBASE_WEB_CLIENT_ID = "201357365434-es9hpri4pi3c3s2t28oek2918qkdcgpq.apps.googleusercontent.com"
const FALLBACK_GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? FIREBASE_WEB_CLIENT_ID).trim()

function loadGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("Google sign-in failed to load.")), { once: true })
      return
    }
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Google sign-in failed to load."))
    document.head.appendChild(script)
  })
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 10 && digits.length <= 15
}

function toE164Phone(value: string) {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, "")
  if (!digits) return ""
  if (trimmed.startsWith("+")) return `+${digits}`
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  let timer: number | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) window.clearTimeout(timer)
  })
}

async function startWebOtpAutofill(
  onCode: (code: string) => void | Promise<void>,
  signal: AbortSignal,
) {
  if (!("OTPCredential" in window) || !("credentials" in navigator)) return

  try {
    const credential = await navigator.credentials.get({
      otp: { transport: ["sms"] },
      signal,
    } as unknown as CredentialRequestOptions)

    const code = String((credential as { code?: string } | null)?.code ?? "")
      .replace(/\D/g, "")
      .slice(0, 6)

    if (code.length >= 4) await onCode(code)
  } catch (error) {
    const name = error instanceof DOMException ? error.name : ""
    if (name !== "AbortError") console.debug("Web OTP autofill skipped", error)
  }
}

function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "")
  const lower = message.toLowerCase()
  if (lower.includes("no credentials available")) {
    return "No Google account is available on this device. Add an account and try again."
  }
  if (lower.includes("region enabled") || lower.includes("sms unable to be sent")) {
    return "Phone verification is not available in your region yet."
  }
  if (lower.includes("billing_not_enabled")) {
    return "Phone verification requires billing to be enabled for this Firebase project."
  }
  if (
    lower.includes("17028")
    || lower.includes("app_not_authorized")
    || lower.includes("not authorized to use firebase authentication")
  ) {
    return "This Android build is not authorized for phone verification. Please install the latest Astikan build."
  }
  if (lower.includes("network") || lower.includes("timeout") || lower.includes("timed out")) {
    return "The verification request timed out. Check your connection and try again."
  }
  return message && !message.trim().startsWith("{") ? message : "Unable to complete sign-in. Please try again."
}

export default function Login() {
  const navigate = useNavigate()
  const otpInputRef = useRef<HTMLInputElement | null>(null)
  const phoneListenerRefs = useRef<PluginListenerHandle[]>([])

  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [firebaseVerificationId, setFirebaseVerificationId] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleClientId, setGoogleClientId] = useState(FALLBACK_GOOGLE_CLIENT_ID)
  const [error, setError] = useState("")
  const [authStatus, setAuthStatus] = useState("")

  useEffect(() => {
    const session = getEmployeeAuthSession()
    if (session) navigate("/home")
    void fetchAuthConfig()
      .then((config) => {
        if (config.googleClientId) setGoogleClientId(config.googleClientId)
      })
      .catch(() => undefined)
  }, [navigate])

  useEffect(() => {
    return () => {
      phoneListenerRefs.current.forEach((listener) => void listener.remove())
      phoneListenerRefs.current = []
    }
  }, [])

  function finishLogin(session: EmployeeLoginResponse) {
    const token = String(session.accessToken || session.token || "").trim()
    if (!token || !session.userId || session.role !== "user") {
      throw new Error("Astikan login returned an incomplete session. Please try again.")
    }
    saveEmployeeAuthSession(session)
    localStorage.setItem("astikan_assessment_done", "1")
    sessionStorage.setItem("astikan_assessment_done", "1")
    navigate("/home", { replace: true })
  }


  useEffect(() => {
    if (!otpSent || Capacitor.isNativePlatform()) return
    const controller = new AbortController()
    void startWebOtpAutofill(async (code) => {
      setOtp(code)
      setError("")
      setAuthStatus("Auto-verifying OTP...")
      setLoading(true)
      try {
        const session = await verifyPhoneOtp(phone, code)
        finishLogin(session)
      } catch (error) {
        setError(friendlyAuthError(error))
      } finally {
        setLoading(false)
        setAuthStatus("")
      }
    }, controller.signal)
    return () => controller.abort()
  }, [otpSent, phone])

  async function getFirebaseIdToken() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const currentUser = await FirebaseAuthentication.getCurrentUser()
      if (currentUser.user) {
        const { token } = await FirebaseAuthentication.getIdToken({ forceRefresh: true })
        if (token) return token
      }
      await new Promise((resolve) => window.setTimeout(resolve, 300))
    }
    return ""
  }

  async function finishFirebasePhoneLogin() {
    const token = await getFirebaseIdToken()
    if (!token) throw new Error("Firebase did not return a phone verification token.")
    const session = await loginWithFirebasePhone(token)
    finishLogin(session)
  }

  async function finishFirebaseGoogleLogin() {
    const token = await getFirebaseIdToken()
    if (!token) throw new Error("Firebase did not return a Google verification token.")
    const session = await loginWithFirebaseGoogle(token)
    finishLogin(session)
  }

  async function resetPhoneAuthListeners() {
    await Promise.all(phoneListenerRefs.current.map((listener) => listener.remove().catch(() => undefined)))
    phoneListenerRefs.current = []
  }

  async function handleGoogleLogin() {
    if (!Capacitor.isNativePlatform() && !googleClientId) {
      setError("Google sign-in is not configured yet.")
      return
    }
    setError("")
    setAuthStatus("Opening Google sign-in...")
    setGoogleLoading(true)
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          setAuthStatus("Opening Google account...")
          const result = await withTimeout(
            FirebaseAuthentication.signInWithGoogle(),
            30000,
            "Google sign-in did not finish. Please select an account and try again.",
          )
          if (!result.user) throw new Error("Google authenticated but Firebase did not return a user.")
          setAuthStatus("Signing you into Astikan...")
          await withTimeout(
            finishFirebaseGoogleLogin(),
            20000,
            "Astikan could not finish Google login. Please check your connection and retry.",
          )
          return
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error || "")
          if (/SIGN_IN_CANCELED|cancel/i.test(message)) {
            setError("Google sign-in was cancelled.")
          } else {
            setError(friendlyAuthError(error))
          }
          console.error("Native Google sign-in failed", error)
        } finally {
          setGoogleLoading(false)
          setAuthStatus("")
        }
        return
      }
      await loadGoogleIdentityScript()
      window.google?.accounts?.id?.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            if (!response.credential) throw new Error("Google did not return a sign-in credential.")
            const session = await loginWithGoogle(response.credential)
            finishLogin(session)
          } catch (googleError) {
            setError(googleError instanceof Error ? googleError.message : "Google sign-in failed.")
          } finally {
            setGoogleLoading(false)
          }
        },
      })
      window.google?.accounts?.id?.prompt()
      window.setTimeout(() => setGoogleLoading(false), 7000)
    } catch (loadError) {
      setGoogleLoading(false)
      setAuthStatus("")
      setError(loadError instanceof Error ? loadError.message : "Google sign-in failed.")
    }
  }

  async function handleRequestOtp() {
    if (!isValidPhone(phone)) {
      setError("Enter a valid phone number")
      return
    }
    setError("")
    setAuthStatus("Requesting verification code...")
    setLoading(true)
    try {
      if (Capacitor.isNativePlatform()) {
        setAuthStatus("Starting phone verification. Complete the security check if it opens...")
        await resetPhoneAuthListeners()
        let resolvePhoneAttempt: (() => void) | undefined
        let rejectPhoneAttempt: ((error: Error) => void) | undefined
        const phoneAttempt = new Promise<void>((resolve, reject) => {
          resolvePhoneAttempt = resolve
          rejectPhoneAttempt = reject
        })
        const codeSent = await FirebaseAuthentication.addListener("phoneCodeSent", (event) => {
          setFirebaseVerificationId(event.verificationId)
          setOtp("")
          setOtpSent(true)
          setLoading(false)
          setAuthStatus("")
          resolvePhoneAttempt?.()
          window.setTimeout(() => otpInputRef.current?.focus(), 250)
        })
        const verificationCompleted = await FirebaseAuthentication.addListener("phoneVerificationCompleted", () => {
          setAuthStatus("Auto-verifying phone...")
          resolvePhoneAttempt?.()
          void finishFirebasePhoneLogin()
            .then(() => resetPhoneAuthListeners())
            .catch((error) => {
              setError(friendlyAuthError(error))
            })
            .finally(() => {
              setLoading(false)
              setAuthStatus("")
            })
        })
        const verificationFailed = await FirebaseAuthentication.addListener("phoneVerificationFailed", (event) => {
          rejectPhoneAttempt?.(new Error(event.message || "Firebase phone verification failed."))
        })
        phoneListenerRefs.current = [codeSent, verificationCompleted, verificationFailed]
        await FirebaseAuthentication.signInWithPhoneNumber({
          phoneNumber: toE164Phone(phone),
          timeout: 30,
        })
        await withTimeout(
          phoneAttempt,
          60000,
          "Firebase SMS verification timed out.",
        )
        return
      }
      await requestPhoneOtp(phone)
      setOtpSent(true)
      window.setTimeout(() => otpInputRef.current?.focus(), 250)
    } catch (error) {
      setError(friendlyAuthError(error))
    } finally {
      setLoading(false)
      setAuthStatus((current) => current === "Requesting verification code..." ? "" : current)
    }
  }

  async function handleVerifyOtp() {
    if (!isValidPhone(phone) || otp.replace(/\D/g, "").length !== 6) {
      setError("Enter your phone number and 6 digit code")
      return
    }
    setError("")
    setAuthStatus("Verifying code...")
    setLoading(true)
    try {
      if (Capacitor.isNativePlatform()) {
        if (!firebaseVerificationId) {
          throw new Error("Please request a new Firebase verification code.")
        }
        await FirebaseAuthentication.confirmVerificationCode({
          verificationId: firebaseVerificationId,
          verificationCode: otp.replace(/\D/g, ""),
        })
        await finishFirebasePhoneLogin()
        await resetPhoneAuthListeners()
        return
      }
      const session = await verifyPhoneOtp(phone, otp)
      finishLogin(session)
    } catch (error) {
      setError(friendlyAuthError(error))
    } finally {
      setLoading(false)
      setAuthStatus("")
    }
  }

  if (otpSent) {
    const digits = otp.padEnd(6, " ").slice(0, 6).split("")
    return (
      <main className="login-otp-screen app-page-enter">
        <button className="login-back" type="button" onClick={() => setOtpSent(false)} aria-label="Back"><FiArrowLeft /></button>
        <section className="otp-hero-row">
          <div>
            <h1>Verify your<br />mobile number</h1>
            <p>Enter the 6-digit code sent to</p>
            <button type="button" className="otp-phone-edit" onClick={() => setOtpSent(false)}>{phone || "+91 98765 43210"} <FiEdit2 /></button>
          </div>
          <img src="/assets/consumer-ui/otp-illustration.jpeg" alt="OTP verification" />
        </section>
        <button className="otp-cells" type="button" onClick={() => otpInputRef.current?.focus()} aria-label="Enter OTP">
          {digits.map((digit, index) => <span key={index} className={index === otp.length ? "active" : ""}>{digit.trim() || (index === otp.length ? "|" : "")}</span>)}
        </button>
        <input ref={otpInputRef} className="otp-hidden-input" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
        <p className="otp-resend">Didn’t receive the code? <button type="button" onClick={handleRequestOtp}>Resend in <strong>00:45</strong></button></p>
        <div className="otp-secure-note"><span><FiLock /></span><p>Your verification code is secure and valid for the next 10 minutes.</p></div>
        {authStatus && <p className="login-status-text">{authStatus}</p>}
        {error && <p className="login-error-text">{error}</p>}
        <button className="login-primary-cta otp-submit" type="button" onClick={handleVerifyOtp} disabled={loading}>{loading ? "Verifying..." : "Verify Code"}</button>
        <button className="change-phone" type="button" onClick={() => setOtpSent(false)}>Change phone number</button>
      </main>
    )
  }

  return (
    <main className="login-screen app-page-enter">
      <section className="login-hero-section">
        <div className="login-brand-copy">
          <img className="astikan-heart-logo" src="/logo.png" alt="Astikan" />
          <h1>Astikan</h1>
          <p>Your <strong>health</strong> companion</p>
          <span>Sign in or create an account<br />to continue</span>
        </div>
        <img className="login-main-illustration" src="/assets/consumer-ui/login-illustration.jpeg" alt="Astikan health companion" />
      </section>
      <section className="login-card app-fade-stagger">
        <h2>Welcome! 👋</h2>
        <p>Sign in with your preferred method</p>
        <button className="login-google-btn" onClick={handleGoogleLogin} disabled={googleLoading || loading} type="button"><FcGoogle className="google-mark" aria-hidden="true" />{googleLoading ? "Opening Google..." : "Continue with Google"}</button>
        <div className="login-divider"><span>or</span></div>
        <label htmlFor="login-phone">Phone Number</label>
        <div className="login-input-wrapper"><MdPhoneIphone aria-hidden="true" /><input id="login-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Enter mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} /></div>
        {authStatus && <p className="login-status-text">{authStatus}</p>}
        {error && <p className="login-error-text">{error}</p>}
        <button className="login-primary-cta" onClick={handleRequestOtp} disabled={loading} type="button">{loading ? "Sending..." : <>Send Code <FiArrowRight /></>}</button>
      </section>
      <p className="login-terms">By signing in, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
    </main>
  )
}
