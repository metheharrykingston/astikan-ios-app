import { apiGet, apiPost } from './api'
import { getEmployeeAuthSession } from './authApi'

export type TeleconsultRtcPayload = {
  channelName: string
  provider: 'webrtc'
  iceServers: RTCIceServer[]
}

export type TeleconsultSessionCreateResponse = {
  sessionId: string
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  provider: 'webrtc'
  channelName: string
  rtc: TeleconsultRtcPayload
}

export type TeleconsultSessionJoinResponse = {
  sessionId: string
  sessionStatus: 'scheduled' | 'live' | 'completed' | 'cancelled'
  provider: 'webrtc'
  failoverCount: number
  channelName: string
  joinWindowStart?: string
  joinWindowEnd?: string
  rtc: TeleconsultRtcPayload
}

export type EmployeePrescription = {
  id: string
  appointmentId?: string | null
  teleconsultSessionId: string
  doctorId: string
  employeeId?: string | null
  notes: string
  conditionSummary?: string | null
  medicines: Array<{ name: string; dosage?: string; schedule?: string; duration?: string }>
  labTests: Array<{ name: string; instructions?: string; category?: string | null }>
  followUpDate?: string | null
  fileUrl?: string | null
  createdAt: string
}

export async function createTeleconsultSession(input: {
  companyId: string
  employeeId: string
  doctorId: string
  appointmentId?: string
  scheduledAt?: string
}) {
  return apiPost<TeleconsultSessionCreateResponse, typeof input>('/teleconsult/sessions', input)
}

export async function joinTeleconsultSession(
  sessionId: string,
  input: {
    participantType: 'employee' | 'doctor'
    participantId: string
    allowEarlyJoin?: boolean
  },
) {
  return apiPost<TeleconsultSessionJoinResponse, typeof input>(`/teleconsult/sessions/${encodeURIComponent(sessionId)}/join`, input)
}

export async function fetchEmployeePrescriptions(limit = 20) {
  const auth = getEmployeeAuthSession()
  if (!auth?.userId) throw new Error('Missing employee session')
  return apiGet<EmployeePrescription[]>(`/teleconsult/prescriptions?employeeId=${encodeURIComponent(auth.userId)}&limit=${limit}`)
}
