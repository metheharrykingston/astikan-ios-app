import { useMemo, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { FiArrowLeft, FiCalendar, FiFileText, FiInfo, FiMapPin, FiPaperclip, FiStar, FiUser } from "react-icons/fi"
import { createNearbyDoctorBookingRequest, type NearbyDoctorPlace } from "../../services/doctorsApi"
import { goBackOrFallback } from "../../utils/navigation"
import "./nearby-doctors.css"

type RequestState = {
  doctor?: NearbyDoctorPlace
  consultationType?: "clinic" | "video"
  consultationLabel?: string
}

const dateOptions = [
  { id: "today", label: "Today", offset: 0 },
  { id: "tomorrow", label: "Tomorrow", offset: 1 },
  { id: "later", label: "Pick date", offset: 2 },
]

const timeOptions = ["Morning 9 AM – 12 PM", "Afternoon 12 PM – 5 PM", "Evening 5 PM – 9 PM"]

function formatDate(offset: number) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

function prettyType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Doctor"
}

export default function NearbyDoctorRequest() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as RequestState | undefined
  const doctor = state?.doctor
  const consultationType = state?.consultationType === "video" ? "video" : "clinic"
  const [reason, setReason] = useState("")
  const [dateChoice, setDateChoice] = useState("tomorrow")
  const [timeSlot, setTimeSlot] = useState(timeOptions[0])
  const [patientName, setPatientName] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const selectedDate = useMemo(() => {
    const option = dateOptions.find((item) => item.id === dateChoice) || dateOptions[1]
    return formatDate(option.offset)
  }, [dateChoice])

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []).slice(0, 5)
    setFiles(selected)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!doctor || submitting) return
    setSubmitting(true)
    setError("")
    try {
      const result = await createNearbyDoctorBookingRequest({
        consultationType,
        doctor,
        reason,
        preferredDate: selectedDate,
        preferredTimeSlot: timeSlot,
        patient: { name: patientName, age, gender },
        uploadedFiles: files.map((file) => ({ name: file.name, type: file.type, size: file.size })),
      })
      navigate("/nearby-doctors/success", { state: { result, doctor, consultationType, selectedDate, timeSlot } })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit this request right now.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!doctor) {
    return (
      <main className="nearby-page nearby-centered app-page-enter">
        <h1>Select doctor again</h1>
        <p>We could not find the selected doctor details.</p>
        <button className="nearby-primary-btn" type="button" onClick={() => navigate("/nearby-doctors")}>Find nearby doctors</button>
      </main>
    )
  }

  return (
    <main className="nearby-page app-page-enter">
      <header className="nearby-simple-header">
        <button className="nearby-back app-pressable" type="button" onClick={() => goBackOrFallback(navigate, "/nearby-doctors/consult")} aria-label="Back"><FiArrowLeft /></button>
        <div>
          <h1>{consultationType === "clinic" ? "Tell us about your visit" : "Tell us about your video consult"}</h1>
          <p>Astikan will use these details to confirm availability and pricing.</p>
        </div>
      </header>

      <form className="nearby-content nearby-request-form" onSubmit={submit}>
        <article className="nearby-selected-doctor-card compact">
          <div className="nearby-blur-avatar"><FiUser /></div>
          <div>
            <h2>{doctor.name}</h2>
            <strong>{prettyType(doctor.primaryType)}</strong>
            <p><FiMapPin /> {doctor.address}</p>
            <span className="nearby-mini-badge">{consultationType === "clinic" ? "Clinic Visit" : "Video Consult"}</span>
          </div>
          {typeof doctor.rating === "number" ? <span className="nearby-rating"><FiStar /> {doctor.rating.toFixed(1)}</span> : null}
        </article>

        <section className="nearby-form-card">
          <h3>1. Reason for consultation</h3>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe symptoms or concern" rows={4} />
          <p>Fever, cough, stomach pain, follow-up, reports review</p>
        </section>

        <section className="nearby-form-card">
          <h3>2. Preferred date</h3>
          <div className="nearby-choice-grid three">
            {dateOptions.map((option) => (
              <button key={option.id} className={`nearby-choice ${dateChoice === option.id ? "active" : ""}`} type="button" onClick={() => setDateChoice(option.id)}>
                <FiCalendar />
                <span>{option.label}</span>
                <small>{option.id === "later" ? "Flexible" : formatDate(option.offset)}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="nearby-form-card">
          <h3>3. Preferred time</h3>
          <div className="nearby-choice-grid">
            {timeOptions.map((option) => (
              <button key={option} className={`nearby-choice ${timeSlot === option ? "active" : ""}`} type="button" onClick={() => setTimeSlot(option)}>{option}</button>
            ))}
          </div>
        </section>

        <section className="nearby-form-card">
          <h3>4. Patient details</h3>
          <div className="nearby-input-grid">
            <input value={patientName} onChange={(event) => setPatientName(event.target.value)} placeholder="Patient name" />
            <input value={age} onChange={(event) => setAge(event.target.value)} placeholder="Age" inputMode="numeric" />
            <select value={gender} onChange={(event) => setGender(event.target.value)}>
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </section>

        <section className="nearby-form-card">
          <h3>5. Upload reports <span>(optional)</span></h3>
          <label className="nearby-upload-box">
            <FiPaperclip />
            <div>
              <strong>Add report or prescription</strong>
              <p>PDF, JPG or PNG. Metadata is attached to the request.</p>
            </div>
            <input type="file" multiple accept="image/*,.pdf" onChange={handleFiles} />
          </label>
          {files.length ? <p className="nearby-file-note"><FiFileText /> {files.length} file(s) selected</p> : null}
        </section>

        {error ? <div className="nearby-alert"><FiInfo /> {error}</div> : null}
        <div className="nearby-note"><FiInfo /> This is a booking request. Final slot and consultation price will be confirmed by Astikan.</div>

        <div className="nearby-form-actions">
          <button className="nearby-secondary-btn" type="button" onClick={() => navigate(-1)}>Back</button>
          <button className="nearby-primary-btn" type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</button>
        </div>
      </form>
    </main>
  )
}
