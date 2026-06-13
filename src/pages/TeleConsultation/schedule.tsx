import { useEffect, useMemo, useState } from "react"
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiStar } from "react-icons/fi"
import { useLocation, useNavigate } from "react-router-dom"
import { ensureEmployeeActor } from "../../services/actorsApi"
import { createAppointment } from "../../services/appointmentsApi"
import { getEmployeeCompanySession } from "../../services/authApi"
import { fetchDoctorProfile, type DoctorAvailabilitySlot } from "../../services/doctorsApi"
import { fetchPaymentQuote, initiatePayment, openCashfreeCheckout, verifyPayment, type PaymentQuote } from "../../services/paymentsApi"
import { addNotification } from "../../services/notificationCenter"
import { createTeleconsultSession } from "../../services/teleconsultApi"
import { goBackOrFallback } from "../../utils/navigation"
import "./tele-schedule.css"

type DoctorInfo = {
  id: string
  name: string
  specialty: string
  rating: number
  avatar: string
}

type TeleBooking = {
  id: string
  sessionId: string
  doctorId: string
  doctorName: string
  specialty: string
  doctorAvatar?: string
  status?: string
  scheduledAt: string
  joinWindowStart: string
}

const TELE_BOOKINGS_KEY = "teleconsult_bookings"
const DEFAULT_COMPANY_ID = "astikan-demo-company"

function getEmployeeRtcId() {
  const key = "astikan_employee_rtc_id"
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const generated = `emp-${Math.random().toString(36).slice(2, 10)}`
  localStorage.setItem(key, generated)
  return generated
}

async function ensureTeleconsultActors(doctor: DoctorInfo) {
  const companySession = getEmployeeCompanySession()
  const employeeHandle = getEmployeeRtcId()
  const employee = await ensureEmployeeActor({
    companyReference: companySession?.companyId ?? DEFAULT_COMPANY_ID,
    companyName: companySession?.companyName ?? "Astikan",
    email: `${employeeHandle}@employee.astikan.local`,
    fullName: "Astikan Employee",
    handle: employeeHandle,
    employeeCode: employeeHandle.toUpperCase(),
  })

  return {
    employee,
    doctor: {
      userId: doctor.id,
      email: doctor.name,
      fullName: doctor.name,
    },
  }
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short" })
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
}

function formatTime(minutes: number) {
  const h24 = Math.floor(minutes / 60)
  const mins = minutes % 60
  const h = h24 % 12 || 12
  const ampm = h24 >= 12 ? "PM" : "AM"
  return `${h.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${ampm}`
}

function slotToDate(base: Date, slotLabel: string) {
  const parts = slotLabel.trim().split(" ")
  if (parts.length < 2) return null
  const [timePart, ampm] = parts
  const [rawHour, rawMinute] = timePart.split(":").map(Number)
  if (!Number.isFinite(rawHour) || !Number.isFinite(rawMinute)) return null
  let hour = rawHour % 12
  if (ampm.toUpperCase() === "PM") hour += 12
  const scheduled = new Date(base)
  scheduled.setHours(hour, rawMinute, 0, 0)
  return scheduled
}

function getWeekDays(anchor: Date) {
  const dayIndex = (anchor.getDay() + 6) % 7
  const monday = addDays(startOfDay(anchor), -dayIndex)
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

const fallbackSlotMinutes = Array.from({ length: 14 }, (_, i) => 9 * 60 + i * 30)

function parseTimeToMinutes(value: string) {
  const parts = value.split(":")
  const hour = Number(parts[0])
  const minute = Number(parts[1] ?? 0)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return hour * 60 + minute
}

function buildSlotsForAvailability(
  availability: DoctorAvailabilitySlot[],
  selectedDate: Date,
  mode: "tele" | "opd",
) {
  const day = selectedDate.getDay()
  const type = mode === "tele" ? "virtual" : "physical"
  const filtered = availability.filter(
    (slot) =>
      slot.availability_type === type &&
      (slot.is_active ?? true) &&
      slot.day_of_week === day,
  )
  if (!filtered.length) return [] as Array<{ label: string; minutes: number }>

  const slots: Array<{ label: string; minutes: number }> = []
  filtered.forEach((slot) => {
    const start = parseTimeToMinutes(slot.start_time)
    const end = parseTimeToMinutes(slot.end_time)
    if (start === null || end === null || end <= start) return
    const step = Math.max(15, Number(slot.slot_minutes ?? 30))
    for (let mins = start; mins + step <= end; mins += step) {
      slots.push({ label: formatTime(mins), minutes: mins })
    }
  })

  return slots
}

export default function TeleSchedule() {
  const navigate = useNavigate()
  const { state } = useLocation() as {
    state?: {
      doctor?: DoctorInfo
      mode?: "tele" | "opd"
      analysisQuery?: string
      selectedSymptoms?: string[]
    }
  }

  const doctor = useMemo<DoctorInfo>(
    () =>
      state?.doctor ?? {
        id: "riza",
        name: "Dr. Riza Yuhi",
        specialty: "Internal Medicine",
        rating: 4.9,
        avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
      },
    [state?.doctor],
  )

  const mode = state?.mode ?? "tele"
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()))
  const [selectedSlot, setSelectedSlot] = useState("")
  const [availability, setAvailability] = useState<DoctorAvailabilitySlot[]>([])
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"CASHFREE" | "COD">("CASHFREE")
  const [quote, setQuote] = useState<PaymentQuote | null>(null)
  const [paymentError, setPaymentError] = useState("")

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const monthYear = useMemo(() => formatMonthYear(selectedDate), [selectedDate])
  const consultationAmount = mode === "opd" ? 699 : 499

  useEffect(() => {
    let active = true
    setAvailabilityLoaded(false)
    if (!doctor?.id) return
    void fetchDoctorProfile(doctor.id)
      .then((profile) => {
        if (!active) return
        setAvailability(profile?.doctor_availability ?? [])
      })
      .catch(() => {
        if (!active) return
        setAvailability([])
      })
      .finally(() => {
        if (active) setAvailabilityLoaded(true)
      })

    return () => {
      active = false
    }
  }, [doctor?.id])

  useEffect(() => {
    void fetchPaymentQuote(mode === "opd" ? "opd" : "teleconsult", consultationAmount).then(setQuote).catch(() => undefined)
  }, [mode, consultationAmount])

  const availableSlots = useMemo(() => {
    const today = startOfDay(new Date()).getTime()
    const selectedDay = startOfDay(selectedDate).getTime()
    const now = new Date()

    const dynamicSlots = buildSlotsForAvailability(availability, selectedDate, mode)
    const baseSlots = dynamicSlots.length
      ? dynamicSlots
      : fallbackSlotMinutes.map((mins) => ({ label: formatTime(mins), minutes: mins }))

    return baseSlots.map((slot) => {
      const slotDate = new Date(selectedDate)
      slotDate.setHours(Math.floor(slot.minutes / 60), slot.minutes % 60, 0, 0)
      const disabled = selectedDay === today && slotDate.getTime() <= now.getTime()
      return { label: slot.label, disabled }
    })
  }, [availability, selectedDate, mode])

  useEffect(() => {
    setSelectedSlot((prev) => {
      const stillValid = availableSlots.find((s) => s.label === prev && !s.disabled)
      if (stillValid) return prev
      const firstAvailable = availableSlots.find((s) => !s.disabled)
      return firstAvailable?.label ?? ""
    })
  }, [availableSlots])

  function moveWeek(direction: "prev" | "next") {
    setSelectedDate((prev) => addDays(prev, direction === "next" ? 7 : -7))
  }

  async function bookAppointment() {
    if (!selectedSlot) return
    setPaymentError("")
    const serviceType = mode === "opd" ? "opd" : "teleconsult"

    if (mode === "opd") {
      navigate("/teleconsultation/pickup", {
        state: {
          doctor,
          analysisQuery: state?.analysisQuery ?? "",
          selectedSymptoms: state?.selectedSymptoms ?? [],
          scheduledDay: formatFullDate(selectedDate),
          scheduledTime: selectedSlot,
        },
      })
      return
    }

    const scheduled = slotToDate(selectedDate, selectedSlot)
    if (!scheduled) return

    let booking: TeleBooking | null = null
    try {
      const actors = await ensureTeleconsultActors(doctor)
      const payment = await initiatePayment({
        serviceType,
        amountInr: consultationAmount,
        paymentMethod,
        metadata: {
          employeeName: "Astikan Employee",
          employeeEmail: actors.employee.email,
          employeePhone: actors.employee.phone ?? "9999999999",
          doctorName: doctor.name,
          specialty: doctor.specialty,
        },
      })
      if (paymentMethod === "CASHFREE" && payment.paymentSessionId) {
        await openCashfreeCheckout(payment.paymentSessionId, payment.cashfreeOrderId)
      }
      const end = new Date(scheduled.getTime() + 30 * 60 * 1000)
      const appointment = await createAppointment({
        companyId: actors.employee.companyId,
        employeeId: actors.employee.employeeUserId,
        doctorId: actors.doctor.userId,
        createdByUserId: actors.employee.employeeUserId,
        appointmentType: "teleconsult",
        source: "employee_booked",
        scheduledStart: scheduled.toISOString(),
        scheduledEnd: end.toISOString(),
        meetingJoinWindowStart: new Date(scheduled.getTime() - 60 * 1000).toISOString(),
        meetingJoinWindowEnd: end.toISOString(),
        status: "confirmed",
        reason: doctor.specialty,
        patientSummary: "Scheduled consultation",
        symptomSnapshot: { scheduled: true },
      })
      await verifyPayment(payment.transactionId, payment.cashfreeOrderId ?? null, appointment.appointmentId)
      const created = await createTeleconsultSession({
        companyId: actors.employee.companyId,
        employeeId: actors.employee.employeeUserId,
        doctorId: actors.doctor.userId,
        appointmentId: appointment.appointmentId,
        scheduledAt: scheduled.toISOString(),
      })

      booking = {
        id: appointment.appointmentId,
        sessionId: created.sessionId,
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        doctorAvatar: doctor.avatar,
        status: "confirmed",
        scheduledAt: scheduled.toISOString(),
        joinWindowStart: new Date(scheduled.getTime() - 60 * 1000).toISOString(),
      }
      const existing = JSON.parse(localStorage.getItem(TELE_BOOKINGS_KEY) || "[]") as TeleBooking[]
      localStorage.setItem(TELE_BOOKINGS_KEY, JSON.stringify([booking, ...existing].slice(0, 20)))

      await addNotification({
        title: "Teleconsultation booked",
        body: `Your call with ${doctor.name} is booked. Join will open 1 minute before time.`,
        channel: "consult",
        cta: { label: "Join Call", route: "/teleconsultation" },
        joinWindowStart: booking.joinWindowStart,
        teleconsultSessionId: booking.sessionId,
        doctorId: booking.doctorId,
        scheduledAt: booking.scheduledAt,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "We could not create your booking right now."
      if (message.toLowerCase().includes("payment not completed")) {
        setPaymentError("Payment was not completed, so the consultation was not booked.")
        return
      }
      setPaymentError(message)
      return
    }

    if (booking) {
      navigate("/teleconsultation/confirm", { state: { booking } })
    } else {
      setPaymentError("Booking did not complete. Please try again.")
    }
  }

  return (
    <main className="tele-schedule-page app-page-enter">
      <header className="tele-schedule-header app-fade-stagger">
        <button className="tele-schedule-back app-pressable" onClick={() => goBackOrFallback(navigate)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>Schedule Appointment</h1>
        </div>
      </header>

      <section className="tele-schedule-content app-content-slide">
        <section className="tele-schedule-hero app-fade-stagger">
          <article className="tele-doctor-hero-card">
            <div className="tele-doctor-copy">
              <p>{doctor.specialty}</p>
              <h2>{doctor.name}</h2>
              <span className="doctor-id-pill">ID: 32145687</span>
              <span className="doctor-rating-pill"><FiStar /> Rating {doctor.rating.toFixed(1)}</span>
            </div>
            <img src={doctor.avatar} alt={doctor.name} loading="lazy" />
          </article>
        </section>

        {quote && (
          <section className="tele-calendar-card app-fade-stagger">
            <section className="tele-calendar-head">
              <h3>Payment</h3>
            </section>
            <div className="tele-payment-grid">
              <div className="tele-payment-line"><span>Consultation fee</span><strong>₹{quote.grossAmountInr.toFixed(2)}</strong></div>
              <div className="tele-payment-line"><span>Astikan wallet benefit ({quote.discountPercent}% today)</span><strong>-₹{quote.walletUsableInr.toFixed(2)}</strong></div>
              {quote.cashbackMessage ? <div className="tele-payment-line"><span>Benefit note</span><strong>{quote.cashbackMessage}</strong></div> : null}
              <div className="tele-payment-line total"><span>Pay now</span><strong>₹{quote.payableAmountInr.toFixed(2)}</strong></div>
              <div className="payment-pill-row">
                <button type="button" disabled={quote.cashfreeEnabled === false} className={`payment-pill ${paymentMethod === "CASHFREE" ? "active" : ""}`} onClick={() => setPaymentMethod("CASHFREE")}>Pay Online</button>
                <button type="button" disabled={quote.codEnabled === false} className={`payment-pill ${paymentMethod === "COD" ? "active" : ""}`} onClick={() => setPaymentMethod("COD")}>Pay at Desk</button>
              </div>
              {paymentError ? <div className="tele-payment-error">{paymentError}</div> : null}
            </div>
          </section>
        )}

        <section className="tele-calendar-card app-fade-stagger">
          <section className="tele-calendar-head">
            <h3>{monthYear}</h3>
            <div>
              <button className="month-nav app-pressable" type="button" aria-label="Previous week" onClick={() => moveWeek("prev")}><FiChevronLeft /></button>
              <button className="month-nav app-pressable" type="button" aria-label="Next week" onClick={() => moveWeek("next")}><FiChevronRight /></button>
            </div>
          </section>

          <section className="tele-day-row">
            {weekDays.map((day) => {
              const active = startOfDay(day).getTime() === startOfDay(selectedDate).getTime()
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`tele-day-chip app-pressable ${active ? "active" : ""}`}
                  onClick={() => setSelectedDate(startOfDay(day))}
                >
                  <span>{formatDayLabel(day)}</span>
                  <strong>{day.getDate()}</strong>
                </button>
              )
            })}
          </section>
        </section>

        <section className="tele-slot-card app-fade-stagger">
          <header>
            <h4>Today, Availability</h4>
            <span>{availableSlots.filter((s) => !s.disabled).length} Slots</span>
          </header>

          <div className="tele-slot-grid">
            {!availableSlots.length && availabilityLoaded && (
              <p className="tele-slot-empty">Doctor availability not set. Please choose another date.</p>
            )}
            {availableSlots.map((slot) => (
              <button
                key={slot.label}
                type="button"
                className={`tele-slot app-pressable ${selectedSlot === slot.label ? "active" : ""}`}
                onClick={() => setSelectedSlot(slot.label)}
                disabled={slot.disabled}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </section>
      </section>

      <footer className="tele-schedule-footer app-fade-stagger">
        <button className="tele-book-btn app-pressable" type="button" onClick={bookAppointment} disabled={!selectedSlot}>
          Book Appointment
        </button>
      </footer>
    </main>
  )
}
