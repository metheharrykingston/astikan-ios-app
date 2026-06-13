import { useEffect, useMemo, useRef, useState } from "react"
import { FiActivity, FiArrowLeft, FiDroplet, FiHeart, FiShield } from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import { getHealthProfile, saveHealthProfile } from "../../services/healthProfileApi"
import "./health-info.css"

type SaveState = "idle" | "saving" | "saved" | "error"

function formatDateTime(value?: string) {
  if (!value) return "Not saved yet"
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function HealthInfo() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [updatedAt, setUpdatedAt] = useState("")
  const [bloodGroup, setBloodGroup] = useState("")
  const [heightFt, setHeightFt] = useState("")
  const [heightIn, setHeightIn] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [waistIn, setWaistIn] = useState("")
  const [allergies, setAllergies] = useState("")
  const [conditions, setConditions] = useState("")
  const [medications, setMedications] = useState("")
  const [notes, setNotes] = useState("")
  const autosaveRef = useRef<number | null>(null)
  const loadedRef = useRef(false)

  const splitHeightFromCm = (cm?: number | null) => {
    if (!cm || cm <= 0) return null
    const totalIn = Math.round(cm / 2.54)
    const ft = Math.floor(totalIn / 12)
    const inches = totalIn - ft * 12
    return { ft, inches }
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const { profile } = await getHealthProfile()
        if (!active || !profile) {
          setLoading(false)
          loadedRef.current = true
          return
        }
        const cmSplit = splitHeightFromCm(profile.heightCm ?? null)
        const ftValue = profile.heightFt ?? cmSplit?.ft ?? null
        const inValue = profile.heightIn ?? cmSplit?.inches ?? null
        setBloodGroup(profile.bloodGroup ?? "")
        setHeightFt(ftValue !== null && ftValue !== undefined ? String(ftValue) : "")
        setHeightIn(inValue !== null && inValue !== undefined ? String(inValue) : "")
        setWeightKg(profile.weightKg ? String(profile.weightKg) : "")
        setWaistIn(profile.waistIn ? String(profile.waistIn) : "")
        setAllergies(profile.allergies ?? "")
        setConditions(profile.conditions ?? "")
        setMedications(profile.medications ?? "")
        setNotes(profile.notes ?? "")
        setUpdatedAt(profile.updatedAt ?? "")
        loadedRef.current = true
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load profile")
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!loadedRef.current) return
    if (autosaveRef.current) {
      window.clearTimeout(autosaveRef.current)
    }
    autosaveRef.current = window.setTimeout(async () => {
      setError("")
      setSaveState("saving")
      try {
        await saveHealthProfile({
          bloodGroup: bloodGroup || null,
          heightFt: heightFt ? Number(heightFt) : null,
          heightIn: heightIn ? Number(heightIn) : null,
          weightKg: weightKg ? Number(weightKg) : null,
          waistIn: waistIn ? Number(waistIn) : null,
          allergies,
          conditions,
          medications,
          notes,
        })
        const now = new Date().toISOString()
        setUpdatedAt(now)
        setSaveState("saved")
      } catch (err) {
        setSaveState("error")
        setError(err instanceof Error ? err.message : "Unable to save profile")
      }
    }, 900)

    return () => {
      if (autosaveRef.current) {
        window.clearTimeout(autosaveRef.current)
      }
    }
  }, [bloodGroup, heightFt, heightIn, weightKg, waistIn, allergies, conditions, medications, notes])

  const bmi = useMemo(() => {
    const ft = Number(heightFt)
    const inch = Number(heightIn)
    const kg = Number(weightKg)
    if (!ft || !kg) return null
    const totalIn = ft * 12 + (Number.isFinite(inch) ? inch : 0)
    if (!totalIn) return null
    const cm = totalIn * 2.54
    const m = cm / 100
    const value = kg / (m * m)
    return Math.round(value * 10) / 10
  }, [heightFt, heightIn, weightKg])

  const bmiStatus = useMemo(() => {
    if (!bmi) return "Add height and weight to unlock BMI"
    if (bmi < 18.5) return "Underweight range"
    if (bmi < 25) return "Healthy range"
    if (bmi < 30) return "Overweight range"
    return "High BMI range"
  }, [bmi])

  const profileCompletion = useMemo(() => {
    const values = [bloodGroup, heightFt, weightKg, allergies, conditions, medications, notes]
    const filled = values.filter((item) => String(item ?? "").trim()).length
    return Math.round((filled / values.length) * 100)
  }, [allergies, bloodGroup, conditions, heightFt, medications, notes, weightKg])

  const saveLabel =
    saveState === "saving"
      ? "Saving changes..."
      : saveState === "saved"
        ? "All changes saved"
        : saveState === "error"
          ? "Save issue"
          : "Auto-save enabled"

  return (
    <main className="health-info-page app-page-enter">
      <header className="health-info-header app-fade-stagger">
        <button className="health-info-back app-pressable" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>Health Information</h1>
          <p>Saved data is used for better doctor, lab, and medicine guidance.</p>
        </div>
      </header>

      <section className="health-info-shell app-content-slide">
        {loading && <div className="health-loading">Loading health profile...</div>}
        {error && <div className="health-error">{error}</div>}

        <article className="health-card health-summary-card card-rise">
          <div className="health-summary-copy">
            <div className="health-summary-top">
              <span className="health-kicker">Health Profile</span>
              <span className={`health-save-pill ${saveState}`}>{saveLabel}</span>
            </div>
            <h2>{bmi ? bmi : "--"} <small>BMI</small></h2>
            <p>{bmiStatus}</p>
            <div className="health-progress" aria-hidden="true">
              <span style={{ width: `${profileCompletion}%` }} />
            </div>
            <small>Profile completeness {profileCompletion}% · Last updated {formatDateTime(updatedAt)}</small>
          </div>
          <div className="health-icons">
            <span><FiHeart /></span>
            <span><FiActivity /></span>
            <span><FiDroplet /></span>
          </div>
        </article>

        <article className="health-card card-rise">
          <div className="health-section-title">
            <h3>Core Vitals</h3>
            <span>Keep these current</span>
          </div>
          <div className="health-grid">
            <label>
              <span>Blood Group</span>
              <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                <option value="">Select</option>
                <option value="B+">B+</option>
                <option value="A+">A+</option>
                <option value="O+">O+</option>
                <option value="AB+">AB+</option>
                <option value="B-">B-</option>
                <option value="A-">A-</option>
                <option value="O-">O-</option>
                <option value="AB-">AB-</option>
              </select>
            </label>
            <label>
              <span>Height (ft)</span>
              <input value={heightFt} onChange={(e) => setHeightFt(e.target.value.replace(/[^0-9]/g, ""))} placeholder="5" inputMode="numeric" />
            </label>
            <label>
              <span>Height (in)</span>
              <input value={heightIn} onChange={(e) => setHeightIn(e.target.value.replace(/[^0-9]/g, ""))} placeholder="7" inputMode="numeric" />
            </label>
            <label>
              <span>Weight (kg)</span>
              <input value={weightKg} onChange={(e) => setWeightKg(e.target.value.replace(/[^0-9]/g, ""))} placeholder="68" inputMode="numeric" />
            </label>
            <label>
              <span>Waist (in)</span>
              <input value={waistIn} onChange={(e) => setWaistIn(e.target.value.replace(/[^0-9]/g, ""))} placeholder="32" inputMode="numeric" />
            </label>
          </div>
        </article>

        <article className="health-card card-rise">
          <div className="health-section-title">
            <h3>Medical Context</h3>
            <span>Visible to care workflows</span>
          </div>
          <div className="health-text-grid">
            <label>
              <span><FiShield /> Allergies</span>
              <textarea rows={3} value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="No known allergies" />
            </label>
            <label>
              <span><FiActivity /> Conditions</span>
              <textarea rows={3} value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="Hypertension, asthma, thyroid, etc." />
            </label>
            <label>
              <span><FiDroplet /> Current Medications</span>
              <textarea rows={3} value={medications} onChange={(e) => setMedications(e.target.value)} placeholder="Daily medicines, supplements, or ongoing treatment" />
            </label>
            <label>
              <span><FiHeart /> Additional Notes</span>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything your doctor or lab team should know" />
            </label>
          </div>
        </article>
      </section>
    </main>
  )
}
