import { apiGet, apiPost, getAuthToken } from './api'

export type LabCatalogTest = {
  id: string
  code: string
  name: string
  reportingTime: string
  price: number | null
  category: string
}

type LabCatalogResponse = {
  keyword: string
  total: number
  categories: Array<{ name: string; count: number }>
  tests: LabCatalogTest[]
}

export function getCachedLabCatalog(keyword = '', limit = 10, offset = 0): LabCatalogResponse | null {
  void keyword
  void limit
  void offset
  return null
}

export async function getLabCatalog(keyword = '', limit = 10, offset = 0, _signal?: AbortSignal) {
  return apiGet<LabCatalogResponse>(`/lab/catalog?keyword=${encodeURIComponent(keyword)}&limit=${limit}&offset=${offset}`)
}

export async function preloadLabCatalog(keyword = '', limit = 10, offset = 0) {
  return getLabCatalog(keyword, limit, offset)
}

export async function warmLabCatalogSearchIndex() {
  if (!getAuthToken()) return
  await Promise.allSettled([
    preloadLabCatalog('', 10, 0),
    preloadLabCatalog('cbc', 10, 0),
    preloadLabCatalog('thyroid', 10, 0),
    preloadLabCatalog('glucose', 10, 0),
  ])
}

export function buildStaticReadinessQuestions(testName = 'this test', fastingInfo = '') {
  const lower = `${testName} ${fastingInfo}`.toLowerCase()
  const fastingQuestion = lower.includes('fast') || lower.includes('empty stomach') || lower.includes('glucose') || lower.includes('lipid')
    ? 'Have you completed the required fasting or empty-stomach preparation for this test?'
    : 'Have you followed the preparation guidance shared for this test?'

  return [
    {
      id: 'prep',
      question: fastingQuestion,
      options: [
        { value: 'yes' as const, label: 'Yes, I followed it' },
        { value: 'no' as const, label: 'No, not yet' },
      ],
    },
    {
      id: 'medicine',
      question: 'Have you taken any medicine, supplement, or insulin today that the lab should know about?',
      options: [
        { value: 'yes' as const, label: 'Yes, I took something' },
        { value: 'no' as const, label: 'No, nothing today' },
      ],
    },
    {
      id: 'symptoms',
      question: 'Do you currently have fever, dizziness, heavy weakness, or any emergency symptom?',
      options: [
        { value: 'yes' as const, label: 'Yes, I need support' },
        { value: 'no' as const, label: 'No, I am comfortable' },
      ],
    },
    {
      id: 'ready',
      question: 'Are you ready to continue with location and sample collection scheduling?',
      options: [
        { value: 'yes' as const, label: 'Yes, continue' },
        { value: 'no' as const, label: 'No, I will come back later' },
      ],
    },
  ]
}

export async function bookLabOrder(input: Record<string, unknown>) {
  return apiPost<Record<string, unknown>, Record<string, unknown>>('/lab/book-order', input)
}

export async function rescheduleLabOrder(reference: string, newDateEpochMs: number, oldDateEpochMs: number) {
  return apiPost<{ status: string; data: Record<string, unknown> }, { reference: string; new_date: number; old_date: number }>(
    '/lab/reschedule-order',
    {
      reference,
      new_date: newDateEpochMs,
      old_date: oldDateEpochMs,
    }
  )
}


export async function requestLabOrderCancellation(reference: string, reason: string) {
  return apiPost<Record<string, unknown>, { reference: string; closedReason: string }>(
    '/lab/cancel-order',
    { reference, closedReason: reason }
  )
}

export type LabOrder = {
  id: string
  providerOrderReference: string | null
  status: string
  slotAt: string | null
  createdAt: string
  testName: string
  reportKey: string | null
}

function mapLabOrder(item: any): LabOrder {
  return {
    id: String(item.id ?? ""),
    providerOrderReference: item.provider_order_reference ?? item.providerOrderReference ?? null,
    status: String(item.status ?? "created"),
    slotAt: item.slot_at ?? item.slotAt ?? null,
    createdAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
    reportKey: item.report_storage_key ?? item.reportKey ?? null,
    testName: item.lab_test_catalog?.name ?? item.testName ?? item.test_name ?? "Lab Test",
  }
}

export async function getLabOrders(employeeId: string) {
  const data = await apiGet<any>(`/lab/orders?employeeId=${encodeURIComponent(employeeId)}`)
  const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
  return rows.map(mapLabOrder) as LabOrder[]
}

export async function getLabOrderById(orderId: string) {
  const data = await apiGet<any>(`/lab/orders/${orderId}`)
  const item = data?.data ?? data
  if (!item) return null
  return mapLabOrder(item)
}

export async function getLabReportLink(orderId: string, employeeId: string) {
  const data = await apiGet<{ status: string; data: { url: string } }>(
    `/lab/orders/${orderId}/report-link?employeeId=${encodeURIComponent(employeeId)}`
  )
  return data?.data?.url ?? null
}

export function buildReportDownloadName(testName: string, createdAt: string) {
  const date = new Date(createdAt)
  const formatted = date.toLocaleDateString("en-CA")
  const safeName = testName.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "")
  return `${safeName || "lab-report"}-${formatted}.pdf`
}

export function subscribeLabOrderUpdates(
  employeeId: string,
  onUpdate: (updates: Array<{ id: string; status: string; testName: string; reportReady: boolean }>) => void
) {
  const source = new EventSource(`/api/lab/orders/stream?employeeId=${encodeURIComponent(employeeId)}`)
  const handler = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as Array<{ id: string; status: string; testName: string; reportReady: boolean }>
      onUpdate(data)
    } catch {
      // ignore
    }
  }
  source.addEventListener("lab-order-update", handler)
  source.addEventListener("error", () => {
    // keep open, browser will retry
  })

  return () => {
    source.removeEventListener("lab-order-update", handler)
    source.close()
  }
}
