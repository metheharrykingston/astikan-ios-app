import { apiGet, apiPost } from './api'

export type HospitalSlotBookingInput = {
  hospitalId: string
  hospitalName: string
  location: string
  date: string
  day: string
  time: string
  slotType: string
  patient: {
    fullName: string
    mobileNumber: string
    age: string
    gender: string
  }
  amount?: number
}

export type HospitalSlotBooking = HospitalSlotBookingInput & {
  id: string
  bookingId: string
  status: string
  createdAt: string
}

export type FinanceDocument = {
  label: string
  fileName: string
  status: 'Uploaded' | 'Missing'
  sizeBytes?: number
  mimeType?: string
  required?: boolean
}

export type FinanceApplicationInput = {
  requiredLoanAmount: string
  loanAmount?: string
  tenure: string
  fullName: string
  mobileNumber: string
  email: string
  panNumber: string
  dateOfBirth: string
  documents: FinanceDocument[]
  consentToShareWithPartners: boolean
  acceptedTerms: boolean
}

export type FinanceApplication = FinanceApplicationInput & {
  id: string
  referenceId: string
  status: string
  createdAt: string
  forwardedToPartner?: boolean
  financeProviderRole?: string
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeLocal<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage failures
  }
}

const HOSPITAL_BOOKINGS_KEY = 'astikan_hospital_bookings'
const FINANCE_APPLICATIONS_KEY = 'astikan_finance_applications'

export async function createHospitalBooking(input: HospitalSlotBookingInput): Promise<HospitalSlotBooking> {
  const booking = await apiPost<HospitalSlotBooking, HospitalSlotBookingInput>('/consumer/hospital-bookings', input)
  saveLatestHospitalBooking(booking)
  return booking
}

export async function createFinanceApplication(input: FinanceApplicationInput): Promise<FinanceApplication> {
  const payload: FinanceApplicationInput = {
    ...input,
    requiredLoanAmount: input.requiredLoanAmount || input.loanAmount || '',
    loanAmount: input.loanAmount || input.requiredLoanAmount || '',
  }
  const application = await apiPost<FinanceApplication, FinanceApplicationInput>('/consumer/finance-applications', payload)
  saveLatestFinanceApplication(application)
  return application
}

export function getLatestHospitalBooking() {
  return readLocal<HospitalSlotBooking[]>(HOSPITAL_BOOKINGS_KEY, [])[0] ?? null
}

export function saveLatestHospitalBooking(booking: HospitalSlotBooking) {
  const rows = readLocal<HospitalSlotBooking[]>(HOSPITAL_BOOKINGS_KEY, [])
  writeLocal(HOSPITAL_BOOKINGS_KEY, [booking, ...rows.filter((row) => row.id !== booking.id)])
}

export function getLatestFinanceApplication() {
  return readLocal<FinanceApplication[]>(FINANCE_APPLICATIONS_KEY, [])[0] ?? null
}

export function saveLatestFinanceApplication(application: FinanceApplication) {
  const rows = readLocal<FinanceApplication[]>(FINANCE_APPLICATIONS_KEY, [])
  writeLocal(FINANCE_APPLICATIONS_KEY, [application, ...rows.filter((row) => row.id !== application.id)])
}

export function fetchConsumerAdminOverview() {
  return apiGet<{ hospitalBookings: HospitalSlotBooking[]; financeApplications: FinanceApplication[] }>('/consumer/admin/overview')
}
