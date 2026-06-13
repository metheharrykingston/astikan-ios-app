import { apiGet, apiPost } from './api'

export type TeleconsultOfferStatus = {
  enrolled: boolean
  active: boolean
  activeFrom?: string | null
  activeUntil?: string | null
  dailyLimit: number
  usedToday?: number
  remainingToday: number
  coveredCategory: string
}

export type TeleconsultOfferAnswers = {
  conditions?: string[]
  takingMedicine?: string
  surgeryHistory?: string
  allergies?: string[]
  habits?: string[]
}

export async function getTeleconsultOfferStatus() {
  return apiGet<TeleconsultOfferStatus>('/teleconsult/offer/status')
}

export async function unlockTeleconsultOffer(answers: TeleconsultOfferAnswers) {
  return apiPost<TeleconsultOfferStatus, { answers: TeleconsultOfferAnswers }>('/teleconsult/offer/unlock', { answers })
}
