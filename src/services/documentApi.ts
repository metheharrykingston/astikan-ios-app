import { apiGet } from './api'
import { getEmployeeAuthSession, getEmployeeCompanySession } from './authApi'

export type EmployeeServiceDocument = {
  id: string
  document_kind: string
  document_number: string
  document_status: string
  source_type: string
  source_id: string
  recipient_name?: string | null
  recipient_email?: string | null
  file_name?: string | null
  public_url?: string | null
  created_at: string
}

export async function fetchEmployeeDocuments() {
  const auth = getEmployeeAuthSession()
  const company = getEmployeeCompanySession()
  if (!auth?.userId) throw new Error('Missing employee session')
  const params = new URLSearchParams({ employeeId: auth.userId })
  if (company?.companyId) params.set('companyId', company.companyId)
  const data = await apiGet<{ items: EmployeeServiceDocument[]; total: number; limit: number; offset: number }>(`/documents/mine?${params.toString()}`)
  return data.items ?? []
}

export function buildDocumentDownloadUrl(documentId: string) {
  return `/api/documents/${encodeURIComponent(documentId)}/download`
}
