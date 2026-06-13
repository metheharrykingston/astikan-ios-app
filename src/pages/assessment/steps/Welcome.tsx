import { useEffect } from "react"
import AssessmentLayout from "../layout"

type Props = {
  onNext: () => void
}

export default function Welcome({ onNext }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(() => onNext(), 1600)
    return () => window.clearTimeout(timer)
  }, [onNext])

  return (
    <AssessmentLayout step={1} totalSteps={4} onNext={onNext} showNext={false}>
      <div className="welcome-step animate-in">
        <div className="pulse-circle">
          <img src="/logo.png" alt="Astikan" />
        </div>

        <h1>Let's understand your health</h1>
        <p>
          This takes about 2 minutes and helps us personalise your
          health insights.
        </p>
        <div className="welcome-loader" aria-hidden="true">
          <span />
        </div>
      </div>
    </AssessmentLayout>
  )
}
