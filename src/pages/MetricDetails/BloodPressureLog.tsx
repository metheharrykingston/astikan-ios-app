import { useEffect, useMemo, useState } from "react"
import { FiActivity, FiArrowLeft, FiCalendar, FiCheckCircle, FiEdit3 } from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import { getLatestVital, getVitalHistory, saveVitalReading } from "../../services/vitalsApi"
import "./metric-details.css"

type ReadingRow = { sys: number; dia: number; eventAt: string }

export default function BloodPressureLog() {
  const navigate = useNavigate()
  const [bpSysInput, setBpSysInput] = useState("")
  const [bpDiaInput, setBpDiaInput] = useState("")
  const [bpSaveStatus, setBpSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [bpSaveError, setBpSaveError] = useState("")
  const [latest, setLatest] = useState<ReadingRow | null>(null)
  const [history, setHistory] = useState<ReadingRow[]>([])

  const latestLabel = useMemo(() => {
    if (!latest?.eventAt) return "No recent log"
    return new Date(latest.eventAt).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })
  }, [latest])

  const status = useMemo(() => {
    if (!latest) return { label: "Track", copy: "Add your latest reading", tone: "neutral" as const }
    if (latest.sys <= 120 && latest.dia <= 80) return { label: "Normal", copy: "Normal blood pressure reading", tone: "good" as const }
    if (latest.sys >= 140 || latest.dia >= 90) return { label: "Elevated", copy: "Reading needs attention", tone: "high" as const }
    return { label: "Watch", copy: "Slightly above ideal range", tone: "mid" as const }
  }, [latest])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [sys, dia] = await Promise.all([
          getLatestVital("blood_pressure_sys"),
          getLatestVital("blood_pressure_dia"),
        ])
        if (!active) return
        if (typeof sys?.value === "number" && typeof dia?.value === "number") {
          setLatest({ sys: sys.value, dia: dia.value, eventAt: sys.eventAt || dia.eventAt || new Date().toISOString() })
        }
        const [sysHistory, diaHistory] = await Promise.all([
          getVitalHistory("blood_pressure_sys", 12),
          getVitalHistory("blood_pressure_dia", 12),
        ])
        if (!active) return
        const paired: ReadingRow[] = []
        const sysPoints = sysHistory?.points ?? []
        const diaPoints = diaHistory?.points ?? []
        const maxLen = Math.max(sysPoints.length, diaPoints.length)
        for (let i = 0; i < maxLen; i += 1) {
          const sysPoint = sysPoints[i]
          const diaPoint = diaPoints[i]
          if (!sysPoint || !diaPoint) continue
          paired.push({
            sys: sysPoint.value,
            dia: diaPoint.value,
            eventAt: sysPoint.eventAt || diaPoint.eventAt || new Date().toISOString(),
          })
        }
        setHistory(paired.slice(0, 8))
      } catch {
        // keep fallback
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const saveBloodPressure = async () => {
    const sys = Number(bpSysInput)
    const dia = Number(bpDiaInput)
    if (!Number.isFinite(sys) || !Number.isFinite(dia) || sys <= 0 || dia <= 0) {
      setBpSaveError("Enter valid systolic and diastolic values.")
      setBpSaveStatus("error")
      return
    }
    setBpSaveError("")
    setBpSaveStatus("saving")
    try {
      await Promise.all([
        saveVitalReading({ metric: "blood_pressure_sys", value: sys, unit: "mmHg", source: "manual" }),
        saveVitalReading({ metric: "blood_pressure_dia", value: dia, unit: "mmHg", source: "manual" }),
      ])
      setBpSaveStatus("saved")
      const eventAt = new Date().toISOString()
      setLatest({ sys, dia, eventAt })
      setHistory((prev) => [{ sys, dia, eventAt }, ...prev].slice(0, 8))
      setBpSysInput("")
      setBpDiaInput("")
    } catch (error) {
      setBpSaveStatus("error")
      setBpSaveError(error instanceof Error ? error.message : "Unable to save blood pressure.")
    }
  }

  return (
    <main className="metric-detail-page metric-detail-page--bp app-page-enter">
      <header className="metric-detail-header app-fade-stagger">
        <button className="metric-back app-pressable" type="button" onClick={() => navigate(-1)} aria-label="Back">
          <FiArrowLeft />
        </button>
        <h1>Log Blood Pressure</h1>
      </header>

      <section className="metric-detail-shell app-content-slide">
        <article className="bp-log-hero app-fade-stagger">
          <div className="bp-log-hero-icon">
            <span className="bp-log-hero-pulse"><FiActivity /></span>
          </div>
          <div className="bp-log-hero-copy">
            <span className={`bp-log-status-pill ${status.tone}`}>
              <FiCheckCircle />
              {status.label}
            </span>
            <h2>{latest ? `${Math.round(latest.sys)}/${Math.round(latest.dia)}` : "—/—"} <small>mmHg</small></h2>
            <p>{status.copy}</p>
            <div className="bp-log-meta">
              <span><FiCalendar /> {latest ? latestLabel : "Today"}</span>
              <span>•</span>
              <span><FiEdit3 /> Manual Entry</span>
            </div>
          </div>
        </article>

        <article className="bp-log-entry-card app-fade-stagger">
          <div className="bp-log-entry-copy">
            <img src="/assets/reference-ui/bp-track-card.webp" alt="" className="bp-log-entry-image" />
            <div>
              <h3>Daily tracking</h3>
              <p>Log your reading to keep your analysis accurate and personal.</p>
            </div>
          </div>
          <div className="bp-input-grid">
            <label className="bp-input">
              <span>Systolic</span>
              <input
                inputMode="numeric"
                placeholder="120"
                value={bpSysInput}
                onChange={(e) => setBpSysInput(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </label>
            <label className="bp-input">
              <span>Diastolic</span>
              <input
                inputMode="numeric"
                placeholder="80"
                value={bpDiaInput}
                onChange={(e) => setBpDiaInput(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </label>
          </div>
          {bpSaveStatus === "error" && <p className="bp-error">{bpSaveError}</p>}
          {bpSaveStatus === "saved" && <p className="bp-success">Saved successfully.</p>}
          <button className="bp-log-save-btn app-pressable" type="button" onClick={saveBloodPressure} disabled={bpSaveStatus === "saving"}>
            {bpSaveStatus === "saving" ? "Saving..." : "Save Blood Pressure"}
          </button>
        </article>

        <article className="metric-log-card metric-log-card--bp app-fade-stagger">
          <h3>Recent logs</h3>
          {history.length === 0 && <p className="metric-log-empty">No logs yet.</p>}
          {history.map((row, index) => (
            <div key={`${row.eventAt}-${index}`} className="metric-log-row">
              <div>
                <strong>{row.sys}/{row.dia} mmHg</strong>
                <span>{new Date(row.eventAt).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })}</span>
              </div>
            </div>
          ))}
        </article>
      </section>
    </main>
  )
}
