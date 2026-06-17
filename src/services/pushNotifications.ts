import { apiPost } from "./api"
import { Capacitor } from "@capacitor/core"

type PushRegistrationResult = {
  registered: boolean
  message?: string
}

declare global {
  interface Window {
    firebase?: any
  }
}

let initializedForegroundListener = false
let initializedNativeListeners = false
let registerInFlight: Promise<PushRegistrationResult> | null = null
let firebaseScriptsLoading: Promise<void> | null = null

function readEnv(key: string) {
  const value = String((import.meta.env as Record<string, string | undefined>)[key] ?? "").trim()
  if (!value || value === "undefined" || value === "null" || value.startsWith("REPLACE_")) return ""
  return value
}

function getFirebaseConfig() {
  const config = {
    apiKey: readEnv("VITE_FIREBASE_API_KEY"),
    authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: readEnv("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: readEnv("VITE_FIREBASE_APP_ID"),
  }
  if (!config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId) return null
  return config
}

function getAuthToken() {
  const sessionKeys = [
    "astikan_user_auth",
    "astikan_doctor_session",
    "astikan_superadmin_session",
    "astikan_hospital_session",
  ]
  for (const key of sessionKeys) {
    try {
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as { token?: string; accessToken?: string }
      const token = parsed.token || parsed.accessToken || ""
      if (token) return token
    } catch {
      // ignore malformed sessions
    }
  }
  return ""
}

function getDeviceId() {
  const existing = localStorage.getItem("astikan_device_id")
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem("astikan_device_id", id)
  return id
}

async function savePushToken(input: { token: string; appName: string; platform: string }) {
  await apiPost<PushRegistrationResult, { token: string; appName: string; platform: string; deviceId: string }>("/notifications/push/register", {
    token: input.token,
    appName: input.appName,
    platform: input.platform,
    deviceId: getDeviceId(),
  })
}

function dispatchForegroundNotification(payload: any) {
  const title = payload.notification?.title || payload.data?.title || "Astikan Healthcare"
  const body = payload.notification?.body || payload.data?.body || "You have a new Astikan update."
  window.dispatchEvent(new CustomEvent("app-notification", {
    detail: {
      id: payload.messageId || payload.id || crypto.randomUUID(),
      title,
      body,
      channel: payload.data?.channel || "system",
      time: "Just now",
      group: "Today",
      unread: true,
      cta: payload.data?.click_action ? { label: "Open", route: payload.data.click_action } : null,
    },
  }))
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) return resolve()
    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

async function loadFirebaseCompat() {
  if (window.firebase?.messaging) return
  if (!firebaseScriptsLoading) {
    firebaseScriptsLoading = Promise.resolve()
      .then(() => loadScript("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"))
      .then(() => loadScript("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"))
  }
  await firebaseScriptsLoading
}

async function getMessagingInstance() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) return null
  const config = getFirebaseConfig()
  if (!config) return null
  await loadFirebaseCompat()
  if (!window.firebase?.apps?.length) window.firebase.initializeApp(config)
  if (!window.firebase?.messaging?.isSupported?.()) return null
  return window.firebase.messaging()
}

function ensureForegroundListener(messaging: any) {
  if (initializedForegroundListener) return
  initializedForegroundListener = true
  messaging.onMessage((payload: any) => dispatchForegroundNotification(payload))
}

function shouldAskPermission() {
  const askedAt = Number(localStorage.getItem("astikan_push_permission_asked_at") || 0)
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  return !askedAt || Date.now() - askedAt > sevenDays
}

async function registerNativePush(appName: string): Promise<PushRegistrationResult> {
  const { PushNotifications } = await import("@capacitor/push-notifications")

  const current = await PushNotifications.checkPermissions()
  let receive = current.receive
  if (receive !== "granted") {
    const requested = await PushNotifications.requestPermissions()
    receive = requested.receive
  }
  if (receive !== "granted") return { registered: false, message: "Native push permission not granted." }

  if (!initializedNativeListeners) {
    initializedNativeListeners = true
    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      dispatchForegroundNotification({
        id: notification.id,
        notification: { title: notification.title, body: notification.body },
        data: notification.data,
      })
    })
    await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
      const data = event.notification.data || {}
      const route = data.click_action || data.link || data.url
      if (route && typeof route === "string") {
        window.location.assign(route.startsWith("http") ? route : route.startsWith("/") ? route : `/${route}`)
      }
    })
  }

  const token = await new Promise<string>((resolve, reject) => {
    let done = false
    let cleanup: Array<() => void> = []
    const finish = (callback: () => void) => {
      if (done) return
      done = true
      cleanup.forEach((fn) => fn())
      cleanup = []
      callback()
    }

    Promise.all([
      PushNotifications.addListener("registration", (registrationToken) => {
        finish(() => resolve(registrationToken.value))
      }),
      PushNotifications.addListener("registrationError", (error) => {
        finish(() => reject(new Error(error.error || "Native push registration failed.")))
      }),
    ]).then((handles) => {
      cleanup = handles.map((handle) => () => void handle.remove())
      void PushNotifications.register()
      window.setTimeout(() => finish(() => reject(new Error("Native push registration timed out."))), 15000)
    }).catch((error) => finish(() => reject(error)))
  })

  if (!token) return { registered: false, message: "Native Firebase did not return a push token." }
  await savePushToken({ token, appName, platform: `${Capacitor.getPlatform()}-native` })
  return { registered: true }
}

async function registerWebPush(appName: string): Promise<PushRegistrationResult> {
  const messaging = await getMessagingInstance()
  if (!messaging) return { registered: false, message: "Firebase Web Push is not configured or supported." }
  ensureForegroundListener(messaging)

  let permission = Notification.permission
  if (permission === "default" && shouldAskPermission()) {
    localStorage.setItem("astikan_push_permission_asked_at", String(Date.now()))
    permission = await Notification.requestPermission()
  }
  if (permission !== "granted") return { registered: false, message: "Push permission not granted." }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
  const vapidKey = readEnv("VITE_FIREBASE_VAPID_KEY")
  if (!vapidKey) return { registered: false, message: "VITE_FIREBASE_VAPID_KEY missing." }

  const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: registration })
  if (!token) return { registered: false, message: "Firebase did not return a push token." }

  await savePushToken({
    token,
    appName,
    platform: /Android/i.test(navigator.userAgent) ? "android-web" : /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "ios-web" : "desktop-web",
  })
  return { registered: true }
}

export async function registerAstikanPush(appName: string): Promise<PushRegistrationResult> {
  if (registerInFlight) return registerInFlight
  registerInFlight = (async () => {
    try {
      if (!getAuthToken()) return { registered: false, message: "Login session missing." }
      if (Capacitor.isNativePlatform()) return registerNativePush(appName)
      return registerWebPush(appName)
    } catch (error) {
      return { registered: false, message: error instanceof Error ? error.message : "Push registration failed." }
    } finally {
      registerInFlight = null
    }
  })()
  return registerInFlight
}

export function bindPushRegistrationToAuth(appName: string) {
  const run = () => {
    void registerAstikanPush(appName)
  }
  run()
  window.addEventListener("astikan-session-updated", run)
  return () => window.removeEventListener("astikan-session-updated", run)
}
