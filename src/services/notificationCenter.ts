import { apiGet, apiPost } from "./api"
import { getEmployeeAuthSession } from "./authApi"
import notificationSound from "../assets/audio/Notification.mp3"

export type AppNotification = {
  id: string
  title: string
  body: string
  channel: "delivery" | "consult" | "health" | "system"
  time: string
  group: string
  unread: boolean
  cta?: { label: string; route: string } | null
  teleconsultSessionId?: string | null
  doctorId?: string | null
  scheduledAt?: string | null
  joinWindowStart?: string | null
}

const STORAGE_KEY = "employee_notifications"

export const seedNotifications: AppNotification[] = [
  {
    id: "lab-001",
    title: "Lab report ready",
    body: "Your recent HbA1c report is now available.",
    channel: "health",
    time: "Just now",
    group: "Today",
    unread: true,
  },
  {
    id: "ride-021",
    title: "Ride assigned",
    body: "Your OPD pickup is on the way.",
    channel: "consult",
    time: "12 mins ago",
    group: "Today",
    unread: true,
  },
  {
    id: "system-110",
    title: "Weekly summary",
    body: "You earned 250 coins this week. Keep it up.",
    channel: "system",
    time: "Yesterday",
    group: "Earlier",
    unread: false,
  },
]

function normalizeItem(item: any): AppNotification {
  return {
    id: item.id || item._id,
    title: item.title,
    body: item.body,
    channel: item.channel ?? "system",
    time: item.time ?? new Date(item.createdAt ?? Date.now()).toLocaleString(),
    group: item.group ?? "Today",
    unread: Boolean(item.unread),
    cta: item.cta ? { label: item.cta.label || (String(item.cta.route || "").startsWith("http") ? "Download PDF" : "Open"), route: item.cta.route } : null,
    teleconsultSessionId: item.teleconsultSessionId ?? item.meta?.teleconsultSessionId ?? null,
    doctorId: item.doctorId ?? item.meta?.doctorId ?? null,
    scheduledAt: item.scheduledAt ?? item.meta?.scheduledAt ?? null,
    joinWindowStart: item.joinWindowStart ?? item.meta?.joinWindowStart ?? null,
  }
}

export async function fetchNotifications() {
  const auth = getEmployeeAuthSession()
  if (!auth?.userId) throw new Error("Missing employee session")
  const params = new URLSearchParams({ employeeId: auth.userId })
  const data = await apiGet<any[]>(`/notifications?${params.toString()}`)
  return data.map(normalizeItem)
}

export async function fetchUnreadCount() {
  const auth = getEmployeeAuthSession()
  if (!auth?.userId) throw new Error("Missing employee session")
  const params = new URLSearchParams({ employeeId: auth.userId })
  const data = await apiGet<{ count: number }>(`/notifications/unread-count?${params.toString()}`)
  return data.count
}

export async function markNotificationsRead(ids?: string[]) {
  const auth = getEmployeeAuthSession()
  if (!auth?.userId) throw new Error("Missing employee session")
  await apiPost<{ updated: boolean }, { employeeId: string; ids?: string[] }>("/notifications/mark-read", {
    employeeId: auth.userId,
    ids,
  })
}

export async function addNotification(input: Omit<AppNotification, "id" | "time" | "group" | "unread">) {
  const auth = getEmployeeAuthSession()
  if (!auth?.userId) throw new Error("Missing employee session")
  const payload = {
    employeeId: auth.userId,
    title: input.title,
    body: input.body,
    channel: input.channel,
    cta: input.cta ?? null,
  }
  const item = await apiPost<any, typeof payload>("/notifications", payload)
  const normalized = normalizeItem(item)
  window.dispatchEvent(new CustomEvent("app-notification", { detail: normalized }))
  void pushBrowserNotification(normalized.title, normalized.body)
  playNotificationSound()
  return normalized
}


export function playNotificationSound() {
  if (typeof window === "undefined") return
  try {
    const audio = new Audio(notificationSound)
    audio.volume = 0.9
    void audio.play()
  } catch {
    // ignore audio errors
  }
}

export async function pushBrowserNotification(title: string, body: string) {
  if (!("Notification" in window)) return false
  let permission = Notification.permission
  if (permission === "default") {
    permission = await Notification.requestPermission()
  }
  if (permission !== "granted") return false

  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.getRegistration()
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: "/logo.png",
        badge: "/logo.png",
      })
      return true
    }
  }

  new Notification(title, { body })
  return true
}

export function getStoredNotifications(): AppNotification[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as AppNotification[]
    return parsed
  } catch {
    return []
  }
}

export function setStoredNotifications(items: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function getNotificationsWithSeed(): AppNotification[] {
  const stored = getStoredNotifications()
  return stored.length ? stored : seedNotifications
}
