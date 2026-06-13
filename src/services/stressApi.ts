import { getEmployeeAuthSession, getEmployeeCompanySession } from "./authApi"
import { apiPost } from "./api"

export type StressActivityType = "breathing" | "meditation" | "sleep" | "mood-reset"

export type StressEntry = {
  id: string
  activityType: StressActivityType
  durationMinutes: number
  moodScore: number | null
  notes: string
  meta: Record<string, unknown>
  eventAt: string
}

export type StressSummary = {
  totalSessions: number
  totalMinutes: number
  averageMood: number | null
  calmScore: number | null
  lastEventAt: string | null
}

function getStressIdentity() {
  const company = getEmployeeCompanySession()
  const auth = getEmployeeAuthSession()
  if (!company?.companyId || !auth?.userId) {
    throw new Error("User session not found.")
  }
  return { companyId: company.companyId, employeeId: auth.userId }
}

export async function getStressHistory(activityType?: StressActivityType, limit = 20) {
  const identity = getStressIdentity()
  return apiPost<{ entries: StressEntry[]; summary: StressSummary }, { companyId: string; employeeId: string; activityType?: StressActivityType; limit?: number }>(
    "/health/stress/history",
    { ...identity, activityType, limit },
  )
}

export async function saveStressEntry(payload: {
  activityType: StressActivityType
  durationMinutes: number
  moodScore?: number | null
  notes?: string
  meta?: Record<string, unknown>
}) {
  const identity = getStressIdentity()
  return apiPost<{ entry: StressEntry }, { companyId: string; employeeId: string; activityType: StressActivityType; durationMinutes: number; moodScore?: number | null; notes?: string; meta?: Record<string, unknown> }>(
    "/health/stress/log",
    {
      ...identity,
      activityType: payload.activityType,
      durationMinutes: payload.durationMinutes,
      moodScore: payload.moodScore ?? null,
      notes: payload.notes ?? "",
      meta: payload.meta ?? {},
    },
  )
}
