import { apiGet } from './api'
import { getEmployeeAuthSession, getEmployeeCompanySession } from './authApi'

export type EmployeeInvoice = {
  id: string
  invoice_number: string
  service_type: string
  service_reference?: string | null
  invoice_status: string
  gross_amount_inr: number
  wallet_discount_inr: number
  payable_inr: number
  file_name?: string | null
  public_url?: string | null
  created_at: string
  company_name?: string | null
}

export async function fetchEmployeeInvoices() {
  const auth = getEmployeeAuthSession()
  const company = getEmployeeCompanySession()
  if (!auth?.userId) throw new Error('Missing employee session')
  const params = new URLSearchParams({ employeeId: auth.userId })
  if (company?.companyId) params.set('companyId', company.companyId)
  const data = await apiGet<{ items: EmployeeInvoice[]; total: number; limit: number; offset: number }>(`/invoices/mine?${params.toString()}`)
  return data.items ?? []
}

export function buildInvoiceDownloadUrl(invoiceId: string) {
  return `/api/invoices/${encodeURIComponent(invoiceId)}/download`
}

export function resolveInvoiceDownloadUrl(invoice: Pick<EmployeeInvoice, "id" | "public_url">) {
  return invoice.public_url || buildInvoiceDownloadUrl(invoice.id)
}
