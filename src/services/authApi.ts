import { apiGet, apiPost } from "./api"

export type UserCompanyAuth = {
  companyId: string
  companyCode: string
  companyName: string
  companySlug?: string | null
  hrPhone?: string | null
}

export type UserLoginResponse = {
  userId: string
  role: string
  token?: string
  accessToken?: string
  expiresAt?: string
  fullName?: string | null
  email?: string | null
  phone?: string | null
  avatarUrl?: string | null
  companyId?: string | null
  companyName?: string | null
  companySlug?: string | null
}

const USER_AUTH_KEY = "astikan_user_auth"
const USER_COMPANY_KEY = "astikan_user_company"

function readStoredJson<T>(key: string): T | null {
  const localRaw = localStorage.getItem(key)
  const sessionRaw = sessionStorage.getItem(key)
  const raw = localRaw || sessionRaw
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as T
    if (!localRaw && sessionRaw) localStorage.setItem(key, sessionRaw)
    return parsed
  } catch {
    return null
  }
}

export function saveEmployeeCompanySession(payload: EmployeeCompanyAuth) {
  const raw = JSON.stringify(payload)
  localStorage.setItem(USER_COMPANY_KEY, raw)
  sessionStorage.setItem(USER_COMPANY_KEY, raw)
}

export function getEmployeeCompanySession(): EmployeeCompanyAuth | null {
  return readStoredJson<EmployeeCompanyAuth>(USER_COMPANY_KEY)
}

export function saveEmployeeAuthSession(payload: EmployeeLoginResponse) {
  const raw = JSON.stringify(payload)
  localStorage.setItem(USER_AUTH_KEY, raw)
  sessionStorage.setItem(USER_AUTH_KEY, raw)
  window.dispatchEvent(new Event("astikan-session-updated"))
}

export function getEmployeeAuthSession(): EmployeeLoginResponse | null {
  return readStoredJson<EmployeeLoginResponse>(USER_AUTH_KEY)
}

export function clearEmployeeAuthSession() {
  sessionStorage.removeItem(USER_AUTH_KEY)
  localStorage.removeItem(USER_AUTH_KEY)
}

export function clearEmployeeCompanySession() {
  sessionStorage.removeItem(USER_COMPANY_KEY)
  localStorage.removeItem(USER_COMPANY_KEY)
}

export function authorizeEmployeeCompany(companyCode: string) {
  void companyCode
  throw new Error("Company authorization is no longer used for user login.")
}

export function loginWithGoogle(credential: string) {
  return apiPost<EmployeeLoginResponse, { credential: string }>("/auth/user/google", { credential })
}

export function requestPhoneOtp(phone: string) {
  return apiPost<{ phone: string; deliveryStatus: string; message: string }, { phone: string }>("/auth/user/phone/request-otp", { phone })
}

export function verifyPhoneOtp(phone: string, otp: string) {
  return apiPost<EmployeeLoginResponse, { phone: string; otp: string }>("/auth/user/phone/verify", { phone, otp })
}

export function loginWithFirebasePhone(idToken: string) {
  return apiPost<EmployeeLoginResponse, { idToken: string }>("/auth/user/firebase-phone", { idToken })
}

export function loginWithFirebaseGoogle(idToken: string) {
  return apiPost<EmployeeLoginResponse, { idToken: string }>("/auth/user/firebase-google", { idToken })
}

export function fetchAuthConfig() {
  return apiGet<{ googleClientId: string; phoneOtpEnabled: boolean }>("/auth/config")
}

export type EmployeeCompanyAuth = UserCompanyAuth
export type EmployeeLoginResponse = UserLoginResponse
