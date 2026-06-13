import { apiGet, apiPost } from './api'

export async function createAppointment(input: {
  companyId: string
  employeeId: string
  doctorId: string
  createdByUserId: string
  appointmentType: 'teleconsult' | 'opd'
  source?: 'employee_booked' | 'astikan_assigned' | 'doctor_added_patient' | 'freelance_case' | 'admin_created'
  scheduledStart: string
  scheduledEnd: string
  status?: 'scheduled' | 'confirmed' | 'underway' | 'completed' | 'rescheduled' | 'cancelled' | 'no_show'
  reason?: string
  patientSummary?: string
  symptomSnapshot?: Record<string, unknown>
  aiTriageSummary?: string
  meetingJoinWindowStart?: string
  meetingJoinWindowEnd?: string
}) {
  return apiPost<{ appointmentId: string }, typeof input>('/appointments', input)
}

export type EmployeeAppointment = {
  id: string
  appointment_type: 'teleconsult' | 'opd'
  status: 'scheduled' | 'confirmed' | 'underway' | 'completed' | 'rescheduled' | 'cancelled' | 'no_show'
  scheduled_start: string
  scheduled_end: string
  doctor_name?: string | null
  teleconsult_sessions?: Array<{
    id: string
    status?: string | null
    scheduled_at?: string | null
  }>
  opd_visits?: {
    patient_eta_minutes?: number | null
    clinic_location?: string | null
    status?: string | null
  } | null
}

export async function listEmployeeAppointments(input: {
  employeeId: string
  companyId?: string | null
  limit?: number
}) {
  const params = new URLSearchParams({
    employeeId: input.employeeId,
    limit: String(input.limit ?? 6),
  })
  if (input.companyId) {
    params.set('companyId', input.companyId)
  }
  return apiGet<EmployeeAppointment[]>(`/appointments?${params.toString()}`)
}
