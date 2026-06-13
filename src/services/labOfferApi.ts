import { apiGet, apiPost } from "./api"

export type LabOfferStatus = {
  enrolled: boolean
  completed: boolean
  eligible: boolean
  result?: "eligible" | "ineligible" | null
  updatedAt?: string | null
}

export type LabOfferAnswers = {
  activityLevel?: string
  sleepHours?: string
  stressLevel?: string
  lastCheckup?: string
  habits?: string
}

export async function getLabOfferStatus() {
  return apiGet<LabOfferStatus>("/health/lab-offer/status")
}

export async function submitLabOfferAnswers(answers: LabOfferAnswers) {
  return apiPost<LabOfferStatus, { answers: LabOfferAnswers }>("/health/lab-offer/enroll", { answers })
}
