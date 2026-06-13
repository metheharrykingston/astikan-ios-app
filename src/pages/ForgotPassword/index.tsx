import { useState } from "react"
import {
  FiArrowLeft,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiShield,
} from "react-icons/fi"
import { Link, useNavigate } from "react-router-dom"
import "./forgot.css"

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isStrongPassword(value: string) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value)
}

type Step = "verify" | "reset" | "success"

export default function ForgotPassword() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>("verify")
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function handleVerifyContinue() {
    if (!email) {
      setError("Please enter your email")
      return
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email")
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setError("")
      setStep("reset")
    }, 700)
  }

  function handleResetSubmit() {
    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm the new password")
      return
    }

    if (!isStrongPassword(newPassword)) {
      setError("Password must be at least 8 characters and include letters and numbers")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Confirm password does not match")
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setError("")
      setStep("success")
    }, 900)
  }

  const isVerifyValid = isValidEmail(email)
  const isResetValid = isStrongPassword(newPassword) && confirmPassword === newPassword

  return (
    <div className="forgot-screen app-page-enter">
      <section className="forgot-shell">
        <header className="forgot-hero app-fade-stagger">
          <span className="forgot-chip">
            <FiShield aria-hidden="true" /> Account Recovery
          </span>
          <h1>{step === "verify" ? "Forgot Password" : "Create New Password"}</h1>
          <p>
            {step === "verify" && "Enter your email to verify your account"}
            {step === "reset" && "Create and confirm your new password"}
            {step === "success" && "Password reset completed successfully"}
          </p>
        </header>

        <div className="forgot-card animate-in app-fade-stagger">
          {step === "verify" && (
            <>
              <label htmlFor="forgot-email">Email</label>
              <div className="forgot-input-wrapper">
                <span className="forgot-icon">
                  <FiMail aria-hidden="true" />
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError("")
                  }}
                  disabled={loading}
                />
              </div>

              {error && <p className="forgot-error-text">{error}</p>}

              <button
                className={`forgot-continue-btn app-pressable ${loading ? "loading" : ""}`}
                onClick={handleVerifyContinue}
                disabled={loading || !isVerifyValid}
                type="button"
              >
                {loading ? <span className="loader"></span> : "Continue"}
              </button>
            </>
          )}

          {step === "reset" && (
            <>
              <label htmlFor="new-password">Enter New Password</label>
              <div className="forgot-input-wrapper">
                <span className="forgot-icon">
                  <FiLock aria-hidden="true" />
                </span>
                <input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setError("")
                  }}
                  disabled={loading}
                />
                <button
                  className="forgot-eye"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  type="button"
                  aria-label="Toggle new password visibility"
                >
                  {showNewPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              <label htmlFor="confirm-password">Confirm Password</label>
              <div className="forgot-input-wrapper">
                <span className="forgot-icon">
                  <FiLock aria-hidden="true" />
                </span>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setError("")
                  }}
                  disabled={loading}
                />
                <button
                  className="forgot-eye"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  type="button"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {error && <p className="forgot-error-text">{error}</p>}

              <button
                className={`forgot-continue-btn app-pressable ${loading ? "loading" : ""}`}
                onClick={handleResetSubmit}
                disabled={loading || !isResetValid}
                type="button"
              >
                {loading ? <span className="loader"></span> : "Submit"}
              </button>
            </>
          )}

          {step === "success" && (
            <div className="forgot-success">
              <FiCheckCircle aria-hidden="true" />
              <h2>Password Updated</h2>
              <p>Your password has been reset. You can now sign in with your new password.</p>
              <button className="forgot-continue-btn app-pressable" onClick={() => navigate("/login")} type="button">
                Continue to Login
              </button>
            </div>
          )}

          {step !== "success" && (
            <button
              className="forgot-back app-pressable"
              onClick={() => (step === "verify" ? navigate("/login") : setStep("verify"))}
              type="button"
            >
              <FiArrowLeft aria-hidden="true" />
              {step === "verify" ? "Back to login" : "Back to verification"}
            </button>
          )}
        </div>

        <p className="forgot-terms">
          By signing in, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>
        </p>
      </section>
    </div>
  )
}
