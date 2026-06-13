import { useEffect, useMemo, useRef, useState } from "react"
import {
  FiActivity,
  FiArrowLeft,
  FiHeart,
  FiMoon,
  FiSmile,
  FiSquare,
  FiSun,
  FiWind,
  FiZap,
} from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import { getStressHistory, saveStressEntry, type StressActivityType, type StressEntry, type StressSummary } from "../../services/stressApi"
import { armAudioContext, startAmbientTrack, stopAmbientTrack } from "../../utils/sound"
import "./stresschat.css"

type Mode = null | "breathing" | "sleep"

type ActivityItem = {
  id: string
  title: string
  subtitle: string
  tone: "blue" | "pink" | "purple" | "teal"
  icon: JSX.Element
  action?: Mode
}

type SleepRecording = {
  id: string
  createdAt: string
  label: string
  dataUrl: string
}

const activityItems: ActivityItem[] = [
  { id: "breathing", title: "Breathing", subtitle: "Track a calm cycle", tone: "blue", icon: <FiWind />, action: "breathing" },
  { id: "meditation", title: "Meditation", subtitle: "Mind reset log", tone: "pink", icon: <FiHeart /> },
  { id: "sleep", title: "Sleep Sounds", subtitle: "Night recording", tone: "purple", icon: <FiMoon />, action: "sleep" },
  { id: "reset", title: "Mood Reset", subtitle: "Doctor check-in", tone: "teal", icon: <FiSmile /> },
]

const ritualCards = [
  { title: "Morning Breath", body: "Take 5 slow breaths before work starts. It helps settle your heart rate.", icon: <FiSun /> },
  { title: "Hydration Tip", body: "Finish one glass of water before lunch so fatigue and headache stay lower.", icon: <FiActivity /> },
  { title: "Evening Unwind", body: "Keep lights low 30 mins before sleep and let your mind slow down naturally.", icon: <FiMoon /> },
]

const breathingSteps = [
  { label: "Inhale", seconds: 4 },
  { label: "Hold", seconds: 4 },
  { label: "Exhale", seconds: 4 },
]

const SLEEP_RECORDINGS_KEY = "employee_sleep_recordings_v1"

export default function StressRelief() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>(null)
  const [breathingStep, setBreathingStep] = useState(0)
  const [breathingCount, setBreathingCount] = useState(breathingSteps[0].seconds)
  const [stressSummary, setStressSummary] = useState<StressSummary | null>(null)
  const [stressEntries, setStressEntries] = useState<StressEntry[]>([])
  const [loadingStress, setLoadingStress] = useState(true)
  const [sleepRecords, setSleepRecords] = useState<SleepRecording[]>(() => {
    const raw = localStorage.getItem(SLEEP_RECORDINGS_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as SleepRecording[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const [isRecording, setIsRecording] = useState(false)
  const [sleepSound, setSleepSound] = useState("Rain")
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const calmScore = useMemo(() => stressSummary?.calmScore ?? null, [stressSummary])
  const isNight = useMemo(() => {
    const hour = new Date().getHours()
    return hour >= 21 || hour < 6
  }, [])

  async function loadStressState() {
    try {
      setLoadingStress(true)
      const response = await getStressHistory(undefined, 12)
      setStressEntries(response.entries ?? [])
      setStressSummary(response.summary ?? null)
    } catch {
      setStressEntries([])
      setStressSummary(null)
    } finally {
      setLoadingStress(false)
    }
  }

  useEffect(() => {
    void loadStressState()
  }, [])

  async function logActivity(activityType: StressActivityType, durationMinutes: number, notes: string, meta?: Record<string, unknown>) {
    try {
      await saveStressEntry({ activityType, durationMinutes, notes, meta })
      await loadStressState()
    } catch {
      // keep page usable even if backend logging fails
    }
  }

  async function triggerActivity(item: ActivityItem) {
    armAudioContext()
    if (item.id === "reset") {
      startAmbientTrack("meditation")
      await logActivity("mood-reset", 5, "Opened mood reset support", { source: "stress-relief" })
      navigate("/ai-chat", {
        state: {
          doctor: {
            name: "Dr. Meera Sethi",
            avatar: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=320&q=80",
          },
          feelingId: "mood-reset",
          theme: "whatsapp-calm",
        },
      })
      return
    }
    if (item.id === "meditation") {
      startAmbientTrack("meditation")
      await logActivity("meditation", 10, "Opened meditation tracker", { source: "stress-relief" })
      navigate("/meditation")
      return
    }
    if (item.action) {
      startAmbientTrack(item.action === "breathing" ? "breathing" : "rain")
      setMode(item.action)
    }
  }

  function persistSleepRecords(next: SleepRecording[]) {
    setSleepRecords(next)
    localStorage.setItem(SLEEP_RECORDINGS_KEY, JSON.stringify(next))
  }

  function formatRecordingLabel(createdAt: string) {
    const date = new Date(createdAt)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    const sameDay = date.toDateString() === today.toDateString()
    const lastNight = date.toDateString() === yesterday.toDateString()
    if (sameDay) return "Tonight"
    if (lastNight) return "Last night"
    return date.toLocaleDateString()
  }

  async function startRecording() {
    if (!isNight || isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recordChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordChunksRef.current.push(event.data)
        }
      }
      recorder.onstop = () => {
        const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType || "audio/webm" })
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = String(reader.result || "")
          const now = new Date().toISOString()
          const next: SleepRecording = {
            id: `sleep-${Date.now()}`,
            createdAt: now,
            label: formatRecordingLabel(now),
            dataUrl,
          }
          const updated = [next, ...sleepRecords].slice(0, 5)
          persistSleepRecords(updated)
        }
        reader.readAsDataURL(blob)
        void logActivity("sleep", 30, "Sleep sound captured", { sound: sleepSound, recorded: true })
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      recorder.start()
      recorderRef.current = recorder
      setIsRecording(true)
    } catch {
      setIsRecording(false)
    }
  }

  function stopRecording() {
    if (!recorderRef.current) return
    recorderRef.current.stop()
    recorderRef.current = null
    setIsRecording(false)
  }

  useEffect(() => {
    if (mode !== "breathing") return
    startAmbientTrack("breathing")
    setBreathingStep(0)
    setBreathingCount(breathingSteps[0].seconds)
    const interval = window.setInterval(() => {
      setBreathingCount((prev) => {
        if (prev <= 1) {
          setBreathingStep((current) => {
            const nextStep = (current + 1) % breathingSteps.length
            setBreathingCount(breathingSteps[nextStep].seconds)
            return nextStep
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [mode])

  useEffect(() => {
    return () => {
      stopAmbientTrack()
      if (recorderRef.current) {
        recorderRef.current.stop()
        recorderRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  return (
    <div className="stress-page app-page-enter">
      <header className="stress-header app-fade-stagger">
        <button className="stress-back app-pressable" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div className="stress-header-copy">
          <h1 className="stress-title">Stress Relief</h1>
          <p className="stress-subtitle">Everyday relief that tracks what you actually do</p>
        </div>
      </header>

      <div className="stress-content app-content-slide">
        {!loadingStress && calmScore !== null && (
          <section className="calm-hero app-fade-stagger">
            <div className="calm-hero-copy">
              <p>Today&apos;s Calm Score</p>
              <h2>{calmScore}<span>/100</span></h2>
              <div className="mood-chips">
                <span><FiSmile /> {stressSummary?.averageMood ? `Mood ${stressSummary.averageMood}/10` : "Tracked"}</span>
                <span><FiZap /> {stressSummary?.totalMinutes ?? 0} mins logged</span>
              </div>
            </div>
            <div className="calm-illustration" aria-hidden="true">
              <div className="orb orb-a" />
              <div className="orb orb-b" />
              <div className="wave wave-a" />
              <div className="wave wave-b" />
            </div>
          </section>
        )}

        <section className="stress-section app-fade-stagger">
          <h3 className="stress-section-title">Everyday Relief</h3>
          <div className="activities">
            {activityItems.map((item) => (
              <button key={item.id} className={`activity-card ${item.tone} app-pressable`} type="button" onClick={() => void triggerActivity(item)}>
                <span className="activity-icon">{item.icon}</span>
                <h4>{item.title}</h4>
                <p>{item.subtitle}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="stress-section app-fade-stagger">
          <h3 className="stress-section-title">Daily Rituals</h3>
          <div className="ritual-grid">
            {ritualCards.map((ritual) => (
              <article className="ritual-card" key={ritual.title}>
                <div className="ritual-head">
                  <span>{ritual.icon}</span>
                  <strong>{ritual.title}</strong>
                </div>
                <p>{ritual.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="stress-section app-fade-stagger">
          <h3 className="stress-section-title">Recent Relief Activity</h3>
          <div className="ritual-grid">
            {stressEntries.length > 0 ? (
              stressEntries.slice(0, 4).map((entry) => (
                <article className="ritual-card" key={entry.id}>
                  <div className="ritual-head">
                    <span>
                      {entry.activityType === "sleep" ? <FiMoon /> : entry.activityType === "meditation" ? <FiHeart /> : entry.activityType === "breathing" ? <FiWind /> : <FiSmile />}
                    </span>
                    <strong>{entry.activityType.replace("-", " ")}</strong>
                  </div>
                  <p>
                    {entry.durationMinutes} mins •{" "}
                    {new Date(entry.eventAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </article>
              ))
            ) : (
              <article className="ritual-card">
                <div className="ritual-head">
                  <span><FiActivity /></span>
                  <strong>No relief activity yet</strong>
                </div>
                <p>Start with breathing, meditation, sleep sounds, or a mood reset and we&apos;ll track it here.</p>
              </article>
            )}
          </div>
        </section>
      </div>

      {mode === "breathing" && (
        <div className="overlay" onClick={() => { stopAmbientTrack(); setMode(null) }}>
          <div className="sleep-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="breath-wrap">
              <div className="breath-ring ring-1" />
              <div className="breath-ring ring-2" />
              <div className="breath-circle" />
            </div>
            <p className="overlay-title">Breathing Exercise</p>
            <p className="overlay-sub">{breathingSteps[breathingStep].label} • {breathingCount}s</p>
            <p className="overlay-sub">Inhale for 4s, hold for 4s, exhale for 4s</p>
            <div className="sleep-record stress-inline-actions">
              <button
                type="button"
                className="sleep-record-btn app-pressable"
                onClick={async () => {
                  await logActivity("breathing", 2, "Completed guided breathing cycle", { cycle: "4-4-4" })
                  stopAmbientTrack()
                  setMode(null)
                }}
              >
                Save Session
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "sleep" && (
        <div className="overlay" onClick={() => { stopAmbientTrack(); setMode(null) }}>
          <div className="sleep-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="overlay-title">Sleep Sounds</p>
            <p className="overlay-sub">Choose a calming soundscape</p>
            <div className="sleep-tags">
              {["Rain", "Ocean", "Forest"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`sleep-tag ${sleepSound === tag ? "active" : ""}`}
                  onClick={() => {
                    setSleepSound(tag)
                    startAmbientTrack(tag.toLowerCase() as "rain" | "ocean" | "forest")
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="sleep-audio-card">
              <strong>{sleepSound} ambience playing</strong>
              <p>Keep this sheet open and let the calming layer run in the background.</p>
            </div>

            <div className="sleep-record">
              <div>
                <strong>Record sleep sound</strong>
                <p>{isNight ? "Recording available at night" : "Available between 9 PM and 6 AM"}</p>
              </div>
              <button
                type="button"
                className="sleep-record-btn app-pressable"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isNight}
              >
                {isRecording ? <FiSquare /> : <FiMoon />}
                {isRecording ? "Stop" : "Record"}
              </button>
            </div>

            {sleepRecords.length > 0 && (
              <div className="sleep-history">
                <h4>Previous sleep sounds</h4>
                {sleepRecords.map((record) => (
                  <div key={record.id} className="sleep-history-row">
                    <span>{record.label}</span>
                    <audio controls src={record.dataUrl} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
