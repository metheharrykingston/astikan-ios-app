import { useEffect, useMemo, useRef, useState } from "react"
import {
  FiActivity,
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDroplet,
  FiFilter,
  FiHeart,
  FiMapPin,
  FiSearch,
  FiShield,
  FiStar,
  FiUser,
  FiVideo,
  FiVideoOff,
  FiMic,
  FiMicOff,
  FiVolume2,
  FiVolumeX,
  FiPhoneOff,
} from "react-icons/fi"
import type { ReactElement } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { consumeVoiceAutomation, subscribeVoiceAutomation } from "../../app/voiceAutomation"
import { goBackOrFallback } from "../../utils/navigation"
import { armAudioContext, playAppSound } from "../../utils/sound"
import { ensureEmployeeActor } from "../../services/actorsApi"
import { createAppointment } from "../../services/appointmentsApi"
import { getEmployeeCompanySession } from "../../services/authApi"
import { fetchDoctors as fetchDoctorDirectory, type DirectoryDoctor } from "../../services/doctorsApi"
import { createTeleconsultSession, joinTeleconsultSession } from "../../services/teleconsultApi"
import { consumeTeleconsultPaidAccess } from "../../services/teleconsultPaidApi"
import { addNotification } from "../../services/notificationCenter"
import { getAuthToken } from "../../services/api"
import "./teleconsultation.css"

type Doctor = {
  id: string
  listKey: string
  name: string
  specialty: string
  rating: number
  reviews: number
  distance: string
  eta: string
  fee: number
  avatar: string
  fallbackAvatar: string
  practiceAddress?: string | null
}

type JourneyStep = "options" | "ride" | "video"
type ConsultMode = "tele" | "opd"
type CallState = "ready" | "connecting" | "live" | "ended" | "failed"
type FeelingDoctor = {
  name: string
  avatar: string
  phone?: string
}
type TeleNavState = {
  fromAiAnalyser?: boolean
  preselectedSpecialty?: Doctor["specialty"]
  selectedSymptoms?: string[]
  analysisQuery?: string
  recommendedMode?: ConsultMode
  selectedDoctorId?: string
  teleconsultSessionId?: string
  scheduledAt?: string
  bookingId?: string
  startRide?: boolean
  startVideo?: boolean
  autoJoin?: boolean
  prepaidAccess?: boolean
  paidAccessFeelingId?: string
  sessionDurationMinutes?: number
  featuredDoctor?: FeelingDoctor
  autoStartPaidConsult?: boolean
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
  durationMinutes?: number
  mode?: "tele" | "opd"
}

const TELE_BOOKINGS_KEY = "teleconsult_bookings"

const DEMO_DOCTORS: Array<{
  handle: string
  fullName: string
  specialization: string
  avatar: string
  distance: string
  eta: string
  fee: number
  rating: number
  reviews: number
}> = [
  { handle: "subodh", fullName: "Dr. Subodh Chandra", specialization: "Internal Medicine", avatar: "/assets/doctors/doctor-1.webp", distance: "2.5 km away", eta: "15 mins", fee: 0, rating: 4.8, reviews: 126 },
  { handle: "pawan", fullName: "Dr. Pawan Kr. Gupta", specialization: "Internal Medicine", avatar: "/assets/doctors/doctor-2.webp", distance: "3.2 km away", eta: "20 mins", fee: 500, rating: 4.7, reviews: 89 },
  { handle: "neha", fullName: "Dr. Neha Sharma", specialization: "Internal Medicine", avatar: "/assets/doctors/doctor-3.webp", distance: "1.8 km away", eta: "12 mins", fee: 400, rating: 4.6, reviews: 64 },
  { handle: "rohit", fullName: "Dr. Rohit Verma", specialization: "Internal Medicine", avatar: "/assets/doctors/doctor-4.webp", distance: "2.9 km away", eta: "18 mins", fee: 300, rating: 4.5, reviews: 52 },
  { handle: "sarah", fullName: "Dr. Sarah Chen", specialization: "Cardiology", avatar: "/assets/doctors/doctor-5.webp", distance: "3.2 km away", eta: "20 mins", fee: 500, rating: 4.7, reviews: 91 },
  { handle: "isha", fullName: "Dr. Isha Kapoor", specialization: "Dermatology", avatar: "/assets/doctors/doctor-6.webp", distance: "1.6 km away", eta: "11 mins", fee: 450, rating: 4.6, reviews: 77 },
]
const MAX_JOIN_RETRIES = 3
const JOIN_RETRY_DELAY_MS = 1200
const DEFAULT_COMPANY_ID = "astikan-demo-company"
const TELE_FREE_OFFER_KEY = "teleconsult_free_offer"


function resolveAvatarUrl(avatar: string | null | undefined, fallback: string) {
  if (!avatar) return fallback
  const trimmed = avatar.trim()
  if (!trimmed) return fallback
  if (trimmed.startsWith("http") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed
  }
  if (trimmed.startsWith("/")) {
    return trimmed
  }
  return `/assets/${trimmed.replace(/^assets\//, "")}`
}

function handleDoctorAvatarError(event: React.SyntheticEvent<HTMLImageElement>, fallback: string) {
  const img = event.currentTarget
  if (img.dataset.fallbackTried === "true") {
    img.style.display = "none"
    return
  }
  img.dataset.fallbackTried = "true"
  if (fallback && img.src !== fallback) {
    img.src = fallback
    return
  }
  img.style.display = "none"
}

function isDoctorFreeForCurrentFlow(doctor: Doctor | null, mode: ConsultMode, teleOfferActive: boolean) {
  if (!doctor) return false
  return teleOfferActive && mode === "tele" && doctor.specialty === "Internal Medicine"
}

function getEmployeeRtcId() {
  const key = "astikan_employee_rtc_id"
  const existing = localStorage.getItem(key)
  if (existing) {
    return existing
  }
  const generated = `emp-${Math.random().toString(36).slice(2, 10)}`
  localStorage.setItem(key, generated)
  return generated
}

async function ensureTeleconsultActors(doctor: Doctor) {
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

export default function TeleConsultation() {
  const navigate = useNavigate()
  const location = useLocation()
  const incomingState = location.state as TeleNavState | undefined
  const [step, setStep] = useState<JourneyStep>(() => {
    if (incomingState?.startRide) return "ride"
    return "options"
  })
  const [query, setQuery] = useState("")
  const [analysisQuery, setAnalysisQuery] = useState(() => incomingState?.analysisQuery ?? "")
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(() => incomingState?.selectedSymptoms ?? [])
  const [activeSpecialty, setActiveSpecialty] = useState<Doctor["specialty"] | "All Specialties">(
    () => incomingState?.preselectedSpecialty ?? "All Specialties",
  )
  const [mode, setMode] = useState<ConsultMode>(() => {
    if (incomingState?.startRide) return "opd"
    return incomingState?.recommendedMode ?? "tele"
  })
  const [selectedDoctor, setSelectedDoctor] = useState(() => incomingState?.selectedDoctorId ?? "")
  const [, setRidePhase] = useState(0)
  const [, setRideProgress] = useState(0)
  const [rideBanner, setRideBanner] = useState<"booked" | "onway" | "reached" | null>(null)
  const [showRideMap, setShowRideMap] = useState(false)
  const [callState, setCallState] = useState<CallState>("ready")
  const [callError, setCallError] = useState("")
  const [mediaError, setMediaError] = useState("")
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [remoteJoined, setRemoteJoined] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showDoctors, setShowDoctors] = useState(false)
  const [isBookingNow, setIsBookingNow] = useState(false)
  const [bookingError, setBookingError] = useState("")
  const [teleconsultSessionId, setTeleconsultSessionId] = useState("")
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [joinReady, setJoinReady] = useState(true)
  const [autoJoin, setAutoJoin] = useState(false)
  const autoStartPaidConsultRef = useRef(Boolean(incomingState?.autoStartPaidConsult))
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [doctorOffset, setDoctorOffset] = useState(0)
  const [doctorHasMore, setDoctorHasMore] = useState(true)
  const [doctorLoading, setDoctorLoading] = useState(false)
  const [teleOfferActive, setTeleOfferActive] = useState(false)
  const prepaidConsultActive = Boolean(incomingState?.prepaidAccess)
  const consultDurationMinutes = prepaidConsultActive ? Math.max(5, Number(incomingState?.sessionDurationMinutes ?? 15) || 15) : 30
  const maxTeleconsultSeconds = consultDurationMinutes * 60
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const connectTimerRef = useRef<number | null>(null)
  const callClockRef = useRef<number | null>(null)
  const callExitHandledRef = useRef(false)
  const pendingVoiceBookRef = useRef<{ doctorId?: string; mode?: "tele" | "opd" } | null>(null)

  const selectedDoctorInfo = doctors.find((doctor) => doctor.id === selectedDoctor) ?? null
  const effectiveStep: JourneyStep = step === "video" && !selectedDoctorInfo ? "options" : step
  const joinWindowStart = useMemo(() => {
    if (!scheduledAt) return null
    const scheduledMs = Date.parse(scheduledAt)
    if (!Number.isFinite(scheduledMs)) return null
    return new Date(scheduledMs - 60 * 1000)
  }, [scheduledAt])
  const joinWindowLabel = joinWindowStart
    ? joinWindowStart.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    : null
  const rideDoctor = selectedDoctorInfo ?? doctors[0] ?? {
    id: "assigned",
    name: "Assigned Doctor",
    specialty: "Internal Medicine",
    rating: 4.7,
    reviews: 80,
    distance: "2.5 km away",
    eta: "15 mins",
    fee: 28,
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=160&q=80",
    fallbackAvatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=160&q=80",
    practiceAddress: null,
  }

  const PAGE_SIZE = 12

  const mapDoctorRows = (rows: DirectoryDoctor[], offset = 0) =>
    rows.map((row, index) => {
      const fallback = DEMO_DOCTORS[index % DEMO_DOCTORS.length]
      const fallbackAvatar = fallback.avatar
      return {
        id: row.user_id,
        listKey: `${row.user_id}-${offset + index}`,
        name: row.full_name ?? row.full_display_name ?? fallback.fullName,
        specialty: row.doctor_specializations?.[0]?.specialization_name ?? fallback.specialization,
        rating: Number(row.rating_avg ?? fallback.rating),
        reviews: Number(row.rating_count ?? fallback.reviews),
        distance: fallback.distance,
        eta: fallback.eta,
        fee: Number(row.consultation_fee_inr ?? fallback.fee),
        avatar: resolveAvatarUrl(row.avatar_url, fallbackAvatar),
        fallbackAvatar,
        practiceAddress: row.practice_address ?? null,
      }
    })

  async function loadDoctors(reset = false) {
    if (doctorLoading) return
    setDoctorLoading(true)
    try {
      const offset = reset ? 0 : doctorOffset
      const rows = await fetchDoctorDirectory({
        limit: PAGE_SIZE,
        offset,
      })
      const mapped = mapDoctorRows(rows, offset)
      if (reset) {
        setDoctors(mapped)
      } else {
        setDoctors((prev) => [...prev, ...mapped])
      }
      const nextOffset = offset + mapped.length
      setDoctorOffset(nextOffset)
      setDoctorHasMore(mapped.length === PAGE_SIZE)
      if (!selectedDoctor && mapped[0]) {
        setSelectedDoctor(mapped[0].id)
      }
    } catch {
      if (reset) {
        setDoctors(
          DEMO_DOCTORS.map((doctor, index) => ({
            id: doctor.handle,
            listKey: `${doctor.handle}-${index}`,
            name: doctor.fullName,
            specialty: doctor.specialization,
            rating: doctor.rating,
            reviews: doctor.reviews,
            distance: doctor.distance,
            eta: doctor.eta,
            fee: doctor.fee,
            avatar: doctor.avatar,
            fallbackAvatar: doctor.avatar,
            practiceAddress: null,
          })),
        )
        setDoctorHasMore(false)
      }
    } finally {
      setDoctorLoading(false)
    }
  }

  useEffect(() => {
    setDoctorOffset(0)
    setDoctorHasMore(true)
    void loadDoctors(true)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TELE_FREE_OFFER_KEY)
      if (!raw) {
        setTeleOfferActive(false)
        return
      }
      const parsed = JSON.parse(raw) as { active?: boolean; activeUntil?: string | null }
      const isActiveByDate = parsed.activeUntil ? Date.parse(parsed.activeUntil) > Date.now() : false
      setTeleOfferActive(Boolean(parsed.active || isActiveByDate))
    } catch {
      setTeleOfferActive(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!loadMoreRef.current) return () => {}
    const observer = new IntersectionObserver(
      (entries) => {
        if (!active) return
        if (entries.some((entry) => entry.isIntersecting) && doctorHasMore && !doctorLoading) {
          void loadDoctors(false)
        }
      },
      { rootMargin: "200px" },
    )
    observer.observe(loadMoreRef.current)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [doctorHasMore, doctorLoading])

  const specialtyFilters = useMemo(() => {
    const base = ["Internal Medicine", "Cardiology", "Dermatology", "Pulmonology"]
    const unique = Array.from(new Set([...base, ...doctors.map((doctor) => doctor.specialty)]))
    return ["All Specialties", ...unique] as const
  }, [doctors])

  const specialtyIcons = useMemo<Record<string, ReactElement>>(
    () => ({
      "All Specialties": <FiShield />,
      "Internal Medicine": <FiActivity />,
      Cardiology: <FiHeart />,
      Dermatology: <FiDroplet />,
      Pulmonology: <FiActivity />,
    }),
    [],
  )

  const visibleDoctors = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = doctors.filter((doctor) => {
      const bySpecialty = activeSpecialty === "All Specialties" || doctor.specialty === activeSpecialty
      const byText = !q || doctor.name.toLowerCase().includes(q) || doctor.specialty.toLowerCase().includes(q)
      return bySpecialty && byText
    })
    const prioritized = [...filtered].sort((a, b) => {
      const aFree = teleOfferActive && mode === "tele" && a.specialty === "Internal Medicine" ? 1 : 0
      const bFree = teleOfferActive && mode === "tele" && b.specialty === "Internal Medicine" ? 1 : 0
      if (aFree !== bFree) return bFree - aFree
      if (a.fee !== b.fee) return a.fee - b.fee
      return b.rating - a.rating
    })
    if (prioritized.length >= 2) return prioritized
    if (prioritized.length > 0) return prioritized
    return []
  }, [doctors, activeSpecialty, query, teleOfferActive, mode])

  useEffect(() => {
    const state = location.state as TeleNavState | undefined

    if (!state) return

    if (state.analysisQuery) setAnalysisQuery(state.analysisQuery)
    if (Array.isArray(state.selectedSymptoms) && state.selectedSymptoms.length > 0) {
      setSelectedSymptoms(state.selectedSymptoms)
    }
    if (state.preselectedSpecialty) {
      setActiveSpecialty(state.preselectedSpecialty)
    }
    if (state.recommendedMode) setMode(state.recommendedMode)

    if (state.fromAiAnalyser) {
      setStep("options")
    }

    if (state.selectedDoctorId) setSelectedDoctor(state.selectedDoctorId)
    if (state.teleconsultSessionId) setTeleconsultSessionId(state.teleconsultSessionId)
    if (state.scheduledAt) setScheduledAt(state.scheduledAt)
    if (state.bookingId) setBookingId(state.bookingId)
    if (state.startVideo) {
      setMode("tele")
      setStep("video")
      setCallState("ready")
      setCallError("")
      setMediaError("")
      setAutoJoin(Boolean(state.autoJoin))
      return
    }
    if (state.startRide) {
      setMode("opd")
      setStep("ride")
      setRidePhase(0)
      return
    }
  }, [location.state])

  useEffect(() => {
    if (!autoJoin || step !== "video" || !joinReady) return
    if (callState !== "ready") return
    setAutoJoin(false)
    void startWebRtcCall()
  }, [autoJoin, callState, joinReady, step])

  useEffect(() => {
    if (step !== "options") return
    setShowDoctors(false)
    const timer = window.setTimeout(() => setShowDoctors(true), 280)
    return () => window.clearTimeout(timer)
  }, [mode, step])

  useEffect(() => {
    if (!selectedDoctor && visibleDoctors[0]) {
      setSelectedDoctor(visibleDoctors[0].id)
    }
  }, [selectedDoctor, visibleDoctors])

  useEffect(() => {
    if (!prepaidConsultActive || !incomingState?.featuredDoctor?.name || doctors.length === 0) return
    const target = incomingState.featuredDoctor.name.toLowerCase()
    const byName = doctors.find((doctor) => doctor.name.toLowerCase().includes(target))
    if (byName && (!selectedDoctor || autoStartPaidConsultRef.current)) {
      setSelectedDoctor(byName.id)
    }
  }, [doctors, incomingState, prepaidConsultActive, selectedDoctor])

  useEffect(() => {
    if (!prepaidConsultActive || !autoStartPaidConsultRef.current || !selectedDoctorInfo || isBookingNow) return
    autoStartPaidConsultRef.current = false
    setMode("tele")
    setStep("options")
    void continueJourney(selectedDoctorInfo)
  }, [isBookingNow, prepaidConsultActive, selectedDoctorInfo])

  useEffect(() => {
    if (!selectedDoctorInfo) return
    setBookingError("")
  }, [selectedDoctorInfo])

  useEffect(() => {
    function applyVoiceBookingCommand() {
      const command = consumeVoiceAutomation("teleconsult-book")
      if (!command) return
      if (command.payload.doctorId) {
        setSelectedDoctor(command.payload.doctorId)
      }
      if (command.payload.mode) {
        setMode(command.payload.mode)
      }
      pendingVoiceBookRef.current = command.payload
    }

    applyVoiceBookingCommand()
    return subscribeVoiceAutomation(applyVoiceBookingCommand)
  }, [])

  useEffect(() => {
    if (!pendingVoiceBookRef.current || !selectedDoctorInfo || isBookingNow) return
    if (pendingVoiceBookRef.current.doctorId && pendingVoiceBookRef.current.doctorId !== selectedDoctorInfo.id) return
    if (pendingVoiceBookRef.current.mode && pendingVoiceBookRef.current.mode !== mode) return
    pendingVoiceBookRef.current = null
    void continueJourney()
  }, [isBookingNow, mode, selectedDoctorInfo])

  useEffect(() => {
    if (step !== "video") return
    if (selectedDoctorInfo) return
    if (doctors.length > 0) {
      setSelectedDoctor(doctors[0].id)
      return
    }
    if (teleconsultSessionId || bookingId) return
    setStep("options")
  }, [doctors, selectedDoctorInfo, step, teleconsultSessionId, bookingId])

  useEffect(() => {
    if (step !== "ride" || !selectedDoctorInfo) return

    setRidePhase(0)
    setRideProgress(0)
    setRideBanner("booked")

    let intervalId = 0
    const onWayTimer = window.setTimeout(() => setRideBanner("onway"), 1300)
    const progressTimer = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setRideProgress((prev) => {
          const next = Math.min(prev + 10, 100)
          if (next >= 100) {
            window.clearInterval(intervalId)
            setRidePhase(2)
            setRideBanner("reached")
            return next
          }
          if (next >= 45 && next < 85) setRidePhase(1)
          if (next >= 85) setRidePhase(2)
          return next
        })
      }, 900)
    }, 1800)

    return () => {
      window.clearTimeout(onWayTimer)
      window.clearTimeout(progressTimer)
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [step, selectedDoctorInfo])

  useEffect(() => {
    return () => {
      if (connectTimerRef.current) window.clearTimeout(connectTimerRef.current)
      if (callClockRef.current) window.clearInterval(callClockRef.current)
      teardownRealtimeCall()
    }
  }, [])

  useEffect(() => {
    if (step === "video") {
      callExitHandledRef.current = false
      setCallState("ready")
      setCallError("")
      setMediaError("")
      setMicOn(true)
      setCameraOn(true)
      setSpeakerOn(true)
      setRemoteJoined(false)
    }
  }, [step])

  useEffect(() => {
    const remoteVideo = remoteVideoRef.current
    if (!remoteVideo) return
    remoteVideo.muted = !speakerOn
    remoteVideo.volume = speakerOn ? 1 : 0
  }, [speakerOn, remoteJoined])

  useEffect(() => {
    if (step !== "video" || !joinWindowStart) {
      setJoinReady(true)
      return
    }
    const now = Date.now()
    const openAt = joinWindowStart.getTime()
    if (now >= openAt) {
      setJoinReady(true)
      return
    }
    setJoinReady(false)
    const timer = window.setTimeout(() => setJoinReady(true), openAt - now)
    return () => window.clearTimeout(timer)
  }, [step, joinWindowStart])

  useEffect(() => {
    if (step !== "video" || joinReady) return
    if (bookingId) {
      navigate(`/teleconsultation/overview/${bookingId}`, { replace: true })
    }
  }, [step, joinReady, bookingId, navigate])

  useEffect(() => {
    const onArm = () => {
      armAudioContext()
      window.removeEventListener("pointerdown", onArm)
      window.removeEventListener("keydown", onArm)
    }
    window.addEventListener("pointerdown", onArm, { once: true })
    window.addEventListener("keydown", onArm, { once: true })
    return () => {
      window.removeEventListener("pointerdown", onArm)
      window.removeEventListener("keydown", onArm)
    }
  }, [])

  useEffect(() => {
    if (effectiveStep !== "video") return
    if (!joinReady) return
    if (callState !== "ready") return
    const timer = window.setTimeout(() => {
      setAutoJoin(true)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [effectiveStep, joinReady, callState])

  function exitCallToPreviousScreen() {
    if (callExitHandledRef.current) {
      return
    }
    callExitHandledRef.current = true
    goBackOrFallback(navigate)
  }

  // WebRTC join flow uses startWebRtcCall.

  // Join is now user-initiated from the waiting room UI.

  async function ensureTeleconsultSession(doctorId: string) {
    if (teleconsultSessionId) {
      return teleconsultSessionId
    }
    const selectedDoctorRecord = doctors.find((doctor) => doctor.id === doctorId)
    if (!selectedDoctorRecord) {
      throw new Error("Doctor not found")
    }
    const actors = await ensureTeleconsultActors(selectedDoctorRecord)
    const now = new Date()
    const start = now.toISOString()
    const end = new Date(now.getTime() + consultDurationMinutes * 60 * 1000).toISOString()
    const appointment = await createAppointment({
      companyId: actors.employee.companyId,
      employeeId: actors.employee.employeeUserId,
      doctorId: actors.doctor.userId,
      createdByUserId: actors.employee.employeeUserId,
      appointmentType: "teleconsult",
      source: "employee_booked",
      scheduledStart: start,
      scheduledEnd: end,
      meetingJoinWindowStart: new Date(now.getTime() - 60 * 1000).toISOString(),
      meetingJoinWindowEnd: end,
      status: "confirmed",
      reason: analysisQuery || selectedDoctorRecord.specialty,
      patientSummary: selectedSymptoms.join(", "),
      symptomSnapshot: { selectedSymptoms },
      aiTriageSummary: analysisQuery || undefined,
    })
    const created = await createTeleconsultSession({
      companyId: actors.employee.companyId,
      employeeId: actors.employee.employeeUserId,
      doctorId: actors.doctor.userId,
      appointmentId: appointment.appointmentId,
    })
    setTeleconsultSessionId(created.sessionId)
    return created.sessionId
  }

  async function continueJourney(doctorOverride?: Doctor) {
    const activeDoctor = doctorOverride ?? selectedDoctorInfo
    if (!activeDoctor) return
    const activeDoctorIsFree = isDoctorFreeForCurrentFlow(activeDoctor, mode, teleOfferActive)
    const activeDoctorRequiresPayment = !prepaidConsultActive && !activeDoctorIsFree && activeDoctor.fee > 0
    if (doctorOverride && selectedDoctor !== doctorOverride.id) setSelectedDoctor(doctorOverride.id)
    if (activeDoctorRequiresPayment) {
      navigate("/teleconsultation/schedule", {
        state: {
          doctor: activeDoctor,
          mode,
          analysisQuery,
          selectedSymptoms,
        },
      })
      return
    }
    if (mode === "tele") {
      setIsBookingNow(true)
      setMediaError("")
      setBookingError("")
      let booking: TeleBooking | null = null
      let bookingFailed = false
      try {
        const now = new Date()
        const start = new Date(now.getTime())
        const end = new Date(start.getTime() + consultDurationMinutes * 60 * 1000)
        const actors = await ensureTeleconsultActors(activeDoctor)
        const appointment = await createAppointment({
          companyId: actors.employee.companyId,
          employeeId: actors.employee.employeeUserId,
          doctorId: actors.doctor.userId,
          createdByUserId: actors.employee.employeeUserId,
          appointmentType: "teleconsult",
          source: "employee_booked",
          scheduledStart: start.toISOString(),
          scheduledEnd: end.toISOString(),
          meetingJoinWindowStart: new Date(start.getTime()).toISOString(),
          meetingJoinWindowEnd: end.toISOString(),
          status: "confirmed",
          reason: analysisQuery || activeDoctor.specialty,
          patientSummary: selectedSymptoms.join(", "),
          symptomSnapshot: { selectedSymptoms },
          aiTriageSummary: analysisQuery || undefined,
        })
        if (prepaidConsultActive) {
          await consumeTeleconsultPaidAccess({
            appointmentId: appointment.appointmentId,
            doctorId: activeDoctor.id,
            feelingId: incomingState?.paidAccessFeelingId ?? null,
          }).catch(() => undefined)
        }
        const created = await createTeleconsultSession({
          companyId: actors.employee.companyId,
          employeeId: actors.employee.employeeUserId,
          doctorId: actors.doctor.userId,
          appointmentId: appointment.appointmentId,
          scheduledAt: start.toISOString(),
        })
        setTeleconsultSessionId(created.sessionId)
        setScheduledAt(start.toISOString())
        booking = {
          id: appointment.appointmentId,
          sessionId: created.sessionId,
          doctorId: activeDoctor.id,
          doctorName: activeDoctor.name,
          specialty: activeDoctor.specialty,
          doctorAvatar: activeDoctor.avatar,
          status: "confirmed",
          scheduledAt: start.toISOString(),
          joinWindowStart: new Date(start.getTime()).toISOString(),
          durationMinutes: consultDurationMinutes,
          mode: "tele",
        }
        const existing = JSON.parse(localStorage.getItem(TELE_BOOKINGS_KEY) || "[]") as TeleBooking[]
        localStorage.setItem(TELE_BOOKINGS_KEY, JSON.stringify([booking, ...existing].slice(0, 20)))
        await addNotification({
          title: "Teleconsultation booked",
          body: `Your call with ${activeDoctor.name} is booked. Join will open 1 minute before time.`,
          channel: "consult",
          cta: { label: "Join Call", route: `/teleconsultation/overview/${booking.id}` },
          joinWindowStart: booking.joinWindowStart,
          teleconsultSessionId: booking.sessionId,
          doctorId: booking.doctorId,
          scheduledAt: booking.scheduledAt,
        })
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : ""
        const message = rawMessage.toLowerCase().includes("temporarily") || rawMessage.toLowerCase().includes("network")
          ? "Booking service is taking longer than expected. Please retry once or schedule the appointment."
          : rawMessage || "We could not create your booking right now."
        setBookingError(message)
        bookingFailed = true
      } finally {
        setIsBookingNow(false)
      }
      if (booking) {
        if (prepaidConsultActive && incomingState?.autoJoin) {
          setBookingId(booking.id)
          setTeleconsultSessionId(booking.sessionId)
          setScheduledAt(booking.scheduledAt)
          setStep("video")
          setCallState("ready")
          setCallError("")
          setMediaError("")
          setAutoJoin(true)
          return
        }
        navigate("/teleconsultation/confirm", { state: { booking } })
      } else if (!bookingFailed) {
        setBookingError("Booking did not complete. Please try again.")
      }
      return
    }
    try {
      const actors = await ensureTeleconsultActors(activeDoctor)
      const now = new Date()
      const appointment = await createAppointment({
        companyId: actors.employee.companyId,
        employeeId: actors.employee.employeeUserId,
        doctorId: actors.doctor.userId,
        createdByUserId: actors.employee.employeeUserId,
        appointmentType: "opd",
        source: "employee_booked",
        scheduledStart: now.toISOString(),
        scheduledEnd: new Date(now.getTime() + consultDurationMinutes * 60 * 1000).toISOString(),
        status: "confirmed",
        reason: analysisQuery || activeDoctor.specialty,
        patientSummary: selectedSymptoms.join(", "),
        symptomSnapshot: { selectedSymptoms },
        aiTriageSummary: analysisQuery || undefined,
      })
      navigate("/teleconsultation/confirm", {
        state: {
          booking: {
            id: appointment.appointmentId,
            sessionId: "",
            doctorId: activeDoctor.id,
            doctorName: activeDoctor.name,
            specialty: activeDoctor.specialty,
            doctorAvatar: activeDoctor.avatar,
            status: "confirmed",
            scheduledAt: now.toISOString(),
            joinWindowStart: now.toISOString(),
            durationMinutes: consultDurationMinutes,
            mode: "opd",
          },
          nextPickup: true,
          doctor: activeDoctor,
          analysisQuery,
          selectedSymptoms,
        },
      })
      return
    } catch {
      // Keep OPD journey resilient even if appointment persistence is unavailable.
    }
    navigate("/teleconsultation/pickup", { state: { doctor: activeDoctor, analysisQuery, selectedSymptoms } })
  }

  function teardownRealtimeCall() {
    if (peerRef.current) {
      peerRef.current.ontrack = null
      peerRef.current.onicecandidate = null
      peerRef.current.close()
      peerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    setRemoteJoined(false)
  }

  function buildWsUrl(sessionId: string, participantId: string, role: "user" | "doctor") {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    const params = new URLSearchParams({ sessionId, participantId, role, token: getAuthToken() })
    return `${protocol}://${window.location.host}/ws/teleconsult?${params.toString()}`
  }

  function startLiveTimer() {
    if (callClockRef.current) window.clearInterval(callClockRef.current)
    callClockRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1
          if (next >= maxTeleconsultSeconds) {
            if (callClockRef.current) window.clearInterval(callClockRef.current)
            callClockRef.current = null
            setCallState("ended")
            teardownRealtimeCall()
            exitCallToPreviousScreen()
            return maxTeleconsultSeconds
          }
        return next
      })
    }, 1000)
  }

  async function startWebRtcCall() {
    let lastError: unknown = null

    for (let attempt = 0; attempt < MAX_JOIN_RETRIES; attempt += 1) {
      try {
        if (!selectedDoctorInfo) return

        const actors = await ensureTeleconsultActors(selectedDoctorInfo)
        const sessionId = teleconsultSessionId || (await ensureTeleconsultSession(selectedDoctorInfo.id))
        const joined = await joinTeleconsultSession(sessionId, {
          participantType: "employee",
          participantId: actors.employee.employeeUserId,
          allowEarlyJoin: true,
        })
        setTeleconsultSessionId(sessionId)
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
          localVideoRef.current.muted = true
          await localVideoRef.current.play().catch(() => undefined)
        }

        const peer = new RTCPeerConnection({ iceServers: joined.rtc.iceServers })
        peerRef.current = peer
        stream.getTracks().forEach((track) => peer.addTrack(track, stream))

        peer.ontrack = (event) => {
          const [remoteStream] = event.streams
          if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream
            void remoteVideoRef.current.play().catch(() => undefined)
            setRemoteJoined(true)
          }
        }

        const ws = new WebSocket(buildWsUrl(sessionId, actors.employee.employeeUserId, "user"))
        wsRef.current = ws

        ws.onmessage = async (message) => {
          try {
            const data = JSON.parse(message.data as string) as { type?: string; sdp?: string; candidate?: RTCIceCandidateInit }
            if (!data.type) return
            if (data.type === "offer" && data.sdp) {
              await peer.setRemoteDescription({ type: "offer", sdp: data.sdp })
              const answer = await peer.createAnswer()
              await peer.setLocalDescription(answer)
              ws.send(JSON.stringify({ type: "answer", sdp: answer.sdp }))
            }
            if (data.type === "answer" && data.sdp) {
              await peer.setRemoteDescription({ type: "answer", sdp: data.sdp })
            }
            if (data.type === "ice" && data.candidate) {
              await peer.addIceCandidate(data.candidate)
            }
            if (data.type === "peer-joined") {
              const offer = await peer.createOffer()
              await peer.setLocalDescription(offer)
              ws.send(JSON.stringify({ type: "offer", sdp: offer.sdp }))
            }
          } catch {
            // ignore malformed messages
          }
        }

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "join" }))
        }

        peer.onicecandidate = (event) => {
          if (event.candidate && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ice", candidate: event.candidate }))
          }
        }

        setCallState("live")
        playAppSound("notify")
        startLiveTimer()
        return
      } catch (error) {
        lastError = error
        if (attempt < MAX_JOIN_RETRIES - 1) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, JOIN_RETRY_DELAY_MS)
          })
        }
      }
    }

    const message = lastError instanceof Error ? lastError.message : "Unable to join teleconsult session"
    setCallState("failed")
    setMediaError("")
    setCallError(message)
    teardownRealtimeCall()
  }

  const liveMinutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")
  const liveSeconds = String(elapsedSeconds % 60).padStart(2, "0")
  const hasRemoteStream = remoteJoined

  function toggleMic() {
    const stream = localStreamRef.current
    if (!stream) return
    const next = !micOn
    stream.getAudioTracks().forEach((track) => {
      track.enabled = next
    })
    setMicOn(next)
  }

  function toggleCamera() {
    const stream = localStreamRef.current
    if (!stream) return
    const next = !cameraOn
    stream.getVideoTracks().forEach((track) => {
      track.enabled = next
    })
    setCameraOn(next)
  }

  function toggleSpeaker() {
    setSpeakerOn((prev) => !prev)
  }

  function endCallNow() {
    setCallState("ended")
    teardownRealtimeCall()
    exitCallToPreviousScreen()
  }

  return (
    <main className="tele-page app-page-enter">
      {effectiveStep !== "video" && (
        <header className="tele-header app-fade-stagger">
          <button className="tele-back app-pressable" onClick={() => goBackOrFallback(navigate)} type="button" aria-label="Back">
            <FiArrowLeft />
          </button>
          <div>
            <h1>Doctor</h1>
          </div>
        </header>
      )}

      <section className={`tele-content app-content-slide ${effectiveStep === "video" ? "tele-content-call" : ""}`}>
        {effectiveStep === "options" && (
          <>
            <section className="mode-row app-fade-stagger">
              <button
                type="button"
                className={`mode-card app-pressable ${mode === "tele" ? "active" : ""}`}
                onClick={() => setMode("tele")}
              >
                <FiVideo />
                <h3>Teleconsultation</h3>

              </button>

              <button
                type="button"
                className={`mode-card app-pressable ${mode === "opd" ? "active" : ""}`}
                onClick={() => setMode("opd")}
              >
                <FiMapPin />
                <h3>OPD Visit</h3>

              </button>
            </section>

            <section className="search-wrap app-fade-stagger">
              <FiSearch />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search doctors or specialties..."
              />
              <button type="button" className="tele-filter-btn app-pressable" aria-label="Filter doctors"><FiFilter /></button>
            </section>

            <section className="specialty-row app-fade-stagger">
              {specialtyFilters.map((specialty, index) => (
                <button
                  key={`spec-${index}`}
                  className={`specialty-chip app-pressable ${activeSpecialty === specialty ? "active" : ""}`}
                  onClick={() => setActiveSpecialty(specialty)}
                  type="button"
                >
                  <span className="specialty-icon">{specialtyIcons[specialty]}</span>
                  {specialty}
                </button>
              ))}
            </section>

            <section className="doctor-section app-fade-stagger">
              <div className="doctor-section-head">
                <h3>Available doctors</h3>
                <p>{mode === "tele" ? "Choose a doctor for video consultation or schedule a later appointment." : "Choose a doctor for OPD visit booking."}</p>
              </div>
              <div className={`doctor-list ${showDoctors ? "ready" : ""}`}>
                {visibleDoctors.map((doctor, index) => (
                  <article
                    key={doctor.listKey || `doc-${index}`}
                    className={`doctor-card app-pressable ${selectedDoctor === doctor.id ? "selected" : ""}`}
                    onClick={() => setSelectedDoctor(doctor.id)}
                  >
                    <div className="doctor-avatar">
                      <span className="doctor-avatar-fallback" aria-hidden="true"><FiUser /></span>
                      <img
                        src={doctor.avatar}
                        alt={doctor.name}
                        loading="lazy"
                        onError={(event) => handleDoctorAvatarError(event, doctor.fallbackAvatar)}
                      />
                    </div>
                    <div className="doctor-main">
                      {selectedDoctor === doctor.id ? <span className="doctor-selected-pill">Selected</span> : null}
                      <h4>{doctor.name}</h4>
                      <p>{doctor.specialty}</p>
                      <div className="doctor-rating-block">
                        <span className="doctor-rating"><FiStar /> {doctor.rating.toFixed(1)} ({doctor.reviews})</span>
                        <span className="doctor-reviews"><FiVideo /> {mode === "tele" ? "Video Consult" : "OPD Visit"}</span>
                      </div>
                    </div>
                    <div className="doctor-fee-side">
                      <strong>{prepaidConsultActive ? "Included" : teleOfferActive && mode === "tele" && doctor.specialty === "Internal Medicine" ? "₹0" : `₹${doctor.fee}`}</strong>
                      <span>Consult Fee</span>
                    </div>
                    <div className="doctor-card-actions">
                      <button
                        className="doctor-schedule-btn app-pressable"
                        type="button"
                        disabled={isBookingNow}
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedDoctor(doctor.id)
                          navigate("/teleconsultation/schedule", {
                            state: { doctor, mode, analysisQuery, selectedSymptoms },
                          })
                        }}
                      >
                        <FiCalendar /> Schedule
                      </button>
                      <button
                        className="doctor-book-now-btn app-pressable"
                        type="button"
                        disabled={isBookingNow}
                        onClick={(event) => {
                          event.stopPropagation()
                          void continueJourney(doctor)
                        }}
                      >
                        {isBookingNow && selectedDoctor === doctor.id ? "Booking..." : "Book Now"}
                      </button>
                    </div>
                  </article>
                ))}
                {doctorLoading && (
                  <div className="doctor-loading">Loading more doctors...</div>
                )}
                {!doctorLoading && visibleDoctors.length === 0 && (
                  <div className="doctor-empty-state">
                    <h4>No doctors match this selection yet</h4>
                    <p>Try another specialty or clear the search to see the full Astikan doctor pool.</p>
                    <button
                      type="button"
                      className="doctor-empty-reset app-pressable"
                      onClick={() => {
                        setQuery("")
                        setActiveSpecialty("All Specialties")
                      }}
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
                <div ref={loadMoreRef} className="doctor-load-sentinel" />
              </div>
            </section>

            {/* Nearby clinic route removed per UX request */}
          </>
        )}

        {effectiveStep === "video" && selectedDoctorInfo && (
          <section className="video-stage tele-call-stage app-fade-stagger">
            {!joinReady && (
              <div className="tele-wait-card">
                <div className="tele-wait-icon"><FiClock /></div>
                <div className="tele-wait-copy">
                  <h3>Teleconsultation booked</h3>
                  <p>Join opens at {joinWindowLabel ?? "the scheduled time"}.</p>
                </div>
                <button className="app-pressable" type="button" onClick={() => navigate("/bookings")}>
                  Go to Bookings
                </button>
              </div>
            )}

            {joinReady && callState === "ready" && (
              <div className="tele-wait-card">
                <div className="tele-wait-icon"><FiVideo /></div>
                <div className="tele-wait-copy">
                  <h3>Consultation room ready</h3>
                  <p>Tap below to join your doctor in the video room.</p>
                </div>
                <button
                  className="app-pressable"
                  type="button"
                  disabled={callState !== "ready"}
                  onClick={() => {
                    if (callState !== "ready") return
                    void startWebRtcCall()
                  }}
                >
                  Join Call
                </button>
              </div>
            )}

            {joinReady && (
              <>
            <div className="tele-call-chrome">
              <button className="tele-call-back app-pressable" type="button" onClick={exitCallToPreviousScreen} aria-label="Back">
                <FiArrowLeft />
              </button>
              <div className="video-top">
                <h3>{selectedDoctorInfo.name}</h3>
                <p>{selectedDoctorInfo.specialty}</p>
              </div>
              <div className={`tele-connection-pill ${callState === "live" ? "live" : ""}`}>
                {callState === "live" ? "Live" : "Connecting"}
              </div>
            </div>

            <div className="video-call-shell tele-call-surface">
              <div className="video-screen remote">
                <video ref={remoteVideoRef} className="video-stream" playsInline autoPlay />
                {!hasRemoteStream && (
                  <div className="video-placeholder">
                    <span>Waiting for the doctor to join...</span>
                  </div>
                )}
                <div className="video-screen-overlay" />
              </div>
              <div className="video-screen local">
                <video ref={localVideoRef} className="video-stream" playsInline autoPlay muted />
                <span className="video-self-label">You</span>
              </div>
            </div>

            {callState === "connecting" && (
              <div className="tele-join-loader" role="status" aria-live="polite">
                <span className="tele-join-spinner" aria-hidden="true" />
                <strong>Joining consultation...</strong>
                <p>Setting up your secure call room. This may take a few seconds.</p>
              </div>
            )}

            {callState === "failed" && (
              <div className="tele-join-loader tele-join-failed" role="status" aria-live="polite">
                <span className="tele-join-spinner" aria-hidden="true" />
                <strong>We could not connect yet</strong>
                <p>{callError || "Please check your network and try again."}</p>
                <div className="tele-join-actions">
                  <button className="app-pressable" type="button" onClick={() => void startWebRtcCall()}>
                    Retry join
                  </button>
                  <button className="ghost" type="button" onClick={exitCallToPreviousScreen}>
                    Go back
                  </button>
                </div>
              </div>
            )}

            {mediaError ? <p className="video-permission-note">{mediaError}</p> : null}
            {(callState === "live" || callState === "connecting") && (
              <div className="video-clock-inline">
                <span>{liveMinutes}:{liveSeconds}</span>
              </div>
            )}

            {(callState === "live" || callState === "connecting") && (
              <div className="video-controls">
                <button
                  type="button"
                  className={`video-control-btn ${!micOn ? "off" : ""}`}
                  onClick={toggleMic}
                  aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                >
                  {micOn ? <FiMic /> : <FiMicOff />}
                </button>
                <button
                  type="button"
                  className={`video-control-btn ${!cameraOn ? "off" : ""}`}
                  onClick={toggleCamera}
                  aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
                >
                  {cameraOn ? <FiVideo /> : <FiVideoOff />}
                </button>
                <button
                  type="button"
                  className={`video-control-btn ${!speakerOn ? "off" : ""}`}
                  onClick={toggleSpeaker}
                  aria-label={speakerOn ? "Mute speaker" : "Unmute speaker"}
                >
                  {speakerOn ? <FiVolume2 /> : <FiVolumeX />}
                </button>
                <button
                  type="button"
                  className="video-control-btn end video-control-hangup"
                  onClick={endCallNow}
                  aria-label="Hang up"
                >
                  <FiPhoneOff />
                  <span>Hang Up</span>
                </button>
              </div>
            )}
              </>
            )}
          </section>
        )}

        {effectiveStep === "ride" && (
          <section className="ride-stage app-fade-stagger">
            <h3>Appointment confirmed</h3>
            <p>Your OPD visit with {rideDoctor.name} is booked successfully.</p>

            <article className="ride-status ride-status--complete">
              <div>
                <span>Doctor</span>
                <strong>{rideDoctor.name}</strong>
              </div>
              <div>
                <span>Specialty</span>
                <strong>{rideDoctor.specialty}</strong>
              </div>
              <div>
                <span>Booking ID</span>
                <strong>{bookingId ?? "Assigned shortly"}</strong>
              </div>
            </article>

            <div className="ride-actions">
              <button
                className="book-later-btn app-pressable"
                type="button"
                onClick={() => setShowRideMap((prev) => !prev)}
              >
                {showRideMap ? "Hide Map" : "View Map"}
              </button>
              <button className="book-btn app-pressable" type="button" onClick={() => navigate("/bookings")}>
                View Bookings
              </button>
            </div>

            {showRideMap && (
              <article className="ride-map">
                <iframe
                  title="Clinic map"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src="https://maps.google.com/maps?q=28.6139,77.2090%20to%2028.6304,77.2177&z=12&output=embed"
                />
                <div className="ride-pin user">You</div>
                <div className="ride-route" />
                <div className="ride-pin clinic">OPD</div>
              </article>
            )}
          </section>
        )}
      </section>

      {effectiveStep === "options" && (
        <footer className="tele-footer app-fade-stagger">
          {selectedDoctorInfo ? (
            <button className="book-btn app-pressable" type="button" onClick={() => void continueJourney()} disabled={isBookingNow}>
              <FiCalendar /> {isBookingNow ? "Processing..." : "Continue"}
            </button>
          ) : (
            <p className="tele-hint">Select a doctor to continue.</p>
          )}
          {bookingError && <p className="tele-booking-error">{bookingError}</p>}
        </footer>
      )}

      {effectiveStep === "ride" && rideBanner === "booked" && (
        <div className="booked-toast app-page-enter" role="status">
          <FiCheckCircle /> Appointment booked.
        </div>
      )}
    </main>
  )
}
