import { apiGet } from "./api"

export type EmployeeProfile = {
  user_id: string
  employee_code?: string | null
  department?: string | null
  designation?: string | null
  address_json?: Record<string, unknown> | null
  date_of_joining?: string | null
  status?: string | null
}

export async function fetchEmployeeProfile(userId: string) {
  return apiGet<EmployeeProfile | null>(`/users/profile/${encodeURIComponent(userId)}`)
}
