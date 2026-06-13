import Clarity from "@microsoft/clarity"

let initialized = false

export function initClarity() {
  if (initialized || typeof window === "undefined") return
  const projectId = String(import.meta.env.VITE_CLARITY_PROJECT_ID ?? "").trim()
  if (!projectId) return

  Clarity.init(projectId)
  initialized = true
}
