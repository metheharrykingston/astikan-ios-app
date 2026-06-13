import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"

import Welcome from "./steps/Welcome"
import Height from "./steps/Height"
import Weight from "./steps/Weight"
import Waist from "./steps/Waist"
import { getHealthMetrics } from "../../services/healthMetricsApi"
import "./assessment.css"

const FINAL_STEP = 4
const ASSESSMENT_DONE_KEY = "astikan_assessment_done"

function markAssessmentDone() {
  localStorage.setItem(ASSESSMENT_DONE_KEY, "1")
  sessionStorage.setItem(ASSESSMENT_DONE_KEY, "1")
}

export default function HealthAssessment() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  useEffect(() => {
    let active = true
    void getHealthMetrics()
      .then((response) => {
        if (!active) return
        const metrics = response.metrics
        const hasBaseline =
          metrics &&
          (typeof metrics.heightCm === "number" ||
            typeof metrics.weightKg === "number" ||
            typeof metrics.waistCm === "number")
        if (hasBaseline) {
          markAssessmentDone()
          navigate("/home")
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [navigate])

  useEffect(() => {
    const sessionDone = sessionStorage.getItem(ASSESSMENT_DONE_KEY)
    const localDone = localStorage.getItem(ASSESSMENT_DONE_KEY)
    if (sessionDone || localDone) {
      if (!sessionDone && localDone) sessionStorage.setItem(ASSESSMENT_DONE_KEY, localDone)
      navigate("/home")
      return
    }

    if (step < FINAL_STEP) return

    const timer = window.setTimeout(() => {
      markAssessmentDone()
      navigate("/home")
    }, 1600)

    return () => window.clearTimeout(timer)
  }, [step, navigate])

  function nextStep() {
    setStep((s) => s + 1)
  }

  switch (step) {
    case 0:
      return <Welcome onNext={nextStep} />
    case 1:
      return <Height onNext={nextStep} />
    case 2:
      return <Weight onNext={nextStep} />
    case 3:
      return <Waist onNext={nextStep} />
    default:
      return (
        <div className="assessment-screen completion-screen app-page-enter">
          <div className="completion-card app-fade-stagger">
            <h1>All set</h1>
            <p>Saving your health baseline and preparing your dashboard.</p>
            <div className="welcome-loader" aria-hidden="true">
              <span />
            </div>
          </div>
        </div>
      )
  }
}
