const VOICE_AUTOMATION_QUEUE_KEY = "employee_voice_automation_queue"
const VOICE_AUTOMATION_EVENT = "employee-voice-automation"

export type VoiceAutomationCommand =
  | { id: string; type: "pharmacy-checkout-address"; payload: { addressType: "home" | "office" } }
  | { id: string; type: "pharmacy-checkout-confirm"; payload: { paymentMethod?: "CASHFREE" | "COD" } }
  | { id: string; type: "teleconsult-book"; payload: { doctorId?: string; mode?: "tele" | "opd" } }
  | { id: string; type: "lab-readiness-answer"; payload: { answer: "yes" | "no" } }

function readQueue(): VoiceAutomationCommand[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(VOICE_AUTOMATION_QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as VoiceAutomationCommand[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(queue: VoiceAutomationCommand[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(VOICE_AUTOMATION_QUEUE_KEY, JSON.stringify(queue))
  window.dispatchEvent(new CustomEvent(VOICE_AUTOMATION_EVENT))
}

export function enqueueVoiceAutomation(command: Omit<VoiceAutomationCommand, "id">) {
  const next: VoiceAutomationCommand = {
    ...command,
    id: `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  } as VoiceAutomationCommand
  const queue = readQueue()
  queue.push(next)
  writeQueue(queue)
  return next.id
}

export function consumeVoiceAutomation<T extends VoiceAutomationCommand["type"]>(
  type: T,
): Extract<VoiceAutomationCommand, { type: T }> | null {
  const queue = readQueue()
  const index = queue.findIndex((item) => item.type === type)
  if (index < 0) return null
  const [match] = queue.splice(index, 1)
  writeQueue(queue)
  return match as Extract<VoiceAutomationCommand, { type: T }>
}

export function subscribeVoiceAutomation(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined
  }
  window.addEventListener(VOICE_AUTOMATION_EVENT, listener)
  return () => window.removeEventListener(VOICE_AUTOMATION_EVENT, listener)
}
