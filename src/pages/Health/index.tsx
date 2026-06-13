import { useEffect, useMemo, useState } from "react"
import {
  FiActivity,
  FiArrowLeft,
  FiDroplet,
  FiHeart,
  FiMoon,
  FiSmile,
  FiZap,
} from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import { getLatestVital } from "../../services/vitalsApi"
import { goBackOrFallback } from "../../utils/navigation"
import AppBottomNav from "../../components/AppBottomNav"
import "./health.css"

type Range = "Day" | "Week" | "Month" | "Year"
const ritualTips = [
  {
    title: "Morning Breath",
    body: "Take 5 slow breaths before checking your phone. It steadies your pulse and clears your head.",
    icon: <FiSmile />,
  },
  {
    title: "Hydration Break",
    body: "Finish one glass of water before lunch. Small hydration wins keep dizziness and fatigue lower.",
    icon: <FiDroplet />,
  },
  {
    title: "Evening Unwind",
    body: "Dim lights 30 mins before sleep and keep the room quiet. Your body settles faster that way.",
    icon: <FiMoon />,
  },
]


type MetricId = "heart-rate" | "blood-pressure" | "calories" | "sugar"

const metrics: Array<{ id: MetricId; title: string; value: string; unit: string; status: string; age: string; tone: "red" | "blue" | "green" | "orange"; icon: React.ReactElement }> = [
  { id: "heart-rate", title: "Heart Rate", value: "72", unit: "bpm", status: "normal", age: "2 hours ago", tone: "red", icon: <FiHeart /> },
  { id: "blood-pressure", title: "Blood Pressure", value: "120/80", unit: "mmHg", status: "normal", age: "4 hours ago", tone: "blue", icon: <FiActivity /> },
  { id: "calories", title: "Calories", value: "1850", unit: "kcal", status: "on track", age: "today", tone: "orange", icon: <FiZap /> },
  { id: "sugar", title: "Sugar Count", value: "110", unit: "mg/dL", status: "normal", age: "today", tone: "green", icon: <FiDroplet /> },
]

export default function Health() {
  const navigate = useNavigate()
  const [range, setRange] = useState<Range>("Day")
  const [heartRate, setHeartRate] = useState<{ value: number | null; eventAt?: string } | null>(null)
  const [sugar, setSugar] = useState<{ value: number | null; eventAt?: string } | null>(null)
  const [bp, setBp] = useState<{ sys: number | null; dia: number | null; eventAt?: string } | null>(null)
  const [calorieTotal, setCalorieTotal] = useState(0)


  useEffect(() => {
    const todayKey = new Date().toISOString().slice(0, 10)
    const mealStorageKey = `calorie_meals_${todayKey}`
    const raw = localStorage.getItem(mealStorageKey)
    if (!raw) {
      setCalorieTotal(0)
      return
    }
    try {
      const parsed = JSON.parse(raw) as Array<{ calories?: number }>
      const total = parsed.reduce((sum, item) => sum + (Number(item.calories) || 0), 0)
      setCalorieTotal(total)
    } catch {
      setCalorieTotal(0)
    }
  }, [])

  useEffect(() => {
    let active = true
    const loadVitals = async () => {
      try {
        const [latestHr, latestSugar, latestSys, latestDia] = await Promise.all([
          getLatestVital("heart_rate"),
          getLatestVital("blood_sugar"),
          getLatestVital("blood_pressure_sys"),
          getLatestVital("blood_pressure_dia"),
        ])
        if (!active) return
        setHeartRate({
          value: typeof latestHr?.value === "number" ? latestHr.value : null,
          eventAt: latestHr?.eventAt,
        })
        setSugar({
          value: typeof latestSugar?.value === "number" ? latestSugar.value : null,
          eventAt: latestSugar?.eventAt,
        })
        if (typeof latestSys?.value === "number" && typeof latestDia?.value === "number") {
          const sysEventAt = typeof latestSys?.eventAt === "string" ? latestSys.eventAt : undefined
          const diaEventAt = typeof latestDia?.eventAt === "string" ? latestDia.eventAt : undefined
          setBp({
            sys: latestSys.value,
            dia: latestDia.value,
            eventAt: sysEventAt ?? diaEventAt,
          })
        }
      } catch {
        // keep page usable even if vitals fail
      }
    }
    void loadVitals()
    return () => {
      active = false
    }
  }, [])

  function onPageScroll(_e: React.UIEvent<HTMLElement>) {
    // global bottom nav is fixed; no per-page docking needed
  }

  const formatAge = (eventAt?: string) => {
    if (!eventAt) return "No reading yet"
    const ts = Date.parse(eventAt)
    if (Number.isNaN(ts)) return "Recently"
    const diffMin = Math.max(0, Math.floor((Date.now() - ts) / 60000))
    if (diffMin < 1) return "Just now"
    if (diffMin < 60) return `${diffMin} mins ago`
    const hours = Math.floor(diffMin / 60)
    if (hours < 24) return `${hours} hours ago`
    const days = Math.floor(hours / 24)
    return `${days} days ago`
  }

  const metricCards = useMemo(() => {
    return metrics.map((item) => {
      if (item.id !== "heart-rate") return item
      const value = heartRate?.value
      const status = typeof value === "number"
        ? value > 100
          ? "high"
          : value < 55
            ? "low"
            : "normal"
        : item.status
      return {
        ...item,
        value: typeof value === "number" ? String(Math.round(value)) : item.value,
        age: heartRate?.eventAt ? formatAge(heartRate.eventAt) : item.age,
        status,
      }
    })
  }, [heartRate])

  const metricCardsWithBp = useMemo(() => {
    if (!bp) return metricCards
    return metricCards.map((item) => {
      if (item.id !== "blood-pressure") return item
      const sys = bp.sys
      const dia = bp.dia
      if (typeof sys !== "number" || typeof dia !== "number") return item
      const status = sys >= 140 || dia >= 90 ? "high" : sys < 90 || dia < 60 ? "low" : "normal"
      return {
        ...item,
        value: `${Math.round(sys)}/${Math.round(dia)}`,
        age: bp.eventAt ? formatAge(bp.eventAt) : item.age,
        status,
      }
    })
  }, [bp, metricCards])

  const metricCardsWithVitals = useMemo(() => {
    const withCalories = metricCardsWithBp.map((item) => {
      if (item.id !== "calories") return item
      return {
        ...item,
        value: calorieTotal ? String(calorieTotal) : "0",
        age: calorieTotal ? "today" : "No meals yet",
        status: calorieTotal >= 1200 && calorieTotal <= 2400 ? "on track" : calorieTotal > 0 ? "check" : item.status,
      }
    })

    if (!sugar) return withCalories
    return withCalories.map((item) => {
      if (item.id !== "sugar") return item
      const value = sugar.value
      const status = typeof value === "number"
        ? value > 180
          ? "high"
          : value < 70
            ? "low"
            : "normal"
        : item.status
      return {
        ...item,
        value: typeof value === "number" ? String(Math.round(value)) : item.value,
        age: sugar.eventAt ? formatAge(sugar.eventAt) : item.age,
        status,
        unit: "mg/dL",
      }
    })
  }, [calorieTotal, metricCardsWithBp, sugar])

  return (
    <main className="health-screen app-page-enter" onScroll={onPageScroll}>
      <header className="health-header app-fade-stagger">
        <button className="health-back app-pressable" onClick={() => goBackOrFallback(navigate)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>HEALTH</h1>
        </div>
      </header>
      <AppBottomNav />

      <section className="health-content app-content-slide">
        <section className="range-tabs app-fade-stagger">
          {(["Day", "Week", "Month", "Year"] as const).map((tab) => (
            <button key={tab} className={`app-pressable ${range === tab ? "active" : ""}`} onClick={() => setRange(tab)} type="button">
              {tab}
            </button>
          ))}
        </section>

        <section className="metric-grid app-fade-stagger">
          {metricCardsWithVitals.map((item) => (
            <article
              key={item.title}
              className={`metric-card ${item.tone} app-pressable`}
            >
              <div className="metric-top">
                <span className={`metric-icon ${item.tone === "red" ? "pulse-heart" : "pulse-gentle"}`}>{item.icon}</span>
                <div className="metric-badge-pack">
                  <span className="status">{item.status}</span>
                </div>
              </div>
              <p className="metric-value">
                {item.value}
                <span>{item.unit}</span>
              </p>
              <h4>{item.title}</h4>
              <p className="metric-age">{item.age}</p>
              <div className="metric-bars" aria-hidden="true">
                {Array.from({ length: 7 }).map((_, index) => (
                  <span key={`${item.title}-${index}`} style={{ animationDelay: `${index * 90}ms` }} />
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="health-section app-fade-stagger">
          <h3>Daily Rituals</h3>
          <div className="ritual-tip-list">
            {ritualTips.map((item) => (
              <article className="ritual-tip-card" key={item.title}>
                <div className="ritual-tip-head">
                  <span>{item.icon}</span>
                  <strong>{item.title}</strong>
                </div>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

      </section>
    </main>
  )
}
