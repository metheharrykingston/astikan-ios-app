import { useEffect, useMemo, useRef, useState } from "react"
import { FiArrowLeft, FiCalendar, FiCamera, FiCheckCircle, FiFileText, FiImage, FiMic, FiPhoneCall, FiPlus, FiRefreshCcw, FiSend, FiUploadCloud, FiX } from "react-icons/fi"
import { useLocation, useNavigate } from "react-router-dom"
import { analyzeMedicalAttachment, askAiChat, getAiLabReadinessQuestions, getAiThread, type ReadinessQuestion } from "../../services/aiApi"
import { ensureEmployeeActor } from "../../services/actorsApi"
import { getEmployeeAuthSession, getEmployeeCompanySession } from "../../services/authApi"
import { addNotification } from "../../services/notificationCenter"
import { getTeleconsultPaidAccessStatus } from "../../services/teleconsultPaidApi"
import { useProcessLoading } from "../../app/process-loading"
import { getLabCatalog } from "../../services/labApi"
import { fetchPharmacyProducts } from "../../services/pharmacyApi"
import { mapProductToMedicine, type MedicineItem } from "../Pharmacy/medicineData"
import { useCart } from "../../app/cart"
import { useVoiceAgent } from "../../app/voice-agent"
import chatBubbleSound from "../../assets/audio/chatbubble.mp3"
import "./aichat.css"

type Message = {
  id: string
  from: "ai" | "user"
  text: string
  time: string
  attachment?: {
    name: string
    url?: string
    type: "image" | "pdf"
  }
  widgets?: LabWidget[]
  medicines?: MedicineWidget[]
  actions?: ChatAction[]
}

type LabWidget = {
  id: string
  name: string
  desc: string
  tag: string
  duration: string
  fasting: string
  color: "red" | "blue" | "gray" | "green" | "outline"
}

type MedicineWidget = {
  id: string
  name: string
  desc: string
  category: string
  priceLabel: string
  inStock: boolean
  image: string
  medicine: MedicineItem
}

type ChatAction = {
  id: string
  label: string
  action: "book_doctor" | "open_cart"
  payload?: Record<string, unknown>
}

type DoctorPresence = "online" | "writing" | "last_seen"

type DoctorIntro = {
  name: string
  avatar: string
  phone?: string
}

type AssessmentIntent = "general" | "report" | "medicine" | "tongue" | "pain"

type FilePickerMode = {
  intent: AssessmentIntent
  accept: string
  capture?: "user" | "environment"
}

const defaultSuggestions = [
  "Since when is this happening?",
  "What tests should I consider first?",
  "Any urgent warning signs to watch?",
]
const THREAD_STORAGE_KEY = "employee_ai_thread_id"
const THREAD_LAST_KEY = "employee_ai_thread_id:last"
const MESSAGE_STORAGE_PREFIX = "employee_ai_thread_messages:"
const fallbackMedicineImage = "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=900&q=80"
const SpeechRecognitionCtor =
  typeof window !== "undefined"
    ? ((window as typeof window & {
        SpeechRecognition?: new () => SpeechRecognition
        webkitSpeechRecognition?: new () => SpeechRecognition
      }).SpeechRecognition ??
      (window as typeof window & {
        SpeechRecognition?: new () => SpeechRecognition
        webkitSpeechRecognition?: new () => SpeechRecognition
      }).webkitSpeechRecognition)
    : undefined

type SpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  resultIndex?: number
  results: ArrayLike<{
    isFinal?: boolean
    0: { transcript: string }
    length: number
  }>
}

function nowTime() {
  const d = new Date()
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, "0")
  const hh = h % 12 || 12
  const ap = h >= 12 ? "PM" : "AM"
  return `${hh}:${m} ${ap}`
}

function slugifyDoctorKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "doctor"
}

function getLatestUserText(messages: Message[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].from === "user") return messages[i].text.toLowerCase()
  }
  return ""
}

function contextualSuggestions(source: string) {
  const s = source.toLowerCase()

  if (/(dizz|vertigo|faint|lightheaded)/.test(s)) {
    return [
      "I also feel nausea sometimes",
      "It gets worse when I stand up",
      "What tests are useful for dizziness?",
    ]
  }
  if (/(hair|fatigue|tired|low energy|weak)/.test(s)) {
    return [
      "Please suggest tests for fatigue + hair fall",
      "Could this be vitamin or thyroid related?",
      "What checklist should I follow before tests?",
    ]
  }
  if (/(headache|migraine|eye strain)/.test(s)) {
    return [
      "Headache is daily in the evening",
      "I also have eye strain from screens",
      "Which initial tests are recommended?",
    ]
  }
  if (/(sleep|insomnia|stress|anxious|panic)/.test(s)) {
    return [
      "Sleep has been poor for 2 weeks",
      "I feel stressed and low during work",
      "What lifestyle checks should I do first?",
    ]
  }

  return defaultSuggestions
}

function toUserSideQuickReplies(items: string[]) {
  const cleaned = items
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => item.replace(/^["']|["']$/g, ""))
    .map((item) => {
      const lower = item.toLowerCase()
      if (lower.startsWith("show ")) return `I want ${lower}`
      if (lower.startsWith("suggest ")) return `I want ${lower}`
      if (lower.startsWith("book ")) return `I want to ${lower}`
      return item
    })
    .slice(0, 3)

  if (cleaned.length === 0) return defaultSuggestions
  return cleaned
}

function renderRichText(text: string) {
  const lines = text.split("\n")
  return lines.map((line, lineIdx) => {
    const chunks = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
    return (
      <span key={`line-${lineIdx}`} className="message-line">
        {chunks.map((chunk, chunkIdx) => {
          if (chunk.startsWith("**") && chunk.endsWith("**")) {
            return <strong key={`chunk-${lineIdx}-${chunkIdx}`}>{chunk.slice(2, -2)}</strong>
          }
          return <span key={`chunk-${lineIdx}-${chunkIdx}`}>{chunk}</span>
        })}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    )
  })
}

function mapCategoryToColor(tag: string): LabWidget["color"] {
  const value = tag.toLowerCase()
  if (value.includes("blood")) return "red"
  if (value.includes("liver")) return "green"
  if (value.includes("vitamin")) return "outline"
  if (value.includes("hormone") || value.includes("thyroid")) return "gray"
  if (value.includes("lipid") || value.includes("heart")) return "blue"
  if (value.includes("diabetes") || value.includes("sugar")) return "green"
  return "outline"
}

function removeDoctorIntro(text: string) {
  return text
    .replace(/(^|\n)\s*(hello|hi|hey)[^.\n]*dr[^.\n]*[.\n]?/gi, "$1")
    .replace(/(^|\n)\s*i['’]?(?:m| am)\s+dr[^.\n]*[.\n]?/gi, "$1")
    .replace(/(^|\n)\s*i['’]?(?:m| am)\s+here\s+to\s+guide[^.\n]*[.\n]?/gi, "$1")
    .replace(/(^|\n)\s*as an ai[^.\n]*[.\n]?/gi, "$1")
    .replace(/(^|\n)\s*ai[^.\n]*doctor[^.\n]*[.\n]?/gi, "$1")
}

function humanizeDoctorReply(text: string) {
  const cleaned = removeDoctorIntro(text)
    .replace(/\bAI\b/gi, "doctor")
    .replace(/\bassistant\b/gi, "doctor")
    .replace(/(^|\s)i can help chat (it|this) through[^.\n]*[.\n]?/gi, " ")
    .replace(/(^|\s)i('?| a)m not (a|an) replace(?:ment)? for[^.\n]*[.\n]?/gi, " ")
    .replace(/(^|\s)not a replacement for[^.\n]*[.\n]?/gi, " ")
    .replace(/(^|\s)if symptoms get worse[^.\n]*[.\n]?/gi, " ")
    .replace(/\bPlease\b/g, "pls")
    .replace(/\bplease\b/g, "pls")
    .replace(/\byou can\b/gi, "u can")
    .replace(/\byou should\b/gi, "u should")
    .replace(/\byour\b/gi, "ur")
    .replace(/\byou\b/gi, "u")
    .replace(/\bdo not\b/gi, "dont")
    .replace(/\bI would\b/gi, "I'd")
    .replace(/\bI recommend\b/gi, "I'd suggest")
    .replace(/\s{2,}/g, " ")
    .trim()

  const base = cleaned || "tell me a bit more"
  const sentences = base
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

  const shortLines = sentences.slice(0, 4).map((line, index) => {
    let next = line
    if (index > 0 && next.length > 0) {
      next = next.charAt(0).toLowerCase() + next.slice(1)
    }
    if (index === 1) {
      next = next.replace(/\bwith\b/i, "wid")
    }
    if (index === 2) {
      next = next.replace(/\bthat\b/i, "tht")
    }
    return next
  })

  return shortLines.join("\n")
}

function splitDoctorReplyIntoBubbles(text: string) {
  const compact = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  if (compact.length > 1) return compact.slice(0, 5)

  return text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
}

function getReplyDelayMs(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const base = 3200
  const extra = Math.min(words * 160, 4200)
  return base + extra + Math.floor(Math.random() * 1400)
}

function assessmentGuidance(intent: AssessmentIntent) {
  switch (intent) {
    case "report":
      return {
        label: "Blood report / PDF",
        userLead: "Please review my blood report and tell me what matters most.",
        helper: "Upload blood tests, diagnostics, prescriptions, or any report PDF.",
      }
    case "medicine":
      return {
        label: "Medicine photo",
        userLead: "I am sharing my medicines so you can review what I am already taking.",
        helper: "Share strips, syrup bottles, tablets, or medicine packaging.",
      }
    case "tongue":
      return {
        label: "Tongue photo",
        userLead: "I am sharing a tongue photo for review.",
        helper: "Use good light, keep the tongue fully visible, and hold the phone steady.",
      }
    case "pain":
      return {
        label: "Pain area photo",
        userLead: "I am sharing the affected area photo for review.",
        helper: "Show swelling, redness, cut, rash, or the exact painful area clearly.",
      }
    default:
      return {
        label: "Medical upload",
        userLead: "I am sharing a medical file for review.",
        helper: "Upload any image or PDF that can help with the assessment.",
      }
  }
}

function dataUrlToBlob(dataUrl: string) {
  const [header, encoded] = dataUrl.split(",", 2)
  const mimeMatch = header.match(/data:(.*?);base64/)
  const mimeType = mimeMatch?.[1] || "image/jpeg"
  const binary = atob(encoded || "")
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

function shouldOfferMedicine(content: string) {
  return /(medicine|medicines|tablet|capsule|syrup|ibuprofen|paracetamol|what can i take|what should i take|painkiller|dose)/i.test(content)
}

export default function AIChat() {
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state as { doctor?: DoctorIntro; feelingId?: string; theme?: string; paidUnlocked?: boolean } | undefined
  const companySession = getEmployeeCompanySession()
  const authSession = getEmployeeAuthSession()
  const { start: startProcessLoading, stop: stopProcessLoading } = useProcessLoading()
  const { addItem } = useCart()
  const {
    status: voiceAgentStatus,
    startVoiceCall: startGlobalVoiceCall,
    endVoiceCall: endGlobalVoiceCall,
  } = useVoiceAgent()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatBodyRef = useRef<HTMLDivElement>(null)
  const chatSoundRef = useRef<HTMLAudioElement | null>(null)
  const typingSessionRef = useRef(0)
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null)
  const listeningTextRef = useRef("")
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)

  const messagesRef = useRef<Message[]>([])

  const doctorIntro = useMemo<DoctorIntro>(() => {
    return (
      navState?.doctor ?? {
        name: "Dr. Asha Iyer",
        avatar: "/assets/doctors/doctor-1.webp",
        phone: "+919876543210",
      }
    )
  }, [navState?.doctor])

  const feelingKey = navState?.feelingId ?? "default"
  const themeKey = navState?.theme ?? feelingKey
  const requiresPaidAccess = feelingKey !== "default"
  const doctorThreadKey = slugifyDoctorKey(doctorIntro.name)
  const stableThreadId = useMemo(() => {
    const identity = authSession?.userId?.trim() || companySession?.companyId?.trim() || "guest"
    const suffix = feelingKey === "default" ? doctorThreadKey : `${doctorThreadKey}:${feelingKey}`
    return `emp-ai:${identity}:${suffix}`
  }, [authSession?.userId, companySession?.companyId, doctorThreadKey, feelingKey])

  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [attachedName, setAttachedName] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [listeningText, setListeningText] = useState("")
  const [voiceError, setVoiceError] = useState("")
  const [isProcessingAttachment, setIsProcessingAttachment] = useState(false)
  const [aiQuickReplies, setAiQuickReplies] = useState<string[]>(defaultSuggestions)
  const [bookingWidgetId, setBookingWidgetId] = useState<string | null>(null)
  const [threadId, setThreadId] = useState("")
  const [employeeUserId, setEmployeeUserId] = useState("")
  const [doctorPresence, setDoctorPresence] = useState<DoctorPresence>("online")
  const [lastSeenLabel, setLastSeenLabel] = useState("last seen recently")
  const [showProfilePreview, setShowProfilePreview] = useState(false)
  const [paidAccessUnlocked, setPaidAccessUnlocked] = useState(Boolean(navState?.paidUnlocked))
  const [showPaidGate, setShowPaidGate] = useState(false)
  const [filePickerMode, setFilePickerMode] = useState<FilePickerMode>({
    intent: "general",
    accept: "image/*,application/pdf",
  })
  const [assessmentDone, setAssessmentDone] = useState<Record<AssessmentIntent, boolean>>({
    general: false,
    report: false,
    medicine: false,
    tongue: false,
    pain: false,
  })
  const [cameraIntent, setCameraIntent] = useState<AssessmentIntent | null>(null)
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("environment")
  const [cameraError, setCameraError] = useState("")
  const [cameraLoading, setCameraLoading] = useState(false)

  useEffect(() => {
    if (!requiresPaidAccess) {
      setPaidAccessUnlocked(true)
      return
    }
    let active = true
    void getTeleconsultPaidAccessStatus()
      .then((status) => {
        if (!active) return
        setPaidAccessUnlocked(Boolean(navState?.paidUnlocked) || status.availablePasses > 0)
      })
      .catch(() => {
        if (!active) return
        setPaidAccessUnlocked(Boolean(navState?.paidUnlocked))
      })
    return () => {
      active = false
    }
  }, [navState?.paidUnlocked, requiresPaidAccess])

  useEffect(() => {
    if (!cameraIntent) {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
      return
    }

    let active = true
    setCameraError("")
    setCameraLoading(true)

    async function startCamera() {
      try {
        cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: cameraFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        cameraStreamRef.current = stream
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream
          await cameraVideoRef.current.play().catch(() => undefined)
        }
      } catch (error) {
        if (!active) return
        setCameraError(error instanceof Error ? error.message : "Camera could not be opened.")
      } finally {
        if (active) setCameraLoading(false)
      }
    }

    void startCamera()

    return () => {
      active = false
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }
  }, [cameraIntent, cameraFacingMode])

  function openPaidConsultGate() {
    setShowPaidGate(true)
  }

  function continueToPaidCheckout() {
    navigate("/teleconsultation/offer-checkout", {
      state: {
        feelingId: feelingKey === "default" ? undefined : feelingKey,
        source: "feeling-card",
        continueRoute: "/ai-chat",
        continueState: {
          doctor: doctorIntro,
          feelingId: navState?.feelingId,
          theme: navState?.theme,
          paidUnlocked: true,
        },
      },
    })
  }

  function markAssessmentDone(intent: AssessmentIntent) {
    setAssessmentDone((prev) => ({
      ...prev,
      [intent]: true,
    }))
  }

  function closeCameraReview() {
    setCameraIntent(null)
    setCameraError("")
    setCameraLoading(false)
  }

  function launchUploadPicker(intent: AssessmentIntent, capture?: "user" | "environment") {
    if (requiresPaidAccess && !paidAccessUnlocked) {
      openPaidConsultGate()
      return
    }
    setFilePickerMode({
      intent,
      accept: intent === "report" ? "image/*,application/pdf" : "image/*",
      capture,
    })
    fileInputRef.current?.click()
  }

  async function openGuidedCamera(intent: AssessmentIntent, withVoice = false) {
    if (requiresPaidAccess && !paidAccessUnlocked) {
      openPaidConsultGate()
      return
    }
    if (withVoice && voiceAgentStatus !== "live" && voiceAgentStatus !== "connecting") {
      await startGlobalVoiceCall(doctorIntro).catch(() => undefined)
    }
    setCameraFacingMode(intent === "tongue" ? "user" : "environment")
    setCameraIntent(intent)
  }

  async function processMedicalUpload(input: {
    fileBase64: string
    mimeType: string
    fileName: string
    attachmentType: "image" | "pdf"
    intent: AssessmentIntent
    previewUrl?: string
  }) {
    const guidance = assessmentGuidance(input.intent)
    const userAttachmentMessage: Message = {
      id: `${Date.now()}-u-attachment`,
      from: "user",
      text: `${guidance.label}: ${input.fileName}`,
      time: nowTime(),
      attachment: {
        name: input.fileName,
        url: input.previewUrl,
        type: input.attachmentType,
      },
    }
    setMessages((prev) => [...prev, userAttachmentMessage])
    playChatBubbleSound()
    setDoctorPresence("writing")
    setIsProcessingAttachment(true)

    try {
      const analysis = await analyzeMedicalAttachment({
        fileBase64: input.fileBase64,
        mimeType: input.mimeType,
        fileName: input.fileName,
        doctorName: doctorIntro.name,
        userQuestion: draft.trim() || guidance.userLead,
      })

      const attachmentContext = [
        guidance.userLead,
        `Uploaded file: ${input.fileName}.`,
        `Review type: ${guidance.label}.`,
        guidance.helper,
        analysis.extractedText ? `Extracted details: ${analysis.extractedText}` : "",
        `AI review summary: ${analysis.summary}`,
        `Urgency level: ${analysis.urgency}.`,
        `Recommended next step: ${analysis.recommendedNextStep}`,
        analysis.followUpQuestion ? `Please answer this follow-up too: ${analysis.followUpQuestion}` : "",
      ].filter(Boolean).join("\n")

      markAssessmentDone(input.intent)
      await sendMessage(attachmentContext)
    } catch {
      await pushDoctorMessage({
        id: `${Date.now()}-a`,
        from: "ai",
        text: "I couldn't read that file properly just now. try re-uploading a clearer image or PDF pls.",
        time: nowTime(),
      })
    } finally {
      setIsProcessingAttachment(false)
      setAttachedName("")
    }
  }

  async function captureCameraFrame() {
    const video = cameraVideoRef.current
    const intent = cameraIntent
    if (!video || !intent) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      setCameraError("Camera capture is not available right now.")
      return
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
    const fileName = `${intent}-${Date.now()}.jpg`
    closeCameraReview()
    await processMedicalUpload({
      fileBase64: dataUrl,
      mimeType: "image/jpeg",
      fileName,
      attachmentType: "image",
      intent,
      previewUrl: URL.createObjectURL(dataUrlToBlob(dataUrl)),
    })
  }
  useEffect(() => {
    localStorage.setItem(THREAD_STORAGE_KEY, stableThreadId)
    localStorage.setItem(THREAD_LAST_KEY, stableThreadId)
    setThreadId(stableThreadId)
    setMessages([])
    setAiQuickReplies(defaultSuggestions)
    setDraft("")
    setAttachedName("")
    typingSessionRef.current += 1
  }, [stableThreadId])

  useEffect(() => {
    if (!threadId) return
    const stored = localStorage.getItem(`${MESSAGE_STORAGE_PREFIX}${threadId}`)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as Message[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed)
      }
    } catch {
      // ignore malformed cache
    }
  }, [threadId])

  useEffect(() => {
    let active = true
    void ensureEmployeeActor({
      companyReference: "astikan-demo-company",
      companyName: companySession?.companyName ?? "Astikan",
      fullName: "Astikan Employee",
      handle: "astikan-employee",
      email: "employee@astikan.local",
    })
      .then((actor) => {
        if (!active) return
        setEmployeeUserId(actor.employeeUserId)
        return getAiThread(threadId)
      })
      .then((rows) => {
        if (!active || !rows || rows.length === 0) return
        const hydrated: Message[] = rows
          .map((row, index) => ({
          id: `${index}-${row.createdAt ?? Date.now()}`,
          from: (row.role === "assistant" ? "ai" : "user") as Message["from"],
          text: row.role === "assistant" ? humanizeDoctorReply(row.content) : row.content,
          time: nowTime(),
          }))
          .filter((row) => row.text.trim().length > 0)
        setMessages(hydrated)
        localStorage.setItem(`${MESSAGE_STORAGE_PREFIX}${threadId}`, JSON.stringify(hydrated))
      })
      .catch(() => {
        // Keep seeded conversation if backend history is unavailable.
      })

    return () => {
      active = false
    }
  }, [threadId])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    listeningTextRef.current = listeningText
  }, [listeningText])

  useEffect(() => {
    return () => {
      typingSessionRef.current += 1
      speechRecognitionRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    if (doctorPresence !== "online") return
    const timeout = window.setTimeout(() => {
      setDoctorPresence("last_seen")
      setLastSeenLabel("last seen recently")
    }, 45000)
    return () => window.clearTimeout(timeout)
  }, [doctorPresence, messages])

  function playChatBubbleSound() {
    const audio = chatSoundRef.current ?? new Audio(chatBubbleSound)
    audio.volume = 0.6
    audio.currentTime = 0
    chatSoundRef.current = audio
    audio.play().catch(() => undefined)
  }

  useEffect(() => {
    if (!threadId) return
    localStorage.setItem(`${MESSAGE_STORAGE_PREFIX}${threadId}`, JSON.stringify(messages))
  }, [messages, threadId])

  useEffect(() => {
    const node = chatBodyRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    setAiQuickReplies(contextualSuggestions(getLatestUserText(messages)))
  }, [threadId])

  const suggestions = useMemo(() => {
    if (!draft.trim()) {
      if (aiQuickReplies.length > 0) {
        return aiQuickReplies
      }
      return contextualSuggestions(getLatestUserText(messages))
    }
    return contextualSuggestions(draft)
  }, [aiQuickReplies, draft, messages])

  async function buildAiMessage(content: string, history: Array<{ role: "user" | "assistant"; content: string }>) {
    const result = await askAiChat({
      message: content,
      history,
      threadId,
      userId: employeeUserId || undefined,
      appContext: "employee",
      doctorName: doctorIntro.name,
    })
    setAiQuickReplies(toUserSideQuickReplies(result.quickReplies ?? []))

    const suggested = result.suggestedTests ?? []
    let widgets: LabWidget[] = []
    let medicines: MedicineWidget[] = []
    const actions: ChatAction[] = []

    const wantsDoctor =
      result.nextAction === "book_doctor" ||
      /book\s+(a\s+)?doctor|consult(ation)?/i.test(content)

    if (wantsDoctor) {
      // Keep symptom chats conversational for now; don't inject consultation CTA widgets here.
    }

    if (suggested.length > 0) {
      const widgetResults = await Promise.all(
        suggested.slice(0, 5).map(async (item, index) => {
          const keyword = item.name.trim()
          if (!keyword) {
            return null
          }

          try {
            const data = await getLabCatalog(keyword, 1, 0)
            const test = data.tests[0]
            if (!test) {
              return null
            }
            return {
              id: test.id,
              name: test.name,
              desc: test.code ? `Test Code: ${test.code}` : "Comprehensive health test",
              tag: test.category,
              duration: test.reportingTime || "Not available",
              fasting: "Preparation details available in test description",
              color: mapCategoryToColor(test.category),
            } satisfies LabWidget
          } catch {
            return {
              id: `ai-${index}-${Date.now()}`,
              name: item.name,
              desc: item.reason || "Suggested by AI based on your symptoms",
              tag: item.category || "General Test",
              duration: "Check availability",
              fasting: "Follow doctor/lab preparation advice",
              color: mapCategoryToColor(item.category || "General Test"),
            } satisfies LabWidget
          }
        })
      )

      widgets = widgetResults.filter((item): item is LabWidget => !!item)
    }

    if (shouldOfferMedicine(content) && (result.suggestedMedicines ?? []).length > 0) {
      const medicineResults = await Promise.all(
        (result.suggestedMedicines ?? []).slice(0, 1).map(async (item, index) => {
          const keyword = item.name.trim()
          if (!keyword) return null

          try {
            const rows = await fetchPharmacyProducts({ search: keyword, limit: 1, audience: "employee" })
            const match = rows?.[0]
            if (match) {
              const med = mapProductToMedicine(match)
              return {
                id: med.id,
                name: med.name,
                desc: item.reason || med.overview,
                category: med.kind,
                priceLabel: med.price ? `₹${med.price}` : "Ask pharmacist",
                inStock: med.inStock,
                image: med.image,
                medicine: med,
              } satisfies MedicineWidget
            }
          } catch {
            // fall through to fallback
          }

          const fallbackProduct = {
            id: `ai-med-${index}-${Date.now()}`,
            name: item.name,
            category: item.category ?? "Medicine",
            description: item.reason ?? "Suggested by the care assistant",
            base_price_inr: 0,
            image_urls_json: [fallbackMedicineImage],
            in_stock: true,
          }
          const med = mapProductToMedicine(fallbackProduct)
          return {
            id: med.id,
            name: med.name,
            desc: item.reason || med.overview,
            category: med.kind,
            priceLabel: "Ask pharmacist",
            inStock: med.inStock,
            image: med.image,
            medicine: med,
          } satisfies MedicineWidget
        })
      )
      medicines = medicineResults.filter((item): item is MedicineWidget => !!item)
    }

    return {
      id: `${Date.now()}-a`,
      from: "ai" as const,
      text: humanizeDoctorReply(result.reply),
      time: nowTime(),
      widgets,
      medicines,
      actions,
    }
  }

  const pushDoctorMessage = async (message: Message) => {
    const session = typingSessionRef.current + 1
    typingSessionRef.current = session
    setDoctorPresence("writing")
    const delay = getReplyDelayMs(message.text)
    await new Promise((resolve) => window.setTimeout(resolve, delay))
    if (typingSessionRef.current !== session) {
      return
    }
    const parts = splitDoctorReplyIntoBubbles(message.text)
    const baseId = Date.now()
    for (const [index, part] of parts.entries()) {
      const bubble: Message = {
        ...message,
        id: `${baseId}-a-${index}`,
        text: part,
        widgets: index === parts.length - 1 ? message.widgets : undefined,
        medicines: index === parts.length - 1 ? message.medicines : undefined,
        actions: index === parts.length - 1 ? message.actions : undefined,
        time: nowTime(),
      }
      setMessages((prev) => [...prev, bubble])
      playChatBubbleSound()
      if (index < parts.length - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1800 + Math.floor(Math.random() * 900)))
      }
    }
    setDoctorPresence("online")
    const body = parts.join(" ").replace(/\n+/g, " ").slice(0, 120)
    void addNotification({
      title: doctorIntro.name,
      body: body || "New message from your doctor.",
      channel: "consult",
      cta: { label: "Open chat", route: "/ai-chat" },
    }).catch(() => undefined)
  }

  async function sendMessage(text?: string) {
    const content = (text ?? draft).trim()
    if (!content || !threadId) {
      return
    }
    if (requiresPaidAccess && !paidAccessUnlocked) {
      openPaidConsultGate()
      return
    }

    const userMessage: Message = {
      id: `${Date.now()}-u`,
      from: "user",
      text: content,
      time: nowTime(),
    }

    setMessages((prev) => [...prev, userMessage])
    playChatBubbleSound()
    setDraft("")
    setDoctorPresence("writing")

    try {
      const history = messagesRef.current
        .filter((item) => item.from === "ai" || item.from === "user")
        .slice(-10)
        .map((item) => ({
          role: item.from === "user" ? ("user" as const) : ("assistant" as const),
          content: item.text,
        }))

      const aiMessage = await buildAiMessage(content, history)
      await pushDoctorMessage(aiMessage)
    } catch (_error: unknown) {
      try {
        await new Promise((resolve) => window.setTimeout(resolve, 3600))
        const retryHistory = messagesRef.current
          .filter((item) => item.from === "ai" || item.from === "user")
          .slice(-10)
          .map((item) => ({
            role: item.from === "user" ? ("user" as const) : ("assistant" as const),
            content: item.text,
          }))
        const retryMessage = await buildAiMessage(content, retryHistory)
        await pushDoctorMessage(retryMessage)
      } catch {
        setAiQuickReplies(defaultSuggestions)
        await pushDoctorMessage({
          id: `${Date.now()}-a`,
          from: "ai",
          text: "one sec.. network's a bit weird rn. send me that once more pls",
          time: nowTime(),
        })
      }
    }
  }

  async function onBookFromWidget(widget: LabWidget) {
    setBookingWidgetId(widget.id)
    startProcessLoading()
    try {
      const readiness = await getAiLabReadinessQuestions({
        testName: widget.name,
        fastingInfo: widget.fasting,
      })
      navigate("/lab-tests/readiness", {
        state: {
          selectedTest: {
            id: widget.id,
            color: widget.color,
            name: widget.name,
            desc: widget.desc,
            tag: widget.tag,
            duration: widget.duration,
            fasting: widget.fasting,
          },
          readinessQuestions: readiness.questions as ReadinessQuestion[],
        },
      })
    } catch {
      navigate("/lab-tests/readiness", {
        state: {
          selectedTest: {
            id: widget.id,
            color: widget.color,
            name: widget.name,
            desc: widget.desc,
            tag: widget.tag,
            duration: widget.duration,
            fasting: widget.fasting,
          },
        },
      })
    } finally {
      setBookingWidgetId(null)
      stopProcessLoading()
    }
  }

  function onActionClick(action: ChatAction) {
    if (action.action === "open_cart") {
      navigate("/cart")
      return
    }
    if (action.action === "book_doctor") {
      const specialty = String(action.payload?.specialty ?? "").trim()
      navigate("/teleconsultation", {
        state: {
          fromAiAnalyser: true,
          preselectedSpecialty: specialty || undefined,
          analysisQuery: String(action.payload?.analysisQuery ?? "") || undefined,
          recommendedMode: requiresPaidAccess ? "opd" : "tele",
        },
      })
    }
  }

  function openPicker() {
    launchUploadPicker("general")
  }

  function stopListening() {
    speechRecognitionRef.current?.stop()
    speechRecognitionRef.current = null
    setIsListening(false)
  }

  function startVoiceInput() {
    if (requiresPaidAccess && !paidAccessUnlocked) {
      openPaidConsultGate()
      return
    }
    speechRecognitionRef.current?.stop()
    if (!SpeechRecognitionCtor) {
      setVoiceError("Voice input is not supported on this device yet.")
      setIsListening(true)
      return
    }

    setVoiceError("")
    setListeningText("")
    setIsListening(true)

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = "en-IN"

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim()
      listeningTextRef.current = transcript
      setListeningText(transcript)

      const finalTranscript = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim()

      if (finalTranscript) {
        listeningTextRef.current = finalTranscript
        setDraft(finalTranscript)
      }
    }

    recognition.onerror = (event) => {
      setVoiceError(event.error ? `Voice input failed: ${event.error}` : "Voice input failed.")
    }

    recognition.onend = () => {
      const finalText = listeningTextRef.current.trim()
      speechRecognitionRef.current = null
      setIsListening(false)
      if (finalText) {
        setDraft(finalText)
        void sendMessage(finalText)
      }
    }

    speechRecognitionRef.current = recognition
    recognition.start()
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }
    setAttachedName(file.name)
    e.target.value = ""

    const isImage = file.type.startsWith("image/")
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isImage && !isPdf) {
      await pushDoctorMessage({
        id: `${Date.now()}-a`,
        from: "ai",
        text: "pls upload an image or PDF so I can review it properly.",
        time: nowTime(),
      })
      return
    }

    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ""))
        reader.onerror = () => reject(new Error("Unable to read file"))
        reader.readAsDataURL(file)
      })
      await processMedicalUpload({
        fileBase64,
        mimeType: file.type || (isPdf ? "application/pdf" : "image/jpeg"),
        fileName: file.name,
        attachmentType: isPdf ? "pdf" : "image",
        intent: filePickerMode.intent,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      })
    } catch {}
  }

  const guidedAssessmentOptions = requiresPaidAccess
    ? [
        {
          id: "report" as const,
          title: "Blood Report",
          subtitle: "PDF or image",
          action: () => launchUploadPicker("report"),
          icon: <FiUploadCloud />,
        },
        {
          id: "medicine" as const,
          title: "Medicine Photo",
          subtitle: "Current tablets",
          action: () => launchUploadPicker("medicine", "environment"),
          icon: <FiImage />,
        },
        {
          id: "tongue" as const,
          title: "Tongue Check",
          subtitle: "Front camera",
          action: () => void openGuidedCamera("tongue"),
          icon: <FiCamera />,
        },
        {
          id: "pain" as const,
          title: "Pain Area",
          subtitle: "Back camera",
          action: () => void openGuidedCamera("pain", true),
          icon: <FiCamera />,
        },
      ]
    : []

  return (
    <div className={`ai-chat-page theme-${themeKey}`}>
      <header className="ai-chat-header">
        <button className="ai-chat-back app-pressable" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>

        <div className="ai-chat-header-info">
          <div className="ai-chat-doctor">
            <button
              type="button"
              className="ai-chat-avatar-btn app-pressable"
              onClick={() => setShowProfilePreview(true)}
              aria-label={`Open ${doctorIntro.name} profile picture`}
            >
              <img src={doctorIntro.avatar} alt={doctorIntro.name} />
            </button>
            <div>
              <h1 className="ai-chat-title">{doctorIntro.name}</h1>
              <div className="ai-chat-status">
                <span className={`ai-chat-dot ${doctorPresence}`} />
                {doctorPresence === "writing"
                  ? "writing..."
                  : doctorPresence === "last_seen"
                    ? lastSeenLabel
                    : "online"}
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="ai-chat-call-btn app-pressable"
          onClick={() => {
            if (requiresPaidAccess && !paidAccessUnlocked) {
              openPaidConsultGate()
              return
            }
            if (voiceAgentStatus === "live" || voiceAgentStatus === "connecting") {
              void endGlobalVoiceCall()
              return
            }
            void startGlobalVoiceCall(doctorIntro)
          }}
          aria-label={`Start ${doctorIntro.name} voice consultation`}
        >
          <FiPhoneCall />
        </button>
      </header>

      <div className="ai-chat-body" ref={chatBodyRef}>
        {requiresPaidAccess && paidAccessUnlocked && (
          <section className="guided-assessment-card">
            <div className="guided-assessment-head">
              <div>
                <h3>15 Min Care Assistant</h3>
                <p>Upload reports, show medicines, tongue, or affected area so {doctorIntro.name} can guide the next step.</p>
              </div>
              <span className="guided-assessment-pill">Paid</span>
            </div>
            <div className="guided-assessment-grid">
              {guidedAssessmentOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`guided-assessment-tile app-pressable ${assessmentDone[option.id] ? "done" : ""}`}
                  onClick={option.action}
                >
                  <span className="guided-assessment-icon">{assessmentDone[option.id] ? <FiCheckCircle /> : option.icon}</span>
                  <strong>{option.title}</strong>
                  <small>{option.subtitle}</small>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="guided-assessment-voice app-pressable"
              onClick={() => void openGuidedCamera("pain", true)}
            >
              <FiPhoneCall />
              Start voice + camera review
            </button>
          </section>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`message-row ${msg.from === "user" ? "user" : "ai"} bubble-enter`}>
            <div className="message-bubble">
              <div className="message-text">{renderRichText(msg.text)}</div>
              {msg.from === "ai" && !!msg.actions?.length && (
                <div className="ai-action-row">
                  {msg.actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      className="ai-action-btn app-pressable"
                      onClick={() => onActionClick(action)}
                    >
                      <FiCalendar />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              {msg.from === "ai" && !!msg.widgets?.length && (
                <div className="ai-lab-widget-list">
                  {msg.widgets.map((widget) => (
                    <article key={widget.id} className="ai-lab-widget">
                      <div className={`ai-lab-dot ${widget.color}`} aria-hidden="true" />
                      <div className="ai-lab-info">
                        <h4>{widget.name}</h4>
                        <p>{widget.desc}</p>
                        <div className="ai-lab-meta">
                          <span>{widget.tag}</span>
                          <span>{widget.duration}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="ai-lab-book"
                        onClick={() => void onBookFromWidget(widget)}
                        disabled={bookingWidgetId === widget.id}
                      >
                        Book
                      </button>
                    </article>
                  ))}
                </div>
              )}
              {msg.from === "ai" && !!msg.medicines?.length && (
                <div className="ai-med-widget-list">
                  {msg.medicines.map((med) => (
                    <article key={med.id} className="ai-med-widget">
                      <img src={med.image} alt={med.name} loading="lazy" />
                      <div className="ai-med-info">
                        <h4>{med.name}</h4>
                        <p>{med.desc}</p>
                        <div className="ai-med-meta">
                          <span>{med.category}</span>
                          <span>{med.priceLabel}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="ai-med-add app-pressable"
                        onClick={() => {
                          addItem(med.medicine)
                          navigate("/cart")
                        }}
                      >
                        <FiPlus /> Add
                      </button>
                    </article>
                  ))}
                </div>
              )}
              {msg.attachment && (
                <div className="chat-attachment">
                  {msg.attachment.type === "image" && msg.attachment.url ? (
                    <img src={msg.attachment.url} alt={msg.attachment.name} loading="lazy" className="chat-attachment-image" />
                  ) : (
                    <div className="chat-attachment-file">
                      <FiFileText />
                      <span>{msg.attachment.name}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="message-time">{msg.time}</div>
            </div>
          </div>
        ))}
      </div>

      {showProfilePreview && (
        <div
          className="ai-chat-profile-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowProfilePreview(false)}
        >
          <section className="ai-chat-profile-popup app-page-enter" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="ai-chat-profile-close app-pressable"
              onClick={() => setShowProfilePreview(false)}
              aria-label="Close profile preview"
            >
              ×
            </button>
            <img src={doctorIntro.avatar} alt={doctorIntro.name} />
            <h2>{doctorIntro.name}</h2>
            <button
              type="button"
              className="ai-chat-profile-call app-pressable"
              onClick={() => {
                setShowProfilePreview(false)
                if (requiresPaidAccess && !paidAccessUnlocked) {
                  openPaidConsultGate()
                  return
                }
                void startGlobalVoiceCall(doctorIntro)
              }}
            >
              <FiPhoneCall />
              <span>Call</span>
            </button>
          </section>
        </div>
      )}

      <div className="composer-wrap">
        {!!attachedName && <div className="attached-pill">{isProcessingAttachment ? `Analyzing upload: ${attachedName}` : `Attached: ${attachedName}`}</div>}

        <div className="quick-actions">
          {suggestions.map((item) => (
            <button key={item} onClick={() => sendMessage(item)} type="button">
              {item}
            </button>
          ))}
        </div>

        <div className="ai-chat-input">
          <button className="icon-btn" onClick={openPicker} type="button" aria-label="Add image">
            <FiImage />
          </button>
          <button className="icon-btn" onClick={startVoiceInput} type="button" aria-label="Voice input">
            <FiMic />
          </button>

          <input
            placeholder="Describe your symptoms..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage()
              }
            }}
          />

          <button className="send-btn" onClick={() => sendMessage()} type="button" aria-label="Send">
            <FiSend />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={filePickerMode.accept}
        capture={filePickerMode.capture}
        className="hidden-file"
        onChange={onPickFile}
      />

      {showPaidGate && (
        <div className="ai-paid-gate-overlay" onClick={() => setShowPaidGate(false)}>
          <section className="ai-paid-gate-card app-page-enter" onClick={(event) => event.stopPropagation()}>
            <h3>Unlock this doctor for ₹49</h3>
            <p>This feeling doctor is part of the paid care flow. Pay once to continue chatting, start voice call, upload reports, and use the 15 minute doctor assist flow.</p>
            <div className="ai-paid-gate-points">
              <span>Chat and continue with the agent</span>
              <span>Voice call with camera/report guidance</span>
              <span>Medicine, lab, and next OPD recommendation flow</span>
            </div>
            <div className="ai-paid-gate-actions">
              <button type="button" className="ai-paid-gate-secondary app-pressable" onClick={() => setShowPaidGate(false)}>
                Later
              </button>
              <button type="button" className="ai-paid-gate-primary app-pressable" onClick={continueToPaidCheckout}>
                Pay ₹49 and Continue
              </button>
            </div>
          </section>
        </div>
      )}

      {isListening && (
        <div className="voice-overlay" onClick={stopListening}>
          <div className="voice-sheet app-page-enter" onClick={(e) => e.stopPropagation()}>
            <h4>Listening...</h4>
            <p>{voiceError || "Speak your symptoms clearly. I’ll turn it into chat text."}</p>
            <div className="voice-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            {!!listeningText && <div className="voice-transcript-preview">{listeningText}</div>}
            <button className="stop-voice app-pressable" onClick={stopListening} type="button">Stop</button>
          </div>
        </div>
      )}

      {cameraIntent && (
        <div className="camera-review-overlay" onClick={closeCameraReview}>
          <section className="camera-review-card app-page-enter" onClick={(event) => event.stopPropagation()}>
            <header className="camera-review-head">
              <div>
                <h3>{assessmentGuidance(cameraIntent).label}</h3>
                <p>{assessmentGuidance(cameraIntent).helper}</p>
              </div>
              <button type="button" className="camera-review-close app-pressable" onClick={closeCameraReview} aria-label="Close camera">
                <FiX />
              </button>
            </header>

            <div className="camera-review-frame">
              {cameraLoading ? <div className="camera-review-state">Opening camera...</div> : null}
              {cameraError ? <div className="camera-review-state error">{cameraError}</div> : null}
              <video ref={cameraVideoRef} autoPlay playsInline muted className={cameraLoading || cameraError ? "hidden" : ""} />
            </div>

            <div className="camera-review-notes">
              <span>Use steady light and keep the area fully visible.</span>
              <span>{cameraIntent === "tongue" ? "Open your mouth and keep the tongue centered." : "Show the exact painful area or visible symptom clearly."}</span>
            </div>

            <div className="camera-review-actions">
              <button
                type="button"
                className="camera-review-secondary app-pressable"
                onClick={() => setCameraFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
              >
                <FiRefreshCcw />
                Switch Camera
              </button>
              <button
                type="button"
                className="camera-review-primary app-pressable"
                onClick={() => void captureCameraFrame()}
                disabled={cameraLoading || Boolean(cameraError)}
              >
                <FiCamera />
                Capture and Review
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
