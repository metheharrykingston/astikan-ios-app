import { type CSSProperties, type ReactElement, useEffect, useMemo, useRef, useState } from "react"
import {
  FiActivity,
  FiBatteryCharging,
  FiBell,
  FiDroplet,
  FiHeart,
  FiMapPin,
  FiCreditCard,
  FiMoon,
  FiPackage,
  FiShield,
  FiSmile,
  FiThermometer,
  FiTruck,
  FiZap,
} from "react-icons/fi"
import { FaHospital, FaPills, FaStethoscope } from "react-icons/fa"
import { useNavigate } from "react-router-dom"
import { getEmployeeAuthSession } from "../../services/authApi"
import { getAddressProfile } from "../../services/addressApi"
import { syncAddressCache } from "../../services/addressStore"
import { addNotification, fetchUnreadCount } from "../../services/notificationCenter"
import { preloadLabCatalog } from "../../services/labApi"
import { getLabOfferStatus, submitLabOfferAnswers, type LabOfferStatus } from "../../services/labOfferApi"
import { getTeleconsultOfferStatus, unlockTeleconsultOffer } from "../../services/teleconsultOfferApi"
import { getTeleconsultPaidAccessStatus, type TeleconsultPaidAccessStatus } from "../../services/teleconsultPaidApi"
import { getLatestVital } from "../../services/vitalsApi"
import AppBottomNav from "../../components/AppBottomNav"
import "./home.css"


type QuickAccessItem = {
  title: string
  subtitle?: string
  tone: "purple" | "red" | "blue" | "indigo" | "orange" | "green" | "gold"
  badge?: string
  icon: "stress" | "lab" | "consult" | "pharmacy" | "insurance"   | "hospital" | "finance"
}

const quickAccess: QuickAccessItem[] = [
  { title: "Insurance", subtitle: "Coming soon", tone: "blue", icon: "insurance" },
  { title: "Lab Test", subtitle: "Fast slots", tone: "blue", icon: "lab" },
  { title: "Doctor", subtitle: "OPD / IPD", tone: "indigo", icon: "consult" },
  { title: "Medicines", subtitle: "Meds refill", tone: "green", icon: "pharmacy" },
  { title: "Hospital", subtitle: "Book slots", tone: "blue", icon: "hospital" },
  { title: "Finance", subtitle: "Medical loan", tone: "gold", icon: "finance" },
]

const quickAccessRoutes: Partial<Record<QuickAccessItem["title"], string>> = {
  Insurance: "/insurance",
  "Lab Test": "/lab-tests",
  Doctor: "/teleconsultation",
  Medicines: "/pharmacy",
  Hospital: "/hospitals",
  Finance: "/medical-finance",
}

function quickIcon(name: QuickAccessItem["icon"]) {
  if (name === "stress") return <FiSmile />
  if (String(name) === "insurance") return <FiShield />
  if (name === "lab") return <FiThermometer />
  if (String(name) === "insurance") return <FiShield />
  if (name === "consult") return <FaStethoscope />
  if (name === "pharmacy") return <FaPills />
  if (name === "hospital") return <FaHospital />
  if (name === "finance") return <FiCreditCard />
  return <FiSmile />
}

const feelings = [
  {
    id: "dizzy",
    title: "Feeling Dizzy",
    priority: "check hydration",
    tone: "light-blue",
    level: "medium",
    chatTheme: "whatsapp-dizzy",
    icon: <span className="emoji-icon sad-face" aria-hidden="true">😞</span>,
  },
  {
    id: "mental",
    title: "Mentally Disturbed",
    priority: "calm support",
    tone: "light-red",
    level: "high",
    chatTheme: "whatsapp-mental",
    icon: <span className="emoji-icon eye-spiral" aria-hidden="true">🌀</span>,
  },
  { id: "sleep", title: "Last Night Is...", priority: "recovery mode", tone: "light-purple", level: "low", chatTheme: "whatsapp-sleep", icon: <FiMoon /> },
  { id: "tension", title: "Physical Tension", priority: "stretch break", tone: "light-orange", level: "medium", chatTheme: "whatsapp-tension", icon: <FiZap /> },
  {
    id: "fever",
    title: "Running Feve",
    priority: "care needed",
    tone: "light-rose",
    level: "high",
    chatTheme: "whatsapp-fever",
    icon: (
      <span className="fever-thermo" aria-hidden="true">
        <span className="fever-stem" />
        <span className="fever-bulb" />
      </span>
    ),
  },
  { id: "fatigue", title: "Chronic Fatigue", priority: "energy dip", tone: "light-gray", level: "medium", chatTheme: "whatsapp-fatigue", icon: <FiBatteryCharging /> },
] as const

const feelingPrefill: Record<(typeof feelings)[number]["id"], string> = {
  dizzy: "I am feeling dizzy since morning. Please help.",
  mental: "I am feeling mentally disturbed and anxious. Please guide me.",
  sleep: "I had poor sleep last night and feel drained today. Please help.",
  tension: "I am feeling physical tension and stress in my body. Please assist.",
  fever: "I think I have a fever and feel unwell. Please advise.",
  fatigue: "I am dealing with chronic fatigue and low energy. Please help.",
}

const feelingDoctorIntro: Record<(typeof feelings)[number]["id"], { name: string; avatar: string; phone: string }> = {
  dizzy: {
    name: "Dr. Suneeta",
    avatar: "/assets/doctors/dr-suneeta-mittal.webp",
    phone: "+919876543210",
  },
  mental: {
    name: "Dr. Amita",
    avatar: "/assets/doctors/dr-amita-mahajan.webp",
    phone: "+919876543211",
  },
  sleep: {
    name: "Dr. Renu",
    avatar: "/assets/doctors/dr-renu-misra.webp",
    phone: "+919876543212",
  },
  tension: {
    name: "Dr. Indu",
    avatar: "/assets/doctors/dr-indu-bansal-aggarwal.webp",
    phone: "+919876543213",
  },
  fever: {
    name: "Dr. Naresh",
    avatar: "/assets/doctors/dr-naresh-trehan.webp",
    phone: "+919876543214",
  },
  fatigue: {
    name: "Dr. Randeep",
    avatar: "/assets/doctors/dr-randeep-guleria.webp",
    phone: "+919876543215",
  },
}

const HR_CACHE_KEY = "home:last_hr"
const BP_CACHE_KEY = "home:last_bp"
const SUGAR_CACHE_KEY = "home:last_sugar"
const UNREAD_CACHE_KEY = "home:last_unread"
const TELE_FREE_OFFER_KEY = "teleconsult_free_offer"
const LAB_FREE_CHECKUP_KEY = "lab_free_checkup_offer"

type TeleOfferLocal = { active: boolean; activeUntil?: string | null; enrolled?: boolean }
type LabOfferLocal = LabOfferStatus & { active?: boolean }
type PaidTeleconsultAccessLocal = TeleconsultPaidAccessStatus

const teleUnlockQuestions = [
  {
    id: "conditions",
    title: "Do you have any existing medical condition?",
    options: ["Diabetes", "Blood Pressure", "Heart Disease", "Asthma", "Thyroid", "None", "Other"],
  },
  { id: "takingMedicine", title: "Are you currently taking any medicine?", options: ["Yes", "No"] },
  { id: "surgeryHistory", title: "Have you had any surgery or hospitalization before?", options: ["Yes", "No"] },
  {
    id: "allergies",
    title: "Do you have any allergies?",
    options: ["Medicine Allergy", "Food Allergy", "Skin Allergy", "No Allergy", "Other"],
  },
  { id: "habits", title: "Do you smoke or consume alcohol?", options: ["Smoke", "Alcohol", "Both", "No"] },
] as const

const labOfferQuestions = [
  { id: "activityLevel", title: "How active is your daily routine?", options: ["Very Active", "Moderately Active", "Mostly Inactive"] },
  { id: "sleepHours", title: "How many hours do you usually sleep?", options: ["8+ hours", "6-8 hours", "Under 6 hours"] },
  { id: "stressLevel", title: "How would you describe your current stress level?", options: ["Low", "Moderate", "High"] },
  { id: "lastCheckup", title: "When did you last get a full health checkup?", options: ["Within 6 months", "Within 1 year", "Never / More than 2 years ago"] },
  { id: "habits", title: "Which one fits your routine best?", options: ["No major habits", "Occasional junk food", "Smoking / Alcohol"] },
] as const

type TeleUnlockQuestionId = (typeof teleUnlockQuestions)[number]["id"]
type LabOfferQuestionId = (typeof labOfferQuestions)[number]["id"]

const teleUnlockOptionMeta: Record<
  TeleUnlockQuestionId,
  Record<string, { icon: string; hint: string }>
> = {
  conditions: {
    Diabetes: { icon: "🩸", hint: "Sugar and insulin related care" },
    "Blood Pressure": { icon: "💓", hint: "BP monitoring and medicine context" },
    "Heart Disease": { icon: "❤️", hint: "Cardiac history for safer consults" },
    Asthma: { icon: "🫁", hint: "Breathing and inhaler support" },
    Thyroid: { icon: "🦋", hint: "Hormonal and thyroid medication context" },
    None: { icon: "✅", hint: "No known ongoing condition" },
    Other: { icon: "📝", hint: "Any other condition not listed here" },
  },
  takingMedicine: {
    Yes: { icon: "💊", hint: "Current medicines help doctors guide better" },
    No: { icon: "🌿", hint: "No active medicine course right now" },
  },
  surgeryHistory: {
    Yes: { icon: "🏥", hint: "Past surgery or hospital admission history" },
    No: { icon: "🛡️", hint: "No major surgery or admission before" },
  },
  allergies: {
    "Medicine Allergy": { icon: "💉", hint: "Drug sensitivity or reaction history" },
    "Food Allergy": { icon: "🍽️", hint: "Food-based allergy or intolerance" },
    "Skin Allergy": { icon: "🌤️", hint: "Skin, rash, or contact allergy pattern" },
    "No Allergy": { icon: "✅", hint: "No known allergy reported" },
    Other: { icon: "📝", hint: "Any other allergy not listed here" },
  },
  habits: {
    Smoke: { icon: "🚬", hint: "Smoking history affects long-term guidance" },
    Alcohol: { icon: "🍷", hint: "Alcohol intake helps with medicine planning" },
    Both: { icon: "⚕️", hint: "Combined habit history for better triage" },
    No: { icon: "🌱", hint: "No smoking or alcohol consumption" },
  },
}

function getTeleUnlockOptionMeta(questionId: TeleUnlockQuestionId, option: string) {
  return teleUnlockOptionMeta[questionId]?.[option] ?? { icon: "✨", hint: "Tap to save and continue" }
}

const labOfferOptionMeta: Record<LabOfferQuestionId, Record<string, { icon: string; hint: string }>> = {
  activityLevel: {
    "Very Active": { icon: "🏃", hint: "You move a lot through the day" },
    "Moderately Active": { icon: "🚶", hint: "Balanced routine with some movement" },
    "Mostly Inactive": { icon: "🪑", hint: "Low movement and long sitting hours" },
  },
  sleepHours: {
    "8+ hours": { icon: "🌙", hint: "Good recovery pattern" },
    "6-8 hours": { icon: "🛌", hint: "Average sleep routine" },
    "Under 6 hours": { icon: "⏰", hint: "Short sleep can increase risk" },
  },
  stressLevel: {
    Low: { icon: "🌿", hint: "Calm and steady most days" },
    Moderate: { icon: "⚖️", hint: "Manageable day-to-day pressure" },
    High: { icon: "🔥", hint: "Stress feels heavy or frequent" },
  },
  lastCheckup: {
    "Within 6 months": { icon: "🧾", hint: "You checked recently" },
    "Within 1 year": { icon: "📅", hint: "You checked once in the past year" },
    "Never / More than 2 years ago": { icon: "⚠️", hint: "No recent preventive checkup" },
  },
  habits: {
    "No major habits": { icon: "✅", hint: "No routine smoking or alcohol use" },
    "Occasional junk food": { icon: "🍟", hint: "Food habits need some cleanup" },
    "Smoking / Alcohol": { icon: "🚬", hint: "This raises long-term health risk" },
  },
}

function getLabOfferOptionMeta(questionId: LabOfferQuestionId, option: string) {
  return labOfferOptionMeta[questionId]?.[option] ?? { icon: "✨", hint: "Tap to save and continue" }
}

type MetricId = "heart-rate" | "blood-pressure" | "calories" | "sugar"

const metrics: Array<{ id: MetricId; title: string; value: string; unit: string; status: string; age: string; tone: string; icon: ReactElement }> = [
  { id: "heart-rate", title: "Heart Rate", value: "72", unit: "bpm", status: "normal", age: "2 hours ago", tone: "red", icon: <FiHeart /> },
  { id: "blood-pressure", title: "Blood Pressure", value: "120/80", unit: "mmHg", status: "normal", age: "4 hours ago", tone: "blue", icon: <FiActivity /> },
  { id: "calories", title: "Calories", value: "1850", unit: "kcal", status: "on track", age: "today", tone: "orange", icon: <FiZap /> },
  { id: "sugar", title: "Sugar Count", value: "110", unit: "mg/dL", status: "normal", age: "today", tone: "green", icon: <FiDroplet /> },
]
const HOME_SCROLL_KEY = "home:scrollTop"


type HeroSlide = {
  id: string
  title: string
  highlight: string
  subtitle: string
  cta: string
  route: string
  tone: "tone-pharmacy" | "tone-lab" | "tone-tele"
  illustration: "pharmacy" | "lab" | "tele"
  compactSubtitle?: boolean
  bannerImage?: string
}

type StoredTeleBooking = {
  id: string
  doctorName?: string
  scheduledAt?: string
  joinWindowStart?: string
}

export default function Home() {
  const navigate = useNavigate()
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([])
  const [displayScore, setDisplayScore] = useState(0)
  const [lastAction, setLastAction] = useState("Ready")
  const [latestHeartRate, setLatestHeartRate] = useState<{ value: number | null; eventAt?: string } | null>(null)
  const [latestBloodPressure, setLatestBloodPressure] = useState<{ sys: number | null; dia: number | null; eventAt?: string } | null>(null)
  const [latestSugar, setLatestSugar] = useState<{ value: number | null; eventAt?: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [heroIndex, setHeroIndex] = useState(0)
  const [heroDragging, setHeroDragging] = useState(false)
  const heroDragStartX = useRef<number | null>(null)
  const heroDragDelta = useRef(0)
  const heroDragWidth = useRef(1)
  const [heroDragOffset, setHeroDragOffset] = useState(0)
  const heroContainerRef = useRef<HTMLDivElement | null>(null)
  const [, setTeleOffer] = useState<TeleOfferLocal>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(TELE_FREE_OFFER_KEY) || "null") as TeleOfferLocal | null
      if (!parsed?.activeUntil) return { active: false }
      return { ...parsed, active: new Date(parsed.activeUntil).getTime() > Date.now() }
    } catch {
      return { active: false }
    }
  })
  const [showTeleUnlock, setShowTeleUnlock] = useState(false)
  const [teleQuestionIndex, setTeleQuestionIndex] = useState(0)
  const [teleAnswers, setTeleAnswers] = useState<Record<string, string[]>>({})
  const [teleUnlocking, setTeleUnlocking] = useState(false)
  const [teleUnlockedMessage, setTeleUnlockedMessage] = useState("")
  const [paidTeleconsultAccess, setPaidTeleconsultAccess] = useState<PaidTeleconsultAccessLocal>({
    unlocked: false,
    availablePasses: 0,
    consultationMinutes: 15,
  })
  const [labOffer, setLabOffer] = useState<LabOfferLocal>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(LAB_FREE_CHECKUP_KEY) || "null") as LabOfferLocal | null
      return parsed ?? { enrolled: false, completed: false, eligible: false, result: null, updatedAt: null }
    } catch {
      return { enrolled: false, completed: false, eligible: false, result: null, updatedAt: null }
    }
  })
  const [showLabOfferUnlock, setShowLabOfferUnlock] = useState(false)
  const [labOfferQuestionIndex, setLabOfferQuestionIndex] = useState(0)
  const [labOfferAnswers, setLabOfferAnswers] = useState<Record<string, string[]>>({})
  const [labOfferSubmitting, setLabOfferSubmitting] = useState(false)
  const [labOfferResultMessage, setLabOfferResultMessage] = useState("")
  const apiCooldownRef = useRef<Record<string, number>>({})
  const apiFailRef = useRef<Record<string, number>>({})

  const pageRef = useRef<HTMLElement | null>(null)
  const scoreTarget = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10)
    const mealStorageKey = `calorie_meals_${todayKey}`
    let calorieTotal = 0
    try {
      const raw = localStorage.getItem(mealStorageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{ calories?: number }>
        calorieTotal = parsed.reduce((sum, row) => sum + (Number(row.calories) || 0), 0)
      }
    } catch {
      calorieTotal = 0
    }

    const hr = latestHeartRate?.value ?? null
    const bpSys = latestBloodPressure?.sys ?? null
    const bpDia = latestBloodPressure?.dia ?? null
    const sugar = latestSugar?.value ?? null

    let score = 68
    if (typeof hr === "number") {
      score += hr >= 55 && hr <= 95 ? 10 : 4
    }
    if (typeof bpSys === "number" && typeof bpDia === "number") {
      score += bpSys <= 130 && bpDia <= 85 ? 10 : 4
    }
    if (typeof sugar === "number") {
      score += sugar >= 80 && sugar <= 130 ? 10 : 4
    }
    if (calorieTotal > 0) {
      score += calorieTotal >= 1200 && calorieTotal <= 2400 ? 6 : 3
    }
    if (unreadCount > 0) {
      score += 2
    }

    return Math.max(40, Math.min(100, Math.round(score)))
  }, [latestBloodPressure, latestHeartRate, latestSugar, unreadCount])

  const scoreMeta = useMemo(() => {
    const score = scoreTarget
    const hr = latestHeartRate?.value ?? null
    const bpSys = latestBloodPressure?.sys ?? null
    const bpDia = latestBloodPressure?.dia ?? null
    const sugar = latestSugar?.value ?? null

    const hrTag =
      typeof hr === "number"
        ? hr >= 55 && hr <= 95
          ? "Heart rate normal"
          : hr > 95
            ? "Heart rate high"
            : "Heart rate low"
        : "Heart rate pending"
    const bpTag =
      typeof bpSys === "number" && typeof bpDia === "number"
        ? bpSys <= 130 && bpDia <= 85
          ? "BP in range"
          : "BP needs check"
        : "BP pending"
    const sugarTag =
      typeof sugar === "number"
        ? sugar >= 80 && sugar <= 130
          ? "Sugar stable"
          : "Sugar needs check"
        : "Sugar pending"

    const label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : "Needs Care"
    const tone = score >= 85 ? "excellent" : score >= 70 ? "good" : "care"
    const caption =
      score >= 85
        ? "Excellent health indicators today. Keep it steady."
        : score >= 70
          ? "Good baseline. Small daily habits will lift this fast."
          : "Let’s stabilise the basics first. Start with BP, sugar and hydration."

    const tags = [hrTag, bpTag, sugarTag].slice(0, 2)
    return { label, tone, caption, tags }
  }, [latestBloodPressure, latestHeartRate, latestSugar, scoreTarget])

  const shouldSkipApi = (key: string) => {
    const until = apiCooldownRef.current[key] ?? 0
    return Date.now() < until
  }

  const markApiFailure = (key: string) => {
    const next = (apiFailRef.current[key] ?? 0) + 1
    apiFailRef.current[key] = next
    const backoffMs = Math.min(5 * 60 * 1000, 1000 * next * 30)
    apiCooldownRef.current[key] = Date.now() + backoffMs
  }

  const markApiSuccess = (key: string) => {
    apiFailRef.current[key] = 0
    apiCooldownRef.current[key] = 0
  }

  useEffect(() => {
    let active = true
    void getTeleconsultOfferStatus()
      .then((status) => {
        if (!active) return
        const next = { active: Boolean(status.active), enrolled: Boolean(status.enrolled), activeUntil: status.activeUntil }
        setTeleOffer(next)
        localStorage.setItem(TELE_FREE_OFFER_KEY, JSON.stringify(next))
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void getTeleconsultPaidAccessStatus()
      .then((status) => {
        if (!active) return
        setPaidTeleconsultAccess(status)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void getLabOfferStatus()
      .then((status) => {
        if (!active) return
        const next = { ...status, active: Boolean(status.eligible) }
        setLabOffer(next)
        localStorage.setItem(LAB_FREE_CHECKUP_KEY, JSON.stringify(next))
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])
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


  useEffect(() => {
    let active = true
    void getAddressProfile()
      .then(({ address }) => {
        if (!active || !address) return
        syncAddressCache({
          homeAddress: address.homeAddress ?? "",
          officeAddress: address.officeAddress ?? "",
          primary: "home",
        })
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const loadLatestSugar = async () => {
      if (shouldSkipApi("vitals_sugar")) {
        const cached = localStorage.getItem(SUGAR_CACHE_KEY)
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as { value: number | null; eventAt?: string }
            setLatestSugar(parsed)
          } catch {
            // ignore cache parse errors
          }
        }
        return
      }
      try {
        const latest = await getLatestVital("blood_sugar")
        if (!active) return
        const next = {
          value: typeof latest?.value === "number" ? latest.value : null,
          eventAt: latest?.eventAt,
        }
        setLatestSugar(next)
        localStorage.setItem(SUGAR_CACHE_KEY, JSON.stringify(next))
        markApiSuccess("vitals_sugar")
      } catch {
        if (!active) return
        markApiFailure("vitals_sugar")
        const cached = localStorage.getItem(SUGAR_CACHE_KEY)
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as { value: number | null; eventAt?: string }
            setLatestSugar(parsed)
            return
          } catch {
            // ignore cache parse errors
          }
        }
        setLatestSugar(null)
      }
    }
    void loadLatestSugar()
    const interval = window.setInterval(loadLatestSugar, 120000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  const heroSlides = useMemo<HeroSlide[]>(() => {
    const teleRaw = localStorage.getItem("teleconsult_bookings")

    const parseList = <T,>(raw: string | null): T[] => {
      if (!raw) return []
      try {
        const parsed = JSON.parse(raw) as T[]
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }

    const teleBookings = parseList<StoredTeleBooking>(teleRaw)
    const teleLatest = teleBookings[0]
    return [
      {
        id: "pharmacy",
        title: "Subscribe and save",
        highlight: "up to 20% on Medicines",
        subtitle: "Flexible medicine savings for repeat orders.",
        cta: "Subscribe Now",
        route: "/pharmacy",
        tone: "tone-pharmacy",
        illustration: "pharmacy",
        compactSubtitle: true,
        bannerImage: "/assets/home-banners/pharmacy-subscribe.webp",
      },
      {
        id: "lab",
        title: "You are eligible",
        highlight: "for a free health checkup",
        subtitle: "Preventive health checkup by Astikan.",
        cta: "Enroll Now",
        route: "/lab-tests",
        tone: "tone-lab",
        illustration: "lab",
        compactSubtitle: true,
        bannerImage: "/assets/home-banners/lab-eligibility.webp",
      },
      {
        id: teleLatest?.id ? `tele-status-${teleLatest.id}` : "tele",
        title: "Teleconsultation",
        highlight: "only at ₹49",
        subtitle: "Pay online and unlock a 15 minute doctor consultation.",
        cta: "Consult Now",
        route: "/teleconsultation/offer-checkout",
        tone: "tone-tele",
        illustration: "tele",
        bannerImage: "/assets/home-banners/doctor-room-ready.webp",
      },
    ]
  }, [])
  const labVariant = useMemo(() => ["a", "b", "c"][Math.floor(Math.random() * 3)], [])

  function renderHeroIllustration(kind: HeroSlide["illustration"]) {
    if (kind === "lab") {
      return (
        <div className={`medicine-hero-illustration illustration-lab variant-${labVariant}`} aria-hidden="true">
          <span className="lab-orbit lab-orbit-a" />
          <span className="lab-orbit lab-orbit-b" />
          <div className="lab-check-card">
            <span className="lab-check-badge"><FiShield /></span>
            <div className="lab-check-lines">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="lab-sample-kit">
            <span className="lab-kit-cap" />
            <span className="lab-kit-fill" />
          </div>
          <div className="lab-health-chip chip-a"><FiHeart /></div>
          <div className="lab-health-chip chip-b"><FiDroplet /></div>
          <div className="lab-health-chip chip-c"><FiActivity /></div>
        </div>
      )
    }
    if (kind === "tele") {
      return (
        <div className="medicine-hero-illustration illustration-tele" aria-hidden="true">
          <span className="tele-halo tele-halo-a" />
          <span className="tele-halo tele-halo-b" />
          <div className="tele-portrait-frame">
            <span className="tele-doctor-badge">AI</span>
            <span className="tele-presence-dot" />
            <img
              className="tele-doctor-photo"
              src="/assets/doctors/doctor-4.webp"
              alt=""
              loading="lazy"
            />
          </div>
          <span className="tele-chip tele-chip-a">24x7</span>
          <span className="tele-chip tele-chip-b">Care</span>
          <span className="tele-chat-bubble tele-chat-bubble-a" />
          <span className="tele-chat-bubble tele-chat-bubble-b" />
          <span className="tele-health-pulse" />
        </div>
      )
    }
    return (
      <div className="medicine-hero-illustration illustration-pharmacy" aria-hidden="true">
        <span className="pharmacy-glow pharmacy-glow-a" />
        <span className="pharmacy-glow pharmacy-glow-b" />
        <div className="pharmacy-bottle">
          <span className="pharmacy-bottle-cap" />
          <span className="pharmacy-bottle-label" />
        </div>
        <span className="pharmacy-pill pharmacy-pill-a" />
        <span className="pharmacy-pill pharmacy-pill-b" />
        <span className="pharmacy-pill pharmacy-pill-c" />
        <div className="route-line route-a" />
        <div className="route-line route-b" />
        <span className="hero-pin hero-shop"><FiMapPin /></span>
        <span className="hero-pin hero-mid"><FiMapPin /></span>
        <span className="hero-rider"><FiTruck /></span>
        <span className="hero-pack"><FiPackage /></span>
      </div>
    )
  }

  useEffect(() => {
    if (heroSlides.length <= 1) return
    if (heroDragging) return
    const interval = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length)
    }, 4200)
    return () => window.clearInterval(interval)
  }, [heroSlides.length, heroDragging])

  function onHeroDragStart(clientX: number) {
    setHeroDragging(true)
    heroDragStartX.current = clientX
    heroDragDelta.current = 0
    heroDragWidth.current = heroContainerRef.current?.getBoundingClientRect().width || 1
    setHeroDragOffset(0)
  }

  function onHeroDragMove(clientX: number) {
    if (heroDragStartX.current === null) return
    const width = heroDragWidth.current || 1
    const raw = clientX - heroDragStartX.current
    const clamped = Math.max(-width * 0.85, Math.min(width * 0.85, raw))
    heroDragDelta.current = clamped
    setHeroDragOffset(clamped)
  }

  function onHeroDragEnd(clientX?: number) {
    if (heroDragStartX.current === null) return
    if (typeof clientX === "number") {
      heroDragDelta.current = clientX - heroDragStartX.current
    }
    const delta = heroDragDelta.current
    const width = heroDragWidth.current || 1
    const threshold = Math.min(72, width * 0.14)
    if (Math.abs(delta) > threshold) {
      setHeroIndex((prev) => {
        if (delta > 0) return (prev - 1 + heroSlides.length) % heroSlides.length
        return (prev + 1) % heroSlides.length
      })
    }
    heroDragStartX.current = null
    heroDragDelta.current = 0
    setHeroDragOffset(0)
    window.setTimeout(() => setHeroDragging(false), 160)
  }



  useEffect(() => {
    let frame = 0
    const startedAt = performance.now()
    const duration = 1300

    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(scoreTarget * eased))
      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      }
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [scoreTarget])

  useEffect(() => {
    const saved = window.sessionStorage.getItem(HOME_SCROLL_KEY)
    if (!saved || !pageRef.current) return
    const y = Number(saved)
    if (Number.isNaN(y)) return
    const raf = window.requestAnimationFrame(() => {
      pageRef.current?.scrollTo({ top: y, behavior: "auto" })
    })
    return () => window.cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    let active = true
    const loadLatest = async () => {
      if (shouldSkipApi("vitals_hr")) {
        const cached = localStorage.getItem(HR_CACHE_KEY)
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as { value: number | null; eventAt?: string }
            setLatestHeartRate(parsed)
          } catch {
            // ignore cache parse errors
          }
        }
        return
      }
      try {
        const latest = await getLatestVital("heart_rate")
        if (!active) return
        const next = { value: typeof latest?.value === "number" ? latest.value : null, eventAt: latest?.eventAt }
        setLatestHeartRate(next)
        localStorage.setItem(HR_CACHE_KEY, JSON.stringify(next))
        markApiSuccess("vitals_hr")
      } catch {
        if (!active) return
        markApiFailure("vitals_hr")
        const cached = localStorage.getItem(HR_CACHE_KEY)
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as { value: number | null; eventAt?: string }
            setLatestHeartRate(parsed)
            return
          } catch {
            // ignore cache parse errors
          }
        }
        setLatestHeartRate(null)
      }
    }
    void loadLatest()
    const interval = window.setInterval(loadLatest, 60000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    let active = true
    const loadLatestBp = async () => {
      if (shouldSkipApi("vitals_bp")) {
        const cached = localStorage.getItem(BP_CACHE_KEY)
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as { sys: number | null; dia: number | null; eventAt?: string }
            setLatestBloodPressure(parsed)
          } catch {
            // ignore cache parse errors
          }
        }
        return
      }
      try {
        const [sys, dia] = await Promise.all([
          getLatestVital("blood_pressure_sys"),
          getLatestVital("blood_pressure_dia"),
        ])
        if (!active) return
        const next = {
          sys: typeof sys?.value === "number" ? sys.value : null,
          dia: typeof dia?.value === "number" ? dia.value : null,
          eventAt: sys?.eventAt || dia?.eventAt,
        }
        setLatestBloodPressure(next)
        localStorage.setItem(BP_CACHE_KEY, JSON.stringify(next))
        markApiSuccess("vitals_bp")
      } catch {
        if (!active) return
        markApiFailure("vitals_bp")
        const cached = localStorage.getItem(BP_CACHE_KEY)
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as { sys: number | null; dia: number | null; eventAt?: string }
            setLatestBloodPressure(parsed)
            return
          } catch {
            // ignore cache parse errors
          }
        }
        setLatestBloodPressure(null)
      }
    }
    void loadLatestBp()
    const interval = window.setInterval(loadLatestBp, 90000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  const metricCards = useMemo(() => {
    return metrics.map((item) => {
      if (item.id !== "heart-rate") return item
      const value = latestHeartRate?.value
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
        age: latestHeartRate?.eventAt ? formatAge(latestHeartRate.eventAt) : item.age,
        status,
      }
    })
  }, [latestHeartRate])

  const metricCardsWithBp = useMemo(() => {
    if (!latestBloodPressure) return metricCards
    return metricCards.map((item) => {
      if (item.id !== "blood-pressure") return item
      const sys = latestBloodPressure.sys
      const dia = latestBloodPressure.dia
      if (typeof sys !== "number" || typeof dia !== "number") return item
      const status = sys >= 140 || dia >= 90 ? "high" : sys < 90 || dia < 60 ? "low" : "normal"
      return {
        ...item,
        value: `${Math.round(sys)}/${Math.round(dia)}`,
        age: latestBloodPressure.eventAt ? formatAge(latestBloodPressure.eventAt) : item.age,
        status,
      }
    })
  }, [metricCards, latestBloodPressure])

  const metricCardsWithVitals = useMemo(() => {
    if (!latestSugar) return metricCardsWithBp
    return metricCardsWithBp.map((item) => {
      if (item.id !== "sugar") return item
      const value = latestSugar.value
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
        age: latestSugar.eventAt ? formatAge(latestSugar.eventAt) : item.age,
        status,
        unit: "mg/dL",
      }
    })
  }, [latestSugar, metricCardsWithBp])

  function handleHeroCta(slide: HeroSlide) {
    if (slide.route === "__unlock_tele_offer") {
      setShowTeleUnlock(true)
      setTeleQuestionIndex(0)
      setTeleUnlockedMessage("")
      return
    }
    if (slide.route === "__unlock_lab_offer") {
      setShowLabOfferUnlock(true)
      setLabOfferQuestionIndex(0)
      setLabOfferResultMessage("")
      return
    }
    if (slide.route === "__unlock_wallet_bonus") {
      navigate("/health-assessments")
      return
    }
    navigate(slide.route)
  }

  function moveTeleUnlockForward(questionId: string, nextAnswers?: string[]) {
    const answers = nextAnswers ?? teleAnswers[questionId] ?? []
    if (!answers.length || teleUnlocking) return
    if (teleQuestionIndex < teleUnlockQuestions.length - 1) {
      window.setTimeout(() => {
        setTeleQuestionIndex((prev) => Math.min(prev + 1, teleUnlockQuestions.length - 1))
      }, 140)
      return
    }
    void completeTeleUnlock()
  }

  function toggleTeleAnswer(questionId: string, option: string) {
    const nextAnswers = [option]
    setTeleAnswers((prev) => ({ ...prev, [questionId]: nextAnswers }))
    moveTeleUnlockForward(questionId, nextAnswers)
  }

  function moveLabOfferForward(questionId: string, nextAnswers?: string[]) {
    const answers = nextAnswers ?? labOfferAnswers[questionId] ?? []
    if (!answers.length || labOfferSubmitting) return
    if (labOfferQuestionIndex < labOfferQuestions.length - 1) {
      window.setTimeout(() => {
        setLabOfferQuestionIndex((prev) => Math.min(prev + 1, labOfferQuestions.length - 1))
      }, 140)
      return
    }
    void completeLabOfferUnlock()
  }

  function toggleLabOfferAnswer(questionId: string, option: string) {
    const nextAnswers = [option]
    setLabOfferAnswers((prev) => ({ ...prev, [questionId]: nextAnswers }))
    moveLabOfferForward(questionId, nextAnswers)
  }

  async function completeTeleUnlock() {
    setTeleUnlocking(true)
    try {
      const mappedAnswers = {
        conditions: teleAnswers.conditions ?? [],
        takingMedicine: teleAnswers.takingMedicine?.[0] ?? "",
        surgeryHistory: teleAnswers.surgeryHistory?.[0] ?? "",
        allergies: teleAnswers.allergies ?? [],
        habits: teleAnswers.habits ?? [],
      }
      const status = await unlockTeleconsultOffer(mappedAnswers)
      const next = { active: true, enrolled: true, activeUntil: status.activeUntil }
      setTeleOffer(next)
      localStorage.setItem(TELE_FREE_OFFER_KEY, JSON.stringify(next))
      setTeleUnlockedMessage("Unlimited Doctors Consultation Unlocked for a Month.")
      await addNotification({
        title: "Unlimited Doctor Calls unlocked",
        body: "Your 1 month free General Practitioner teleconsultation access is active. Limit: 3 calls/day.",
        channel: "consult",
        cta: { label: "Book Now", route: "/teleconsultation" },
      }).catch(() => undefined)
    } catch (error) {
      const activeUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const next = { active: true, enrolled: true, activeUntil }
      setTeleOffer(next)
      localStorage.setItem(TELE_FREE_OFFER_KEY, JSON.stringify(next))
      setTeleUnlockedMessage("Unlimited Doctors Consultation Unlocked for a Month.")
    } finally {
      setTeleUnlocking(false)
    }
  }

  async function completeLabOfferUnlock() {
    setLabOfferSubmitting(true)
    try {
      const mappedAnswers = {
        activityLevel: labOfferAnswers.activityLevel?.[0] ?? "",
        sleepHours: labOfferAnswers.sleepHours?.[0] ?? "",
        stressLevel: labOfferAnswers.stressLevel?.[0] ?? "",
        lastCheckup: labOfferAnswers.lastCheckup?.[0] ?? "",
        habits: labOfferAnswers.habits?.[0] ?? "",
      }
      const status = await submitLabOfferAnswers(mappedAnswers)
      const next = { ...status, active: Boolean(status.eligible) }
      setLabOffer(next)
      localStorage.setItem(LAB_FREE_CHECKUP_KEY, JSON.stringify(next))
      setLabOfferResultMessage(
        status.eligible
          ? "Free health checkup unlocked for your account."
          : "Oops! You are not eligible for the free checkup right now. You can still book lab tests with Astikan savings.",
      )
    } catch {
      const next = {
        enrolled: true,
        completed: true,
        eligible: false,
        result: "ineligible" as const,
        updatedAt: new Date().toISOString(),
        active: false,
      }
      setLabOffer(next)
      localStorage.setItem(LAB_FREE_CHECKUP_KEY, JSON.stringify(next))
      setLabOfferResultMessage("Oops! You are not eligible for the free checkup right now. You can still book lab tests with Astikan savings.")
    } finally {
      setLabOfferSubmitting(false)
    }
  }

  function handleScroll(e: React.UIEvent<HTMLElement>) {
    const top = e.currentTarget.scrollTop
    window.sessionStorage.setItem(HOME_SCROLL_KEY, String(top))
  }

  async function openQuickAccess(title: QuickAccessItem["title"]) {
    const route = quickAccessRoutes[title]
    if (route) {
      if (title === "Lab Test") {
        try {
          await Promise.race([
            preloadLabCatalog("", 10, 0),
            new Promise((resolve) => window.setTimeout(resolve, 1200)),
          ])
        } catch {
          // Lab page has its own loader/error fallback.
        }
      }
      navigate(route)
      return
    }
    setLastAction(`${title} coming soon`)
  }

  function toggleFeeling(id: string) {
    if (id in feelingPrefill) {
      const key = id as (typeof feelings)[number]["id"]
      const meta = feelings.find((item) => item.id === key)
      navigate("/ai-chat", {
        state: {
          doctor: feelingDoctorIntro[key],
          feelingId: key,
          theme: meta?.chatTheme ?? "whatsapp-dizzy",
          paidUnlocked: paidTeleconsultAccess.availablePasses > 0,
        },
      })
      return
    }
    setSelectedFeelings((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }


  useEffect(() => {
    const session = getEmployeeAuthSession()
    if (!session) {
      navigate("/login")
    }
  }, [navigate])

  useEffect(() => {
    let active = true
    const syncUnread = async () => {
      if (shouldSkipApi("notifications_unread")) {
        const cached = localStorage.getItem(UNREAD_CACHE_KEY)
        if (cached) {
          const count = Number(cached)
          if (!Number.isNaN(count) && active) setUnreadCount(count)
        }
        return
      }
      try {
        const count = await fetchUnreadCount()
        if (active) {
          setUnreadCount(count)
          localStorage.setItem(UNREAD_CACHE_KEY, String(count))
          markApiSuccess("notifications_unread")
        }
      } catch {
        markApiFailure("notifications_unread")
        const cached = localStorage.getItem(UNREAD_CACHE_KEY)
        if (cached) {
          const count = Number(cached)
          if (!Number.isNaN(count) && active) setUnreadCount(count)
        }
      }
    }
    void syncUnread()
    const onUpdate = () => {
      void syncUnread()
    }
    window.addEventListener("app-notification", onUpdate as EventListener)
    return () => {
      active = false
      window.removeEventListener("app-notification", onUpdate as EventListener)
    }
  }, [])


  return (
    <main className="home-page app-page-enter" onScroll={handleScroll} ref={pageRef}>
      <section className="home-shell">
        <header className="topbar app-fade-stagger">
          <div className="brand">
            <div className="brand-icon brand-logo-mark"><img src="/logo.png" alt="Astikan" /></div>
            <div className="brand-copy">
              <h1>Astikan</h1>
            </div>
          </div>
<div className="header-actions">
            <button className="icon-btn notify-btn app-pressable" aria-label="notifications" type="button" onClick={() => navigate("/notifications")}>
              <FiBell />
              {unreadCount > 0 && <span className="notify-count">{unreadCount}</span>}
            </button>
          </div>
        </header>
        <AppBottomNav active="Home" />

        <section className="medicine-hero app-fade-stagger">
          <div
            className={`hero-slider ${heroDragging ? "dragging" : ""}`}
            ref={heroContainerRef}
            onPointerDown={(e) => {
              if (e.pointerType === "mouse" && e.button !== 0) return
              onHeroDragStart(e.clientX)
              heroContainerRef.current?.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              if (!heroDragging) return
              onHeroDragMove(e.clientX)
            }}
            onPointerUp={(e) => {
              onHeroDragEnd(e.clientX)
              heroContainerRef.current?.releasePointerCapture(e.pointerId)
            }}
            onPointerCancel={(e) => {
              onHeroDragEnd()
              heroContainerRef.current?.releasePointerCapture(e.pointerId)
            }}
          >
            <div
              className="hero-track"
              style={{
                transform: `translate3d(calc(-${heroIndex * 100}% + ${(heroDragOffset / (heroDragWidth.current || 1)) * 100}%), 0, 0)`,
              }}
            >
              {heroSlides.map((slide) => (
                <button
                  key={slide.id}
                  className={`medicine-hero-card hero-slide hero-banner-card app-pressable ${slide.tone}`}
                  type="button"
                  onClick={() => handleHeroCta(slide)}
                  aria-label={`${slide.title} ${slide.highlight}. ${slide.cta}`}
                >
                  {slide.bannerImage ? (
                    <img
                      className="hero-banner-image"
                      src={slide.bannerImage}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <>
                      <div className={`medicine-hero-copy ${slide.compactSubtitle ? "compact-subtitle" : ""}`}>
                        <h2><strong>{slide.title}</strong> {slide.highlight}</h2>
                        <span className="medicine-hero-cta">{slide.cta}</span>
                      </div>
                      {renderHeroIllustration(slide.illustration)}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="section app-fade-stagger">
          <h3 className="section-title quick-title quick-access-title">Quick Access</h3>
          <div className="quick-grid">
            {quickAccess.map((item) => (
              <button
                key={item.title}
                className={`quick-card quick-card--${item.icon} app-pressable ${item.tone}`}
                onClick={() => openQuickAccess(item.title)}
                type="button"
              >
                <div className="quick-top">
                  <span className={`quick-icon ${item.icon === "lab" || item.icon === "insurance" ? "bouncy" : ""}`}>{quickIcon(item.icon)}</span>
                  {item.badge && <span className="badge">{item.badge}</span>}
                </div>
                <div className="quick-copy">
                  <h4>{item.title}</h4>
                  {item.subtitle && <p>{item.subtitle}</p>}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="section app-fade-stagger">
          <h3 className="section-title">How are you feeling today?</h3>
          <div className="feeling-grid">
            {feelings.map((item) => (
              <button
                key={item.id}
                className={`feeling-card app-pressable ${item.tone} ${selectedFeelings.includes(item.id) ? "selected" : ""}`}
                onClick={() => toggleFeeling(item.id)}
                type="button"
              >
                <span className="feeling-icon">{item.icon}</span>
                <h4>{item.title}</h4>
                <span className={`priority ${item.level}`}>
                  {paidTeleconsultAccess.availablePasses > 0 ? `paid ${paidTeleconsultAccess.consultationMinutes} min` : item.priority}
                </span>
              </button>
            ))}
          </div>
        </section>


        <section className="section app-fade-stagger">
          <h3 className="section-title">Health Metrics</h3>
          <div className="metric-grid">
            {metricCardsWithVitals.map((item) => (
              <button
                key={item.title}
                className={`metric-card app-pressable ${item.tone}`}
                onClick={() => navigate(`/metric/${item.id}`)}
                type="button"
              >
                <div className="metric-top">
                  <span className={`metric-icon ${item.tone === "red" ? "pulse-heart" : "pulse-gentle"}`}>{item.icon}</span>
                  <div className="metric-badge-pack">
                    <span className="status">{item.status}</span>
                  </div>
                </div>
                <p className="metric-value">
                  {item.value} <span>{item.unit}</span>
                </p>
                <h4>{item.title}</h4>
                <p className="metric-age">{item.age}</p>
                <div className="metric-bars" aria-hidden="true">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <span key={`${item.title}-${index}`} style={{ animationDelay: `${index * 90}ms` }} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="score-card app-fade-stagger">
          <div className="score-copy">
            <div className="score-head-row">
              <h3>Health Score</h3>
              <span className={`score-pill ${scoreMeta.tone}`}>{scoreMeta.label}</span>
            </div>

            <div className="score-body">
              <div className="score-ring-wrap" aria-hidden="true">
                <div
                  className="score-ring"
                  style={{ "--score-fill": `${displayScore}%` } as CSSProperties}
                >
                  <div className="score-ring-inner">
                    <strong>{displayScore}</strong>
                    <span>/100</span>
                  </div>
                </div>
                <span className="score-orbit">
                  <FiHeart />
                </span>
              </div>

              <div className="score-summary">
                <p className="score-caption">{scoreMeta.caption}</p>
                <div className="score-progress" aria-hidden="true">
                  <span style={{ width: `${displayScore}%` }} />
                </div>
                <div className="score-tags">
                  {scoreMeta.tags.slice(0, 2).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <small>{lastAction}</small>
              </div>
            </div>
          </div>
        </section>
      </section>

      {showTeleUnlock && (
        <div className="tele-unlock-overlay">
          <section className="tele-unlock-card app-page-enter">
            {teleUnlockedMessage ? (
              <>
                <div className="tele-unlock-success-wrap">
                  <div className="tele-unlock-success-ring tele-unlock-success-ring-one" />
                  <div className="tele-unlock-success-ring tele-unlock-success-ring-two" />
                  <div className="tele-unlock-success">✓</div>
                </div>
                <h2>Unlocked Successfully</h2>
                <p>Your doctor access details are saved. You can go back home now or start a consultation right away.</p>
                <div className="tele-unlock-success-actions">
                  <button className="tele-unlock-home-btn app-pressable" type="button" onClick={() => { setShowTeleUnlock(false); navigate("/home") }}>Back to Home</button>
                  <button className="medicine-hero-cta app-pressable tele-unlock-consult-btn" type="button" onClick={() => { setShowTeleUnlock(false); navigate("/teleconsultation") }}>Consult Now</button>
                </div>
              </>
            ) : (
              <>
                <div className="tele-unlock-kicker-static">Doctor Access Setup</div>
                <h2>{teleUnlockQuestions[teleQuestionIndex].title}</h2>
                <p>Choose the option that matches you best. We will save it instantly and move you ahead automatically.</p>
                <div className="tele-unlock-options tele-unlock-options-single">
                  {teleUnlockQuestions[teleQuestionIndex].options.map((option) => {
                    const q = teleUnlockQuestions[teleQuestionIndex]
                    const active = (teleAnswers[q.id] ?? []).includes(option)
                    const meta = getTeleUnlockOptionMeta(q.id, option)
                    return (
                      <button
                        key={option}
                        type="button"
                        className={`tele-unlock-option ${active ? "active" : ""}`}
                        onClick={() => toggleTeleAnswer(q.id, option)}
                      >
                        <span className="tele-unlock-option-media" aria-hidden="true">{meta.icon}</span>
                        <span className="tele-unlock-option-copy">
                          <span>{option}</span>
                          <strong>{meta.hint}</strong>
                        </span>
                        <span className="tele-unlock-option-arrow" aria-hidden="true">→</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {showLabOfferUnlock && (
        <div className="tele-unlock-overlay">
          <section className="tele-unlock-card app-page-enter">
            {labOfferResultMessage ? (
              <>
                <div className="tele-unlock-success-wrap">
                  <div className="tele-unlock-success-ring tele-unlock-success-ring-one" />
                  <div className="tele-unlock-success-ring tele-unlock-success-ring-two" />
                  <div className={`tele-unlock-success ${labOffer.eligible ? "" : "lab-offer-fail"}`}>{labOffer.eligible ? "✓" : "!"}</div>
                </div>
                <h2>{labOffer.eligible ? "Checkup Unlocked" : "Oops!"}</h2>
                <p>{labOfferResultMessage}</p>
                <div className="tele-unlock-success-actions">
                  <button className="tele-unlock-home-btn app-pressable" type="button" onClick={() => { setShowLabOfferUnlock(false); navigate("/home") }}>Back to Home</button>
                  <button className="medicine-hero-cta app-pressable tele-unlock-consult-btn" type="button" onClick={() => { setShowLabOfferUnlock(false); navigate("/lab-tests") }}>{labOffer.eligible ? "Claim Now" : "Book Lab Tests"}</button>
                </div>
              </>
            ) : (
              <>
                <div className="tele-unlock-kicker-static">Free Checkup Eligibility</div>
                <h2>{labOfferQuestions[labOfferQuestionIndex].title}</h2>
                <p>Tell us a little about your daily routine. We will save it instantly and check your eligibility right away.</p>
                <div className="tele-unlock-options tele-unlock-options-single">
                  {labOfferQuestions[labOfferQuestionIndex].options.map((option) => {
                    const q = labOfferQuestions[labOfferQuestionIndex]
                    const active = (labOfferAnswers[q.id] ?? []).includes(option)
                    const meta = getLabOfferOptionMeta(q.id, option)
                    return (
                      <button
                        key={option}
                        type="button"
                        className={`tele-unlock-option ${active ? "active" : ""}`}
                        onClick={() => toggleLabOfferAnswer(q.id, option)}
                      >
                        <span className="tele-unlock-option-media" aria-hidden="true">{meta.icon}</span>
                        <span className="tele-unlock-option-copy">
                          <span>{option}</span>
                          <strong>{meta.hint}</strong>
                        </span>
                        <span className="tele-unlock-option-arrow" aria-hidden="true">→</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      )}

    </main>
  )
}
