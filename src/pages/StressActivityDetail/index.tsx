import { useEffect, useMemo, useState } from "react"
import { FiArrowLeft, FiHeart, FiMoon, FiSmile, FiWind } from "react-icons/fi"
import { useNavigate, useParams } from "react-router-dom"
import { getStressHistory, saveStressEntry, type StressActivityType, type StressEntry } from "../../services/stressApi"
import "./stress-activity-detail.css"

type ActivityConfig = {
  title: string
  subtitle: string
  unitLabel: string
  tone: "blue" | "pink" | "purple" | "teal"
  icon: React.ReactElement
  placeholder: string
  moodHint: string
}

const activityConfig: Record<StressActivityType, ActivityConfig> = {
  breathing: {
    title: "Breathing Analysis",
    subtitle: "Track your breathing resets and recovery rhythm.",
    unitLabel: "minutes",
    tone: "blue",
    icon: <FiWind />,
    placeholder: "Felt calmer after the 4-4-4 cycle.",
    moodHint: "How calm did you feel after it?",
  },
  meditation: {
    title: "Meditation Analysis",
    subtitle: "Log each session and watch your calm minutes build up.",
    unitLabel: "minutes",
    tone: "pink",
    icon: <FiHeart />,
    placeholder: "Short guided sit before lunch.",
    moodHint: "How grounded do you feel now?",
  },
  sleep: {
    title: "Sleep Sounds Tracking",
    subtitle: "Save each sleep-sound session and note what actually helped.",
    unitLabel: "minutes",
    tone: "purple",
    icon: <FiMoon />,
    placeholder: "Rain mix helped me settle faster.",
    moodHint: "How rested do you expect to feel after this session?",
  },
  "mood-reset": {
    title: "Mood Reset Tracking",
    subtitle: "Capture quick mood resets and keep a realistic emotional trend.",
    unitLabel: "minutes",
    tone: "teal",
    icon: <FiSmile />,
    placeholder: "Took a walk and reset my head a little.",
    moodHint: "How much better do you feel after the reset?",
  },
}

function formatTime(value?: string | null) {
  if (!value) return "No recent log"
  return new Date(value).toLocaleString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  })
}

export default function StressActivityDetail() {
  const navigate = useNavigate()
  const { activityType } = useParams()
  const resolvedActivity = (activityType as StressActivityType) || "breathing"
  const config = activityConfig[resolvedActivity] ?? activityConfig.breathing

  const [history, setHistory] = useState<StressEntry[]>([])
  const [durationMinutes, setDurationMinutes] = useState("")
  const [moodScore, setMoodScore] = useState("7")
  const [notes, setNotes] = useState("")
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [errorText, setErrorText] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const data = await getStressHistory(resolvedActivity, 12)
        if (!active) return
        setHistory(data.entries)
      } catch (error) {
        if (!active) return
        setErrorText(error instanceof Error ? error.message : "Unable to load activity history.")
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [resolvedActivity])

  const totalMinutes = useMemo(() => history.reduce((sum, item) => sum + (item.durationMinutes || 0), 0), [history])
  const averageMood = useMemo(() => {
    const values = history.filter((item) => typeof item.moodScore === "number").map((item) => item.moodScore as number)
    if (!values.length) return null
    return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
  }, [history])

  const handleSave = async () => {
    const minutes = Number(durationMinutes)
    const mood = Number(moodScore)
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setSaveState("error")
      setErrorText("Enter a valid duration in minutes.")
      return
    }
    if (!Number.isFinite(mood) || mood < 1 || mood > 10) {
      setSaveState("error")
      setErrorText("Mood score should be between 1 and 10.")
      return
    }

    setSaveState("saving")
    setErrorText("")
    try {
      const response = await saveStressEntry({
        activityType: resolvedActivity,
        durationMinutes: minutes,
        moodScore: mood,
        notes,
      })
      setHistory((prev) => [response.entry, ...prev].slice(0, 12))
      setDurationMinutes("")
      setMoodScore("7")
      setNotes("")
      setSaveState("saved")
    } catch (error) {
      setSaveState("error")
      setErrorText(error instanceof Error ? error.message : "Unable to save activity.")
    }
  }

  return (
    <main className="stress-detail-page app-page-enter">
      <header className="stress-detail-header app-fade-stagger">
        <button className="stress-detail-back app-pressable" type="button" onClick={() => navigate(-1)} aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
      </header>

      <section className="stress-detail-shell app-content-slide">
        <article className={`stress-detail-hero ${config.tone} app-fade-stagger`}>
          <span className="stress-detail-icon">{config.icon}</span>
          <div>
            <h2>{history.length ? totalMinutes : 0} <small>{config.unitLabel}</small></h2>
            <p>{history.length ? `Last activity ${formatTime(history[0]?.eventAt)}` : "No activity saved yet"}</p>
          </div>
        </article>

        <section className="stress-detail-grid app-fade-stagger">
          <article className="stress-stat-card">
            <span>Sessions</span>
            <strong>{history.length}</strong>
          </article>
          <article className="stress-stat-card">
            <span>Average mood</span>
            <strong>{averageMood ?? "—"}</strong>
          </article>
        </section>

        <article className="stress-form-card app-fade-stagger">
          <h3>Save activity</h3>
          <div className="stress-form-grid">
            <label className="stress-field">
              <span>Duration</span>
              <input
                inputMode="numeric"
                placeholder="10"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value.replace(/[^0-9]/g, ""))}
              />
            </label>
            <label className="stress-field">
              <span>Mood score</span>
              <input
                inputMode="numeric"
                placeholder="7"
                value={moodScore}
                onChange={(event) => setMoodScore(event.target.value.replace(/[^0-9]/g, ""))}
              />
            </label>
          </div>
          <label className="stress-field stress-field-full">
            <span>{config.moodHint}</span>
            <textarea
              rows={4}
              placeholder={config.placeholder}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          {saveState === "error" && <p className="stress-save-note error">{errorText}</p>}
          {saveState === "saved" && <p className="stress-save-note success">Saved successfully.</p>}
          <button className="stress-save-btn app-pressable" type="button" onClick={handleSave} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Saving..." : "Save activity"}
          </button>
        </article>

        <article className="stress-history-card app-fade-stagger">
          <h3>Recent tracking</h3>
          {loading && <p className="stress-history-empty">Loading activity...</p>}
          {!loading && history.length === 0 && <p className="stress-history-empty">No activity saved yet.</p>}
          {!loading && history.map((entry) => (
            <div className="stress-history-row" key={entry.id}>
              <div>
                <strong>{entry.durationMinutes} min session</strong>
                <span>{formatTime(entry.eventAt)}</span>
              </div>
              <div className="stress-history-meta">
                <em>{entry.moodScore ? `${entry.moodScore}/10` : "—"}</em>
              </div>
              {entry.notes ? <p>{entry.notes}</p> : null}
            </div>
          ))}
        </article>
      </section>
    </main>
  )
}
