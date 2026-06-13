import { apiGet, apiPost } from "./api"

export type TeleconsultPaidAccessStatus = {
  unlocked: boolean
  availablePasses: number
  consultationMinutes: number
}

export async function getTeleconsultPaidAccessStatus() {
  return apiGet<TeleconsultPaidAccessStatus>("/teleconsult/paid-access/status")
}

export async function consumeTeleconsultPaidAccess(input: {
  appointmentId: string
  doctorId?: string | null
  feelingId?: string | null
}) {
  return apiPost<
    { id: string; status: string; consultation_minutes: number },
    { appointmentId: string; doctorId?: string | null; feelingId?: string | null }
  >("/teleconsult/paid-access/consume", {
    appointmentId: input.appointmentId,
    doctorId: input.doctorId ?? null,
    feelingId: input.feelingId ?? null,
  })
}
