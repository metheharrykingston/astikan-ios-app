import { apiGet, apiPost, apiPut } from './api'

export type PharmacyProduct = {
  id: string
  sku?: string | null
  name: string
  category?: string | null
  description?: string | null
  base_price_inr: number
  mrp_inr?: number
  sp_inr?: number
  image_urls_json?: string[]
  available_qty?: number | null
  in_stock?: boolean
}

export type PharmacyCategory = {
  name: string
  count: number
}

export type PharmacyProductPage = {
  items: PharmacyProduct[]
  total: number
  limit: number
  offset: number
}

export type PharmacyOrderDetail = {
  id: string
  order_id: string
  status: string
  status_label: string
  subtotal_inr: number
  wallet_used_inr: number
  online_payment_inr: number
  delivery_charge_inr?: number
  payable_inr?: number
  expected_delivery?: string
  shipping_address_json?: Record<string, unknown>
  created_at?: string
  updated_at?: string
  items: Array<{
    qty: number
    unit_price_inr: number
    line_total_inr: number
    name: string
    sku?: string | null
  }>
}

export async function fetchPharmacyProducts(query?: { search?: string; category?: string; limit?: number; audience?: 'employee' | 'doctor' }) {
  const params = new URLSearchParams()
  if (query?.search) params.set('search', query.search)
  if (query?.category) params.set('category', query.category)
  if (query?.limit) params.set('limit', String(query.limit))
  if (query?.audience) params.set('audience', query.audience)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiGet<PharmacyProduct[]>(`/pharmacy/products${suffix}`)
}

export async function fetchPharmacyCategories(audience?: 'employee' | 'doctor') {
  const params = audience ? `?audience=${audience}` : ''
  return apiGet<PharmacyCategory[]>(`/pharmacy/categories${params}`)
}

export async function lookupPharmacyProducts(ids: string[], audience?: 'employee' | 'doctor') {
  return apiPost<PharmacyProduct[], { ids: string[]; audience?: 'employee' | 'doctor' }>('/pharmacy/products/lookup', { ids, audience })
}

export async function createPharmacyOrder(input: {
  companyReference?: string
  companyName?: string
  employee?: { email?: string; phone?: string; fullName?: string; handle?: string; employeeCode?: string }
  doctor?: { email?: string; phone?: string; fullName?: string; handle?: string }
  patientId?: string
  orderSource: 'doctor_store' | 'employee_store' | 'admin_panel'
  status?: string
  subtotalInr: number
  walletUsedInr?: number
  onlinePaymentInr?: number
  deliveryChargeInr?: number
  creditCost?: number
  shippingAddress?: Record<string, unknown>
  items: Array<{
    sku?: string
    productId?: string
    name: string
    category?: string
    description?: string
    price: number
    quantity: number
    imageUrls?: string[]
    isCustom?: boolean
    genericName?: string
    useCase?: string
    manufacturer?: string
    sourceUrl?: string
  }>
}) {
  return apiPost<{ orderId: string; localOrderId?: string; publicOrderId?: string; companyId: string; deliveryChargeInr?: number; payableInr?: number; expectedDelivery?: string }, typeof input>('/pharmacy/orders', input)
}

export async function fetchPharmacyDeliveryQuote(input: { subtotal: number; pincode?: string }) {
  const params = new URLSearchParams()
  params.set('subtotal', String(Math.max(0, Math.round(Number(input.subtotal) || 0))))
  if (input.pincode) params.set('pincode', input.pincode)
  return apiGet<{ chargeInr: number; expectedDelivery: string; settings?: Record<string, unknown> }>(`/pharmacy/delivery-quote?${params.toString()}`)
}

export async function cancelPharmacyOrder(orderId: string) {
  return apiPost<{ id: string; status: string; status_label: string }, Record<string, never>>(`/pharmacy/orders/${encodeURIComponent(orderId)}/cancel`, {})
}

export async function fetchPharmacyProductsPage(query?: { search?: string; category?: string; limit?: number; offset?: number; audience?: 'employee' | 'doctor' }) {
  const params = new URLSearchParams()
  if (query?.search) params.set('search', query.search)
  if (query?.category) params.set('category', query.category)
  if (query?.limit) params.set('limit', String(query.limit))
  if (typeof query?.offset === 'number') params.set('offset', String(query.offset))
  if (query?.audience) params.set('audience', query.audience)
  params.set('paginated', 'true')
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiGet<PharmacyProductPage>(`/pharmacy/products${suffix}`)
}

export async function fetchAllPharmacyProducts(query?: { search?: string; category?: string; audience?: 'employee' | 'doctor' }) {
  const limit = 100
  let offset = 0
  let total = Infinity
  const items = []
  while (offset < total) {
    const page = await fetchPharmacyProductsPage({ ...query, limit, offset })
    items.push(...(page.items || []))
    total = Number(page.total || items.length)
    if (!page.items?.length) break
    offset += page.items.length
    if (page.items.length < limit) break
  }
  return items
}

export async function fetchPharmacyOrder(orderId: string) {
  return apiGet<PharmacyOrderDetail>(`/pharmacy/orders/${encodeURIComponent(orderId)}`)
}

export async function updatePharmacyOrderStatus(orderId: string, input: { status: string; notes?: string }) {
  return apiPut<{ id: string; status: string; status_label: string; updated_at: string }, typeof input>(
    `/pharmacy/orders/${encodeURIComponent(orderId)}/status`,
    input,
  )
}
