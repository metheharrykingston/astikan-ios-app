import { useState } from "react"
import { FiArrowLeft } from "react-icons/fi"
import { useLocation, useNavigate } from "react-router-dom"
import "./labtest.css"

type LabTestItem = {
  id: string
  color: "red" | "blue" | "gray" | "green" | "outline"
  name: string
  desc: string
  code?: string
  tag?: string
  duration?: string
  fasting?: string
}

const TIMES = ["6:00 AM", "8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"]

function formatDateLabel(date: Date) {
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (sameDay) return "Today"
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow"
  return date.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" })
}

function buildDateOptions() {
  const options: Array<{ label: string; value: string }> = []
  const today = new Date()
  for (let i = 0; i < 4; i += 1) {
    const next = new Date(today)
    next.setDate(today.getDate() + i)
    options.push({
      label: formatDateLabel(next),
      value: next.toISOString().slice(0, 10),
    })
  }
  return options
}

export default function LabScheduleLater() {
  const navigate = useNavigate()
  const { state } = useLocation() as {
    state?: {
      selectedTest?: LabTestItem
      collectionType?: string
      address?: string
      readinessQuestions?: Array<{ id: string; question: string; options: Array<{ value: string; label: string }> }>
      readiness?: Record<string, "yes" | "no">
    }
  }
  const dateOptions = buildDateOptions()
  const [date, setDate] = useState(dateOptions[1]?.value ?? dateOptions[0]?.value ?? "")
  const [time, setTime] = useState("10:00 AM")

  const test =
    state?.selectedTest ??
    ({
      id: "cbc",
      color: "red",
      name: "Complete Blood Count (CBC)",
      desc: "Comprehensive blood analysis",
    } as LabTestItem)

  return (
    <div className="lab-page">
      <div className="lab-header">
        <button className="lab-back" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>Lab Test Booking</h1>
          <p>Book tests & get reports online</p>
        </div>
      </div>

      <div className="lab-steps">
        <div className="step done">1. Tests</div>
        <span>-</span>
        <div className="step done">2. Location</div>
        <span>-</span>
        <div className="step active">3. Schedule</div>
        <span>-</span>
        <div className="step pending">4. Confirm</div>
      </div>

      <div className="lab-test-card static-card" role="presentation">
        <div className={`lab-icon ${test.color}`} />
        <div className="lab-info">
          <h3>{test.name}</h3>
          <p>{test.desc}</p>
          <div className="lab-meta-row">
            <span className="pill">{test.tag ?? "Blood Test"}</span>
            <span>{test.duration ?? "15 mins test"}</span>
          </div>
          <div className="lab-meta-row muted">
            <span>{test.fasting ?? "No fasting required"}</span>
          </div>
        </div>
      </div>

      <div className="schedule-box">
        <h2>Select Date & Time</h2>

        <p className="label">Preferred Date</p>
        <div className="date-grid">
          {dateOptions.map((item) => (
            <button
              key={item.value}
              className={`slot-btn ${date === item.value ? "active" : ""}`}
              onClick={() => setDate(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="label mt">Preferred Time Slot</p>
        <div className="time-grid">
          {TIMES.map((item) => (
            <button
              key={item}
              className={`slot-btn ${time === item ? "active" : ""}`}
              onClick={() => setTime(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="bottom-buttons two">
        <button className="btn-secondary" onClick={() => navigate(-1)} type="button">Back</button>
        <button
          className="btn-primary"
          onClick={() =>
            navigate("/lab-tests/confirm", {
              state: {
                selectedTest: test,
                collectionType: state?.collectionType,
                address: state?.address,
                date,
                time,
                readinessQuestions: state?.readinessQuestions,
                readiness: state?.readiness,
              },
            })
          }
          type="button"
        >
          Schedule Booking
        </button>
      </div>
    </div>
  )
}
