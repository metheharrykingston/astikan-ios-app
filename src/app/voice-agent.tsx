import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Capacitor, registerPlugin } from "@capacitor/core"
import { getAiLabReadinessQuestions, createVoiceClientSecret } from "../services/aiApi"
import { syncAddressCache } from "../services/addressStore"
import { fetchPharmacyProducts } from "../services/pharmacyApi"
import { fetchDoctors as fetchDoctorDirectory } from "../services/doctorsApi"
import { getLabCatalog } from "../services/labApi"
import { mapProductToMedicine } from "../pages/Pharmacy/medicineData"
import { useCart } from "./cart"
import { enqueueVoiceAutomation } from "./voiceAutomation"
import "./voice-agent.css"

type VoiceDoctor = {
  name: string
  avatar: string
  phone?: string
}

type VoiceProfile = {
  voice: string
  introName: string
}

type VoiceProfileRecord = VoiceProfile & {
  aliases?: string[]
}

type VoiceAgentContextValue = {
  open: boolean
  status: "idle" | "connecting" | "live" | "error"
  error: string
  doctor: VoiceDoctor
  startVoiceCall: (doctor?: Partial<VoiceDoctor>) => Promise<void>
  endVoiceCall: () => Promise<void>
}

const DEFAULT_DOCTOR: VoiceDoctor = {
  name: "Dr. Suneeta Mittal",
  avatar: "/assets/doctors/dr-suneeta-mittal.webp",
  phone: "+919876543210",
}

function normalizeDoctorName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

const DOCTOR_VOICE_PROFILES: VoiceProfileRecord[] = [
  {
    aliases: ["dr suneeta mittal", "suneeta mittal", "dr suneeta", "suneeta"],
    voice: "73xd5dum",
    introName: "Dr Suneeta Mittal",
  },
  {
    aliases: ["dr amita mahajan", "amita mahajan", "dr amita", "amita"],
    voice: "247783ebdd51",
    introName: "Dr Amita Mahajan",
  },
  {
    aliases: ["dr renu misra", "renu misra", "dr renu", "renu"],
    voice: "Eve",
    introName: "Dr Renu Misra",
  },
  {
    aliases: ["dr indu bansal aggarwal", "indu bansal aggarwal", "dr indu", "indu"],
    voice: "35c8d7f60dc8",
    introName: "Dr Indu Bansal Aggarwal",
  },
  {
    aliases: ["dr naresh trehan", "naresh trehan", "dr naresh", "naresh"],
    voice: "ekhwx401",
    introName: "Dr Naresh Trehan",
  },
  {
    aliases: ["dr randeep guleria", "randeep guleria", "dr randeep", "randeep"],
    voice: "70013edeb8e8",
    introName: "Dr Randeep Guleria",
  },
]

const FALLBACK_FEMALE_VOICE = "ara"
const FALLBACK_MALE_VOICE = "rex"
const FEMALE_DOCTOR_HINTS = ["amita", "renu", "indu", "suneeta", "mittal", "mahajan", "misra", "aggarwal"]

function inferFallbackVoice(doctorName: string) {
  const normalizedName = normalizeDoctorName(doctorName)
  if (FEMALE_DOCTOR_HINTS.some((token) => normalizedName.includes(token))) {
    return FALLBACK_FEMALE_VOICE
  }
  return FALLBACK_MALE_VOICE
}

function getVoiceProfile(doctorName: string): VoiceProfile {
  const normalizedName = normalizeDoctorName(doctorName)
  const matchedProfile = DOCTOR_VOICE_PROFILES.find((profile) =>
    (profile.aliases ?? []).some((alias) => {
      const normalizedAlias = normalizeDoctorName(alias)
      return (
        normalizedAlias === normalizedName ||
        normalizedAlias.includes(normalizedName) ||
        normalizedName.includes(normalizedAlias)
      )
    }),
  )

  if (matchedProfile) {
    return {
      voice: matchedProfile.voice,
      introName: matchedProfile.introName,
    }
  }

  return {
    voice: inferFallbackVoice(doctorName),
    introName: doctorName.replace(/\./g, "").trim() || "Doctor from Astikan",
  }
}

function buildDoctorVoiceInstructions(doctorName: string) {
  const profile = getVoiceProfile(doctorName)
  return `You are ${profile.introName}, a doctor for Astikan Healthcare. Your role is to help users describe symptoms clearly, perform structured triage, provide safe conservative self-care and OTC guidance only for low-risk cases, and escalate to a human doctor whenever risk is moderate/high, unclear, or red flags exist.

IMPORTANT SAFETY RULES:
- For any OTC suggestions, always state: 1) purpose, 2) adult maximum daily dose reminder, 3) common contraindication checks, 4) clear stop/escalate rules.
- Lower your threshold for escalation if the user is a child, pregnant, elderly, has chronic disease, or takes multiple medicines.
- If any emergency red flags appear (chest pain, breathlessness, stroke signs, confusion, fainting, severe bleeding, seizures, suicidal thoughts, etc.), immediately advise calling emergency services.

CONVERSATION STYLE:
- Be warm, calm, and doctor-like.
- Ask only one question at a time.
- Keep replies short and natural for voice mode.
- Stay in the Astikan popup while guiding the user through booking flows.
- Speak as if you are handling the process for the user. Do not ask the user to look at buttons, cards, widgets, or the screen.
- Prefer action-first language such as "It's available, should I book it for you?" instead of "Do you see it?".

APP AUTOMATION RULES:
- If the user asks for medicines, pharmacy reorder, or delivery, silently search for the best match first, then tell the user the result in plain language and continue the order flow.
- If the user asks for teleconsultation or doctor booking, use the teleconsultation tool to open the doctor flow with the right specialty and symptoms.
- If the user asks for lab tests, use the lab tools to open the lab flow, choose the matching test, and continue the readiness flow.
- Before placing a pharmacy order, confirm the address and payment method.
- Never claim you completed a booking if the tool result says it is pending or failed.
- Avoid unnecessary tool calls if the next app action is already obvious from the live flow.
- Only mention a medicine is unavailable if the tool result clearly says no good match was found.

TRIAGE FLOW:
1. Greet in Hindi with "Namaste, main ${profile.introName} Astikan se hoon. Aaj aap kaisa mehsoos kar rahe hain?"
2. Collect main symptom, onset/duration, severity, associated symptoms, age band, pregnancy status if relevant, existing conditions, medicines, and allergies.
3. Screen for red flags.
4. Decide risk: HIGH/MODERATE means escalate to human doctor; LOW means self-care plus monitoring.
5. If the user wants medicine, tests, or doctor booking, use app tools and continue guiding them while the app navigates.
6. Close with clear next steps and when to seek urgent care.`
}
const VoiceAgentContext = createContext<VoiceAgentContextValue | null>(null)

type VoiceCallModePlugin = {
  startCallMode(options: { title?: string; text?: string }): Promise<{ started: boolean }>
  stopCallMode(): Promise<{ stopped: boolean }>
}

const NativeVoiceCallMode = registerPlugin<VoiceCallModePlugin>("VoiceCallMode")

function normalizeSearchValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function tokenizeSearchValue(value: string) {
  return normalizeSearchValue(value).split(" ").filter(Boolean)
}

function scoreMedicineMatch(query: string, target: string) {
  const normalizedQuery = normalizeSearchValue(query)
  const normalizedTarget = normalizeSearchValue(target)
  if (!normalizedQuery || !normalizedTarget) return 0
  if (normalizedTarget === normalizedQuery) return 100
  if (normalizedTarget.includes(normalizedQuery)) return 92

  const queryTokens = tokenizeSearchValue(query)
  const targetTokens = tokenizeSearchValue(target)
  const tokenHits = queryTokens.filter((token) =>
    targetTokens.some((candidate) => candidate.includes(token) || token.includes(candidate)),
  ).length

  if (!queryTokens.length) return 0
  const coverage = tokenHits / queryTokens.length
  return Math.round(coverage * 80)
}

async function findBestMedicineMatch(query: string) {
  const search = query.trim()
  if (!search) return null

  const directRows = await fetchPharmacyProducts({ search, limit: 8, audience: "employee" }).catch(() => [])
  const fallbackRows =
    directRows.length > 0
      ? directRows
      : await fetchPharmacyProducts({
          search: tokenizeSearchValue(search).slice(0, 2).join(" "),
          limit: 12,
          audience: "employee",
        }).catch(() => [])

  const ranked = fallbackRows
    .map((row) => {
      const medicine = mapProductToMedicine(row)
      const score = Math.max(
        scoreMedicineMatch(search, medicine.name),
        scoreMedicineMatch(search, `${medicine.name} ${medicine.kind} ${medicine.dose}`),
      )
      return { medicine, score }
    })
    .sort((a, b) => b.score - a.score)

  const best = ranked[0]
  if (!best || best.score < 35) return null
  return best.medicine
}

function downsampleTo24k(input: Float32Array, inputRate: number) {
  if (inputRate === 24000) return input
  const ratio = inputRate / 24000
  const newLength = Math.floor(input.length / ratio)
  const output = new Float32Array(newLength)
  for (let i = 0; i < newLength; i += 1) {
    const start = Math.floor(i * ratio)
    const end = Math.min(Math.floor((i + 1) * ratio), input.length)
    let sum = 0
    let count = 0
    for (let j = start; j < end; j += 1) {
      sum += input[j]
      count += 1
    }
    output[i] = count ? sum / count : 0
  }
  return output
}

function pcm16ToBase64(float32: Float32Array) {
  const bytes = new Uint8Array(float32.length * 2)
  for (let i = 0; i < float32.length; i += 1) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    const v = s < 0 ? s * 0x8000 : s * 0x7fff
    const iv = Math.round(v)
    bytes[i * 2] = iv & 0xff
    bytes[i * 2 + 1] = (iv >> 8) & 0xff
  }
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function VoiceAgentProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { addItem, items } = useCart()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "error">("idle")
  const [error, setError] = useState("")
  const [doctor, setDoctor] = useState<VoiceDoctor>(DEFAULT_DOCTOR)

  const voiceSocketRef = useRef<WebSocket | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const monitorGainRef = useRef<GainNode | null>(null)
  const nextPlaybackAtRef = useRef(0)
  const playbackNodesRef = useRef<AudioBufferSourceNode[]>([])
  const voiceResponseInFlightRef = useRef(false)

  async function startNativeBackgroundMode(title: string) {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return
    try {
      await NativeVoiceCallMode.startCallMode({
        title,
        text: "Astikan consultation is still active in background.",
      })
    } catch {
      // best effort only
    }
  }

  async function stopNativeBackgroundMode() {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return
    try {
      await NativeVoiceCallMode.stopCallMode()
    } catch {
      // best effort only
    }
  }

  function stopVoicePlayback() {
    playbackNodesRef.current.forEach((node) => {
      try {
        node.stop()
      } catch {
        // ignore
      }
    })
    playbackNodesRef.current = []
    nextPlaybackAtRef.current = 0
  }

  function playVoicePcmChunk(base64: string) {
    const ctx = audioCtxRef.current
    if (!ctx) return
    if (ctx.state !== "running") {
      void ctx.resume().catch(() => undefined)
    }
    const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0))
    const samples = new Float32Array(bytes.length / 2)
    for (let i = 0; i < samples.length; i += 1) {
      const lo = bytes[i * 2]
      const hi = bytes[i * 2 + 1]
      let v = (hi << 8) | lo
      if (v & 0x8000) v -= 0x10000
      samples[i] = v / 0x8000
    }
    const audioBuffer = ctx.createBuffer(1, samples.length, 24000)
    audioBuffer.copyToChannel(samples, 0)
    const src = ctx.createBufferSource()
    src.buffer = audioBuffer
    src.connect(ctx.destination)
    const now = ctx.currentTime
    if (nextPlaybackAtRef.current < now) nextPlaybackAtRef.current = now
    src.start(nextPlaybackAtRef.current)
    nextPlaybackAtRef.current += audioBuffer.duration
    playbackNodesRef.current.push(src)
    src.onended = () => {
      playbackNodesRef.current = playbackNodesRef.current.filter((node) => node !== src)
    }
  }

  async function handleVoiceToolCall(name: string, argsJson: string) {
    let args: Record<string, unknown> = {}
    try {
      args = JSON.parse(argsJson || "{}") as Record<string, unknown>
    } catch {
      args = {}
    }

    if (name === "find_doctor") {
      const symptom = String(args.symptom || "General consultation")
      const specialtyHint = String(args.specialty_hint || "General Physician")
      const rows = await fetchDoctorDirectory({ limit: 3, offset: 0 }).catch(() => [])
      const doctors = rows.slice(0, 3).map((row) => ({
        doctor_name: row.full_name ?? row.full_display_name ?? "Astikan Doctor",
        specialty: row.doctor_specializations?.[0]?.specialization_name ?? specialtyHint,
        next_available: "Today",
        booking_url: "/teleconsultation",
      }))
      return { success: true, symptom, doctors }
    }

    if (name === "show_medicine") {
      const query = String(args.medicine_query || "").trim()
      const bestMatch = await findBestMedicineMatch(query)
      navigate("/pharmacy", { state: { searchQuery: bestMatch?.name ?? query } })
      return {
        success: true,
        route: "/pharmacy",
        medicine_query: query,
        medicine_name: bestMatch?.name ?? null,
        available: Boolean(bestMatch),
      }
    }

    if (name === "add_medicine_to_cart") {
      const query = String(args.medicine_query || "").trim()
      const quantity = Math.max(1, Number(args.quantity || 1))
      const medicine = await findBestMedicineMatch(query)
      if (!medicine) {
        return { success: false, message: "No matching medicine found." }
      }
      addItem(medicine, quantity)
      navigate("/cart")
      return { success: true, route: "/cart", medicine_name: medicine.name, quantity }
    }

    if (name === "start_pharmacy_checkout") {
      const query = String(args.medicine_query || "").trim()
      const quantity = Math.max(1, Number(args.quantity || 1))
      const medicine = query ? await findBestMedicineMatch(query) : null
      if (medicine) {
        addItem(medicine, quantity)
      } else if (!items.length) {
        return { success: false, message: "No medicine available to checkout." }
      }
      navigate("/pharmacy/checkout")
      return {
        success: true,
        route: "/pharmacy/checkout",
        medicine_name: medicine?.name ?? null,
        available: Boolean(medicine || items.length),
      }
    }

    if (name === "set_delivery_address") {
      const address = String(args.address || "").trim()
      const addressType = args.address_type === "office" ? "office" : "home"
      syncAddressCache({
        homeAddress: addressType === "home" ? address : undefined,
        officeAddress: addressType === "office" ? address : undefined,
        primary: addressType,
      })
      enqueueVoiceAutomation({ type: "pharmacy-checkout-address", payload: { addressType } })
      if (!location.pathname.startsWith("/pharmacy/checkout")) {
        navigate("/pharmacy/checkout")
      }
      return { success: true, address_type: addressType }
    }

    if (name === "confirm_pharmacy_checkout") {
      const paymentMethod = args.payment_method === "COD" ? "COD" : "CASHFREE"
      enqueueVoiceAutomation({ type: "pharmacy-checkout-confirm", payload: { paymentMethod } })
      if (!location.pathname.startsWith("/pharmacy/checkout")) {
        navigate("/pharmacy/checkout")
      }
      return { success: true, payment_method: paymentMethod }
    }

    if (name === "open_lab_flow") {
      const testQuery = String(args.test_query || "").trim()
      navigate("/lab-tests", { state: { voiceQuery: testQuery } })
      return { success: true, route: "/lab-tests", test_query: testQuery }
    }

    if (name === "select_lab_test") {
      const testQuery = String(args.test_name || "").trim()
      const catalog = await getLabCatalog(testQuery, 1, 0)
      const test = catalog.tests[0]
      if (!test) {
        return { success: false, message: "No matching lab test found." }
      }
      const readiness = await getAiLabReadinessQuestions({
        testName: test.name,
        fastingInfo: "Preparation details available in test description",
      }).catch(() => ({ questions: [] }))
      navigate("/lab-tests/readiness", {
        state: {
          selectedTest: {
            id: test.id,
            code: test.code,
            color: "outline",
            name: test.name,
            desc: test.code ? `Test Code: ${test.code}` : "Comprehensive health test",
            tag: test.category,
            duration: test.reportingTime || "Not available",
            fasting: "Preparation details available in test description",
          },
          readinessQuestions: readiness.questions,
        },
      })
      return { success: true, route: "/lab-tests/readiness", test_name: test.name }
    }

    if (name === "answer_lab_readiness") {
      const answer = args.answer === "yes" ? "yes" : "no"
      enqueueVoiceAutomation({ type: "lab-readiness-answer", payload: { answer } })
      return { success: true, answer }
    }

    if (name === "open_teleconsultation_flow") {
      const symptom = String(args.symptom || "").trim()
      const specialtyHint = String(args.specialty_hint || "").trim()
      const mode = args.mode === "opd" ? "opd" : "tele"
      const rows = await fetchDoctorDirectory({ limit: 12, offset: 0 }).catch(() => [])
      const pickedDoctor = specialtyHint
        ? rows.find((row) =>
            (row.doctor_specializations ?? []).some((item) =>
              item.specialization_name?.toLowerCase().includes(specialtyHint.toLowerCase()),
            ),
          ) ?? rows[0]
        : rows[0]
      navigate("/teleconsultation", {
        state: {
          fromAiAnalyser: true,
          preselectedSpecialty: specialtyHint || undefined,
          analysisQuery: symptom || undefined,
          recommendedMode: mode,
          selectedDoctorId: pickedDoctor?.user_id,
        },
      })
      return {
        success: true,
        route: "/teleconsultation",
        doctor_name: pickedDoctor?.full_name ?? pickedDoctor?.full_display_name ?? null,
      }
    }

    if (name === "book_teleconsultation_now") {
      const doctorId = String(args.doctor_id || "").trim() || undefined
      const mode = args.mode === "opd" ? "opd" : "tele"
      enqueueVoiceAutomation({ type: "teleconsult-book", payload: { doctorId, mode } })
      if (!location.pathname.startsWith("/teleconsultation")) {
        navigate("/teleconsultation", {
          state: {
            recommendedMode: mode,
            selectedDoctorId: doctorId,
          },
        })
      }
      return { success: true, mode }
    }

    return { error: `Unknown tool: ${name}` }
  }

  async function endVoiceCall() {
    stopVoicePlayback()
    if (processorRef.current) {
      try {
        processorRef.current.disconnect()
      } catch {
        // ignore
      }
      processorRef.current = null
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect()
      } catch {
        // ignore
      }
      sourceNodeRef.current = null
    }
    if (monitorGainRef.current) {
      try {
        monitorGainRef.current.disconnect()
      } catch {
        // ignore
      }
      monitorGainRef.current = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop())
      micStreamRef.current = null
    }
    if (voiceSocketRef.current) {
      try {
        voiceSocketRef.current.close()
      } catch {
        // ignore
      }
      voiceSocketRef.current = null
    }
    if (audioCtxRef.current) {
      try {
        await audioCtxRef.current.close()
      } catch {
        // ignore
      }
      audioCtxRef.current = null
    }
    await stopNativeBackgroundMode()
    setStatus("idle")
    setOpen(false)
    setError("")
    voiceResponseInFlightRef.current = false
  }

  async function startVoiceCall(incomingDoctor?: Partial<VoiceDoctor>) {
    if (status === "connecting" || status === "live") return
    const resolvedDoctor = { ...doctor, ...incomingDoctor }
    const resolvedProfile = getVoiceProfile(resolvedDoctor.name)
    setDoctor(resolvedDoctor)
    setOpen(true)
    setStatus("connecting")
    setError("")
    try {
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      if (audioCtx.state !== "running") {
        await audioCtx.resume().catch(() => undefined)
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream
      const source = audioCtx.createMediaStreamSource(stream)
      sourceNodeRef.current = source
      const processor = audioCtx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor
      const monitorGain = audioCtx.createGain()
      monitorGain.gain.value = 0
      monitorGainRef.current = monitorGain
      processor.onaudioprocess = (event) => {
        const ws = voiceSocketRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        const ch = event.inputBuffer.getChannelData(0)
        const sampled = downsampleTo24k(ch, audioCtx.sampleRate)
        const payload = pcm16ToBase64(sampled)
        ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: payload }))
      }
      source.connect(processor)
      processor.connect(monitorGain)
      monitorGain.connect(audioCtx.destination)

      const secret = await createVoiceClientSecret()
      const ws = new WebSocket("wss://api.x.ai/v1/realtime?model=grok-voice-latest", [`xai-client-secret.${secret.value}`])
      voiceSocketRef.current = ws

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              voice: resolvedProfile.voice,
              instructions: buildDoctorVoiceInstructions(resolvedDoctor.name),
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                silence_duration_ms: 900,
                prefix_padding_ms: 300,
              },
              tools: [
                {
                  type: "function",
                  name: "find_doctor",
                  description: "Find matching doctors when a human consultation is needed.",
                  parameters: {
                    type: "object",
                    properties: {
                      symptom: { type: "string" },
                      specialty_hint: { type: "string" },
                      language: { type: "string" },
                      city: { type: "string" },
                      earliest_slot: { type: "string" },
                    },
                    required: ["symptom", "specialty_hint", "language", "city", "earliest_slot"],
                  },
                },
                {
                  type: "function",
                  name: "show_medicine",
                  description: "Open the pharmacy screen and search for a medicine the user asked about.",
                  parameters: {
                    type: "object",
                    properties: {
                      medicine_query: { type: "string" },
                    },
                    required: ["medicine_query"],
                  },
                },
                {
                  type: "function",
                  name: "add_medicine_to_cart",
                  description: "Add a medicine to cart and open the cart.",
                  parameters: {
                    type: "object",
                    properties: {
                      medicine_query: { type: "string" },
                      quantity: { type: "number" },
                    },
                    required: ["medicine_query"],
                  },
                },
                {
                  type: "function",
                  name: "start_pharmacy_checkout",
                  description: "Start pharmacy checkout, optionally after adding a requested medicine.",
                  parameters: {
                    type: "object",
                    properties: {
                      medicine_query: { type: "string" },
                      quantity: { type: "number" },
                    },
                  },
                },
                {
                  type: "function",
                  name: "set_delivery_address",
                  description: "Save the delivery address and select it for checkout.",
                  parameters: {
                    type: "object",
                    properties: {
                      address_type: { type: "string", enum: ["home", "office"] },
                      address: { type: "string" },
                    },
                    required: ["address_type", "address"],
                  },
                },
                {
                  type: "function",
                  name: "confirm_pharmacy_checkout",
                  description: "Move the pharmacy checkout flow to order confirmation and place the order.",
                  parameters: {
                    type: "object",
                    properties: {
                      payment_method: { type: "string", enum: ["CASHFREE", "COD"] },
                    },
                  },
                },
                {
                  type: "function",
                  name: "open_lab_flow",
                  description: "Open the lab tests screen and search for a test.",
                  parameters: {
                    type: "object",
                    properties: {
                      test_query: { type: "string" },
                    },
                    required: ["test_query"],
                  },
                },
                {
                  type: "function",
                  name: "select_lab_test",
                  description: "Choose a matching lab test and open the readiness flow.",
                  parameters: {
                    type: "object",
                    properties: {
                      test_name: { type: "string" },
                    },
                    required: ["test_name"],
                  },
                },
                {
                  type: "function",
                  name: "answer_lab_readiness",
                  description: "Answer the current readiness question with yes or no.",
                  parameters: {
                    type: "object",
                    properties: {
                      answer: { type: "string", enum: ["yes", "no"] },
                    },
                    required: ["answer"],
                  },
                },
                {
                  type: "function",
                  name: "open_teleconsultation_flow",
                  description: "Open doctor booking with symptom summary and a suitable specialty.",
                  parameters: {
                    type: "object",
                    properties: {
                      symptom: { type: "string" },
                      specialty_hint: { type: "string" },
                      mode: { type: "string", enum: ["tele", "opd"] },
                    },
                    required: ["symptom"],
                  },
                },
                {
                  type: "function",
                  name: "book_teleconsultation_now",
                  description: "Book the selected teleconsultation or OPD journey now.",
                  parameters: {
                    type: "object",
                    properties: {
                      doctor_id: { type: "string" },
                      mode: { type: "string", enum: ["tele", "opd"] },
                    },
                  },
                },
              ],
              input_audio_transcription: { model: "grok-2-audio" },
              audio: {
                input: { format: { type: "audio/pcm", rate: 24000 } },
                output: { format: { type: "audio/pcm", rate: 24000 } },
              },
            },
          }),
        )
        setStatus("live")
        void startNativeBackgroundMode(resolvedDoctor.name)
        ws.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: "Hello!" }],
            },
          }),
        )
        ws.send(JSON.stringify({ type: "response.create" }))
        voiceResponseInFlightRef.current = true
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data))
          if ((msg.type === "response.output_audio.delta" || msg.type === "response.audio.delta") && msg.delta) {
            playVoicePcmChunk(String(msg.delta))
          }
          if (msg.type === "input_audio_buffer.speech_started") {
            stopVoicePlayback()
            if (ws.readyState === WebSocket.OPEN && voiceResponseInFlightRef.current) {
              ws.send(JSON.stringify({ type: "response.cancel" }))
              voiceResponseInFlightRef.current = false
            }
          }
          if (msg.type === "input_audio_buffer.speech_stopped") {
            if (ws.readyState === WebSocket.OPEN && !voiceResponseInFlightRef.current) {
              ws.send(JSON.stringify({ type: "response.create" }))
              voiceResponseInFlightRef.current = true
            }
          }
          if (msg.type === "response.function_call_arguments.done") {
            void (async () => {
              const result = await handleVoiceToolCall(String(msg.name || ""), String(msg.arguments || "{}"))
              ws.send(
                JSON.stringify({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: msg.call_id,
                    output: JSON.stringify(result),
                  },
                }),
              )
              ws.send(JSON.stringify({ type: "response.create" }))
              voiceResponseInFlightRef.current = true
            })()
          }
          if (msg.type === "response.done") {
            voiceResponseInFlightRef.current = false
          }
          if (msg.type === "error") {
            setStatus("error")
            setError(String(msg.message || "Voice session error"))
            voiceResponseInFlightRef.current = false
          }
        } catch {
          // ignore malformed events
        }
      }

      ws.onerror = () => {
        setStatus("error")
        setError("Could not connect voice consultation")
        void stopNativeBackgroundMode()
      }
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Voice start failed")
      await stopNativeBackgroundMode()
    }
  }

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && audioCtxRef.current?.state === "suspended") {
        void audioCtxRef.current.resume().catch(() => undefined)
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [])

  useEffect(() => () => {
    void endVoiceCall()
  }, [])

  const value = useMemo<VoiceAgentContextValue>(
    () => ({
      open,
      status,
      error,
      doctor,
      startVoiceCall,
      endVoiceCall,
    }),
    [doctor, error, open, status],
  )

  return (
    <VoiceAgentContext.Provider value={value}>
      {children}
      {open && (
        <div className="voice-agent-overlay" role="dialog" aria-modal="true">
          <section className="voice-agent-card app-page-enter">
            <div className="voice-agent-head">
              <img src={doctor.avatar} alt={doctor.name} />
              <div className="voice-agent-copy">
                <h3>{doctor.name}</h3>
                <p>
                  {status === "connecting" && "Connecting your Astikan voice consultation..."}
                  {status === "live" && "Voice consultation is active"}
                  {status === "error" && (error || "Voice call failed")}
                </p>
              </div>
              <span className={`voice-agent-pulse ${status === "connecting" ? "connecting" : status === "error" ? "error" : ""}`} />
            </div>
            <div className="voice-agent-actions">
              <button className="voice-agent-end app-pressable" type="button" onClick={() => void endVoiceCall()}>
                End Call
              </button>
            </div>
          </section>
        </div>
      )}
    </VoiceAgentContext.Provider>
  )
}

export function useVoiceAgent() {
  const ctx = useContext(VoiceAgentContext)
  if (!ctx) {
    throw new Error("useVoiceAgent must be used within VoiceAgentProvider")
  }
  return ctx
}
