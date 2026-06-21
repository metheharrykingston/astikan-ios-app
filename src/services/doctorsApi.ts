import { apiGet, apiPost } from './api'

export type DirectoryDoctor = {
  user_id: string
  full_name?: string
  full_display_name?: string
  avatar_url?: string | null
  rating_avg?: number
  rating_count?: number
  consultation_fee_inr?: number
  practice_address?: string | null
  doctor_specializations?: Array<{ specialization_name?: string }>
  doctor_availability?: Array<DoctorAvailabilitySlot>
}

export type DoctorAvailabilitySlot = {
  availability_type: 'virtual' | 'physical'
  day_of_week: number
  start_time: string
  end_time: string
  slot_minutes?: number | null
  is_active?: boolean | null
}

export type DoctorProfile = DirectoryDoctor & {
  user_id: string
  email?: string | null
  mobile?: string | null
}

export async function fetchDoctors(query?: { search?: string; specialization?: string; verificationStatus?: string; limit?: number; offset?: number }) {
  const params = new URLSearchParams()
  if (query?.search) params.set('search', query.search)
  if (query?.specialization) params.set('specialization', query.specialization)
  if (query?.verificationStatus) params.set('verificationStatus', query.verificationStatus)
  if (query?.limit) params.set('limit', String(query.limit))
  if (query?.offset !== undefined) params.set('offset', String(query.offset))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiGet<DirectoryDoctor[]>(`/doctors${suffix}`)
}

export async function fetchDoctorProfile(userId: string) {
  return apiGet<DoctorProfile | null>(`/doctors/${userId}`)
}

export type NearbyDoctorPlace = {
  source: 'google_places'
  placeId: string
  name: string
  address: string
  location: { lat: number; lng: number }
  primaryType: string
  types: string[]
  rating: number | null
  bookableByAstikan: boolean
  disclaimer?: string
}

export type NearbyDoctorSearchResponse = {
  query: { lat: number; lng: number; radius: number; limit: number; includedTypes: string[] }
  doctors: NearbyDoctorPlace[]
  note?: string
}

export type NearbyDoctorBookingPayload = {
  consultationType: 'clinic' | 'video'
  doctor: NearbyDoctorPlace
  reason?: string
  preferredDate?: string
  preferredTimeSlot?: string
  patient?: { name?: string; age?: string; gender?: string }
  uploadedFiles?: Array<{ name: string; type: string; size: number }>
}

export type NearbyDoctorBookingResult = {
  requestId: string
  status: string
  consultationType: 'clinic' | 'video'
  message: string
}

export async function fetchNearbyDoctors(query: { lat: number; lng: number; radius?: number; limit?: number }) {
  const params = new URLSearchParams()
  params.set('lat', String(query.lat))
  params.set('lng', String(query.lng))
  if (query.radius) params.set('radius', String(query.radius))
  if (query.limit) params.set('limit', String(query.limit))
  return apiGet<NearbyDoctorSearchResponse>(`/doctors/nearby?${params.toString()}`)
}

export async function createNearbyDoctorBookingRequest(payload: NearbyDoctorBookingPayload) {
  return apiPost<NearbyDoctorBookingResult, NearbyDoctorBookingPayload>('/doctors/nearby-booking-requests', payload)
}
