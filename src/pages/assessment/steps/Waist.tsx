import { useState, type CSSProperties } from "react"
import { FiMinus, FiPlus } from "react-icons/fi"
import AssessmentLayout from "../layout"
import { saveHealthMetrics } from "../../../services/healthMetricsApi"

type Props = {
  onNext: () => void
}

const MIN_WAIST = 50
const MAX_WAIST = 150

function clampWaist(value: number) {
  return Math.min(MAX_WAIST, Math.max(MIN_WAIST, value))
}

function cmToInches(cm: number) {
  return cm / 2.54
}

export default function Waist({ onNext }: Props) {
  const [waist, setWaist] = useState(80)
  const progress = ((waist - MIN_WAIST) / (MAX_WAIST - MIN_WAIST)) * 100
  const waistIn = cmToInches(waist)

  const sliderStyle = {
    "--slider-fill": `${progress}%`,
  } as CSSProperties

  async function handleNext() {
    try {
      await saveHealthMetrics({ waistCm: waist })
    } finally {
      onNext()
    }
  }

  return (
    <AssessmentLayout
      step={4}
      totalSteps={4}
      onNext={handleNext}
    >
      <div className="step-container animate-in">
        <h1>Your waist size</h1>
        <p>This helps us understand metabolic health</p>

        <div className="value-display">
          <span className="value">{waistIn.toFixed(1)}</span>
          <span className="unit">in</span>
        </div>
        <p className="helper">({waist} cm)</p>

        <div className="slider-actions">
          <button className="slider-stepper app-pressable" type="button" onClick={() => setWaist((v) => clampWaist(v - 1))} aria-label="decrease waist">
            <FiMinus />
          </button>
          <input
            type="range"
            min={MIN_WAIST}
            max={MAX_WAIST}
            value={waist}
            onChange={(e) => setWaist(Number(e.target.value))}
            className="slider"
            style={sliderStyle}
          />
          <button className="slider-stepper app-pressable" type="button" onClick={() => setWaist((v) => clampWaist(v + 1))} aria-label="increase waist">
            <FiPlus />
          </button>
        </div>

        <div className="slider-scale" aria-hidden="true">
          <span>{MIN_WAIST} cm</span>
          <span>{MAX_WAIST} cm</span>
        </div>

        <p className="helper">
          Measure around your belly button
        </p>
      </div>
    </AssessmentLayout>
  )
}
