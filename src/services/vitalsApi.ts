import { apiPost } from "./api"
import { getEmployeeAuthSession, getEmployeeCompanySession } from "./authApi"

type VitalPayload = {
  metric: "heart_rate" | "blood_pressure_sys" | "blood_pressure_dia" | "blood_sugar" | "calories"
  value: number
  unit: string
  source: "camera" | "device" | "manual"
  signalQuality?: number
}

export async function saveVitalReading(payload: VitalPayload) {
  const auth = getEmployeeAuthSession()
  const company = getEmployeeCompanySession()
  if (!auth?.userId || !company?.companyId) {
    throw new Error("Missing employee session")
  }

  const attempt = async () =>
    apiPost<
      { status: string },
      { companyId: string; employeeId: string } & VitalPayload
    >("/health/vitals", {
      companyId: company.companyId,
      employeeId: auth.userId,
      ...payload,
    })

  const retryDelays = [1200, 2000, 3000]
  let lastError: unknown
  for (let i = 0; i <= retryDelays.length; i += 1) {
    try {
      return await attempt()
    } catch (error) {
      lastError = error
      if (i < retryDelays.length) {
        await new Promise((resolve) => window.setTimeout(resolve, retryDelays[i]))
      }
    }
  }
  throw lastError
}

export async function getLatestVital(metric: VitalPayload["metric"]) {
  const auth = getEmployeeAuthSession()
  const company = getEmployeeCompanySession()
  if (!auth?.userId || !company?.companyId) {
    throw new Error("Missing employee session")
  }
  return apiPost<{ value?: number; unit?: string; eventAt?: string }, { companyId: string; employeeId: string; metric: string }>(
    "/health/vitals/latest",
    {
      companyId: company.companyId,
      employeeId: auth.userId,
      metric,
    },
  )
}

export async function getVitalHistory(metric: VitalPayload["metric"], limit = 30) {
  const auth = getEmployeeAuthSession()
  const company = getEmployeeCompanySession()
  if (!auth?.userId || !company?.companyId) {
    throw new Error("Missing employee session")
  }
  return apiPost<{ points: Array<{ value: number; eventAt: string }> }, { companyId: string; employeeId: string; metric: string; limit: number }>(
    "/health/vitals/history",
    {
      companyId: company.companyId,
      employeeId: auth.userId,
      metric,
      limit,
    },
  )
}
