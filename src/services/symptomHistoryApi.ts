import { apiGet, apiPost } from "./api"
import { getEmployeeAuthSession, getEmployeeCompanySession } from "./authApi"

type SymptomHistoryRow = {
  label: string
  count: number
  updatedAt?: string | null
}

function getSessionRefs() {
  const auth = getEmployeeAuthSession()
  const company = getEmployeeCompanySession()
  if (!auth?.userId || !company?.companyId) throw new Error("Missing employee session")
  return { employeeId: auth.userId, companyId: company.companyId }
}

export async function fetchRecentSymptoms(limit = 8) {
  const { employeeId, companyId } = getSessionRefs()
  return apiGet<{ symptoms: SymptomHistoryRow[] }>(
    `/health/symptoms/recent?employeeId=${encodeURIComponent(employeeId)}&companyId=${encodeURIComponent(companyId)}&limit=${encodeURIComponent(String(limit))}`,
  )
}

export async function saveRecentSymptom(symptom: string) {
  const { employeeId, companyId } = getSessionRefs()
  return apiPost<{ stored: boolean; symptom: string }, { employeeId: string; companyId: string; symptom: string }>(
    "/health/symptoms/save",
    { employeeId, companyId, symptom },
  )
}
