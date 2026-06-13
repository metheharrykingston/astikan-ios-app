import { useEffect, useMemo, useState } from "react"
import {
  FiActivity,
  FiAlertCircle,
  FiArrowLeft,
  FiCloudRain,
  FiDroplet,
  FiHeart,
  FiMoon,
  FiSearch,
  FiSun,
  FiThermometer,
  FiWind,
} from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import { fetchRecentSymptoms, saveRecentSymptom } from "../../services/symptomHistoryApi"
import { fetchWeather, type WeatherSnapshot } from "../../services/weatherApi"
import { goBackOrFallback } from "../../utils/navigation"
import "./ai-symptom-analyser.css"

type Specialty = "Internal Medicine" | "Cardiology" | "Dermatology" | "Pulmonology"

type SymptomCard = {
  id: string
  label: string
  icon: React.ReactNode
  moods?: string[]
  weatherTags?: Array<"hot" | "cold" | "rain" | "air" | "dry" | "humid">
  keywords?: string[]
}

const AI_THREAD_KEY = "employee_ai_thread_id"
const AI_MESSAGE_PREFIX = "employee_ai_thread_messages:"

const baseSymptoms: SymptomCard[] = [
  { id: "fever", label: "Fever", icon: <FiThermometer />, weatherTags: ["hot", "cold"], keywords: ["fever"] },
  { id: "headache", label: "Headache", icon: <FiAlertCircle />, weatherTags: ["hot", "dry"], keywords: ["headache", "migraine"] },
  { id: "dizzy", label: "Dizzy", icon: <FiWind />, weatherTags: ["hot"], keywords: ["dizzy", "vertigo", "lightheaded"] },
  { id: "cough", label: "Cough", icon: <FiCloudRain />, weatherTags: ["cold", "rain", "air"], keywords: ["cough"] },
  { id: "sore-throat", label: "Sore Throat", icon: <FiWind />, weatherTags: ["cold", "air"], keywords: ["throat"] },
  { id: "breath", label: "Breathing", icon: <FiWind />, weatherTags: ["air", "humid"], keywords: ["breath", "asthma"] },
  { id: "chest", label: "Chest Pain", icon: <FiHeart />, keywords: ["chest", "heart"] },
  { id: "fatigue", label: "Fatigue", icon: <FiActivity />, moods: ["fatigue", "stress"], keywords: ["fatigue", "tired", "low energy"] },
  { id: "sleep", label: "Sleep", icon: <FiMoon />, moods: ["sleep"], keywords: ["sleep", "insomnia"] },
  { id: "stress", label: "Anxiety", icon: <FiAlertCircle />, moods: ["stress"], keywords: ["anxious", "panic", "stress"] },
  { id: "nausea", label: "Nausea", icon: <FiDroplet />, keywords: ["nausea", "vomit"] },
  { id: "rash", label: "Skin Rash", icon: <FiSun />, weatherTags: ["hot", "humid"], keywords: ["rash", "itch"] },
]

function inferSpecialty(symptom: string): Specialty {
  const text = symptom.toLowerCase()
  if (text.includes("chest") || text.includes("heart")) return "Cardiology"
  if (text.includes("skin") || text.includes("rash")) return "Dermatology"
  if (text.includes("breath") || text.includes("cough") || text.includes("asthma")) return "Pulmonology"
  return "Internal Medicine"
}

function getRecentUserText() {
  const threadId = localStorage.getItem(AI_THREAD_KEY)
  if (!threadId) return ""
  const raw = localStorage.getItem(`${AI_MESSAGE_PREFIX}${threadId}`)
  if (!raw) return ""
  try {
    const parsed = JSON.parse(raw) as Array<{ from: string; text: string }>
    const lastUser = [...parsed].reverse().find((item) => item.from === "user")
    return lastUser?.text?.toLowerCase() ?? ""
  } catch {
    return ""
  }
}

function getMoodHint(text: string) {
  if (/(stress|anxious|panic|overwhelm|tension)/.test(text)) return "stress"
  if (/(dizz|vertigo|faint|lightheaded)/.test(text)) return "dizzy"
  if (/(sleep|insomnia|tired|night)/.test(text)) return "sleep"
  if (/(fatigue|low energy|weak|drained)/.test(text)) return "fatigue"
  return ""
}

export default function AISymptomAnalyser() {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [recentSymptoms, setRecentSymptoms] = useState<string[]>([])

  useEffect(() => {
    const raw = localStorage.getItem("employee_geo")
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { lat?: number; lon?: number }
      if (!parsed?.lat || !parsed?.lon) return
      fetchWeather(parsed.lat, parsed.lon).then(setWeather).catch(() => setWeather(null))
    } catch {
      setWeather(null)
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchRecentSymptoms(9)
      .then((data) => {
        if (!active) return
        setRecentSymptoms((data.symptoms ?? []).map((item) => item.label).filter(Boolean))
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const smartSymptoms = useMemo(() => {
    const userText = getRecentUserText()
    const mood = getMoodHint(userText)

    const weatherTags: Array<"hot" | "cold" | "rain" | "air" | "dry" | "humid"> = []
    if (weather) {
      if (weather.tempC >= 32) weatherTags.push("hot")
      if (weather.tempC <= 18) weatherTags.push("cold")
      if (weather.condition.toLowerCase().includes("rain")) weatherTags.push("rain")
      if (weather.humidity >= 70) weatherTags.push("humid")
      if (weather.aqi && weather.aqi >= 4) weatherTags.push("air")
      if (weather.humidity <= 35) weatherTags.push("dry")
    }

    const scored = baseSymptoms.map((item) => {
      let score = 0
      if (mood && item.moods?.includes(mood)) score += 4
      if (item.weatherTags?.some((tag) => weatherTags.includes(tag))) score += 3
      if (item.keywords?.some((kw) => userText.includes(kw))) score += 5
      return { ...item, score }
    })

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
  }, [weather])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return smartSymptoms
    const exact = smartSymptoms.filter((item) => item.label.toLowerCase().includes(q))
    if (exact.length) return exact
    return [
      {
        id: `custom-${q.replace(/\s+/g, "-")}`,
        label: query.trim(),
        icon: <FiSearch />,
      },
    ]
  }, [query, smartSymptoms])

  async function selectSymptom(symptom: string) {
    void saveRecentSymptom(symptom)
      .then(() => {
        setRecentSymptoms((prev) => [symptom, ...prev.filter((item) => item.toLowerCase() !== symptom.toLowerCase())].slice(0, 9))
      })
      .catch(() => undefined)
    const specialty = inferSpecialty(symptom)
    navigate("/teleconsultation", {
      state: {
        fromAiAnalyser: true,
        preselectedSpecialty: specialty,
        selectedSymptoms: [symptom],
        analysisQuery: symptom,
        recommendedMode: "tele",
        triageLevel: "Moderate",
      },
    })
  }

  return (
    <main className="symptom-analyser-page app-page-enter">
      <header className="symptom-analyser-header app-fade-stagger">
        <button className="analyser-back app-pressable" onClick={() => goBackOrFallback(navigate)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>How are you feeling?</h1>
          <p>Pick a symptom and we will connect you to the right doctor.</p>
        </div>
      </header>

      <section className="symptom-flow-body app-content-slide">
        <section className="flow-card app-fade-stagger">
          <div className="flow-card-head">
            <h2>Search your symptom</h2>
            <p>Write whatever you feel in easy words.</p>
          </div>

          <div className="analyser-search focus">
            <FiSearch />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search symptoms (headache, fever, cough)"
              autoFocus
            />
          </div>

          {recentSymptoms.length > 0 ? (
            <section className="recent-symptoms-block">
              <div className="recent-symptoms-head">
                <h3>Recent symptoms</h3>
                <p>Tap once to reuse what you searched earlier.</p>
              </div>
              <div className="recent-symptoms-list">
                {recentSymptoms.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="recent-symptom-chip app-pressable"
                    onClick={() => void selectSymptom(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <div className="flow-option-grid symptom-grid">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flow-option symptom-card app-pressable"
                onClick={() => void selectSymptom(item.label)}
              >
                <span className="symptom-icon">{item.icon}</span>
                <span className="symptom-label">{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
