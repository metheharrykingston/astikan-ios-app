import { useEffect, useMemo, useState } from "react"
import { FiArrowLeft } from "react-icons/fi"
import { useLocation, useNavigate } from "react-router-dom"
import { consumeVoiceAutomation, subscribeVoiceAutomation } from "../../app/voiceAutomation"
import type { ReadinessQuestion } from "../../services/aiApi"
import { buildStaticReadinessQuestions } from "../../services/labApi"
import "./labtest.css"

type LabTestItem = {
  id: string
  color: "red" | "blue" | "gray" | "green" | "outline"
  name: string
  desc: string
  tag: string
  duration: string
  fasting: string
  quick?: string
  code?: string
}

type ReadinessState = {
  [questionId: string]: "yes" | "no"
}

export default function LabReadinessStep() {
  const navigate = useNavigate()
  const { state } = useLocation() as {
    state?: {
      selectedTest?: LabTestItem
      readinessQuestions?: ReadinessQuestion[]
    }
  }
  const selectedTest = state?.selectedTest
  const [questions, setQuestions] = useState<ReadinessQuestion[]>(state?.readinessQuestions ?? [])
  const [answers, setAnswers] = useState<ReadinessState>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const staticQuestions = state?.readinessQuestions?.length
      ? state.readinessQuestions
      : buildStaticReadinessQuestions(selectedTest?.name ?? "Lab Test", selectedTest?.fasting ?? "")
    setQuestions(staticQuestions)
    setLoading(false)
  }, [selectedTest?.fasting, selectedTest?.name, state?.readinessQuestions])

  const currentQuestion = useMemo(
    () => (questions.length > 0 ? questions[currentIndex] : null),
    [currentIndex, questions]
  )

  function onAnswer(value: "yes" | "no") {
    if (!currentQuestion) return
    const nextAnswers = { ...answers, [currentQuestion.id]: value }
    setAnswers(nextAnswers)

    if (currentIndex >= questions.length - 1) {
      navigate("/lab-tests/location", {
        state: {
          selectedTest,
          readinessQuestions: questions,
          readiness: nextAnswers,
        },
      })
      return
    }

    setCurrentIndex((prev) => prev + 1)
  }

  useEffect(() => {
    function applyVoiceAnswer() {
      const command = consumeVoiceAutomation("lab-readiness-answer")
      if (!command) return
      onAnswer(command.payload.answer)
    }

    applyVoiceAnswer()
    return subscribeVoiceAutomation(applyVoiceAnswer)
  }, [currentQuestion, currentIndex, answers, questions, selectedTest])

  return (
    <div className="lab-page readiness-page">
      <div className="lab-header">
        <button
          className="lab-back"
          onClick={() => (currentIndex === 0 ? navigate(-1) : setCurrentIndex((prev) => Math.max(0, prev - 1)))}
          type="button"
          aria-label="Back"
        >
          <FiArrowLeft />
        </button>
        <div>
          <h1>Lab Test Booking</h1>
          <p>Quick check before we continue</p>
        </div>
      </div>

      <div className="lab-steps">
        <div className="step active">1. Readiness</div>
        <span>-</span>
        <div className="step pending">2. Location</div>
        <span>-</span>
        <div className="step pending">3. Confirm</div>
      </div>

      <section className="readiness-wrap">
        <p className="readiness-top-note">Just to help your test go smoothly</p>

        {loading ? (
          <div className="lab-loading-wrap readiness-loading-shell" aria-live="polite" aria-label="Loading">
            <span className="lab-loading-spinner" />
          </div>
        ) : currentQuestion ? (
          <article className="readiness-slide readiness-single">
            <h2>{currentQuestion.question}</h2>
            <p>Step {currentIndex + 1} of {questions.length}</p>
            <div className="choice-stack">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`choice-btn choice-btn-lg ${answers[currentQuestion.id] === option.value ? "active" : ""}`}
                  onClick={() => onAnswer(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </article>
        ) : (
          <article className="readiness-slide readiness-single">
            <h2>Could not load readiness questions</h2>
            <p>Please go back and try again.</p>
          </article>
        )}
      </section>
    </div>
  )
}
