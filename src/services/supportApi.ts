import { apiGet, apiPost } from './api'

export type SupportAttachment = { name: string; size: number; type: string; url?: string }

export function createEmployeeSupportTicket(body: {
  companyId?: string
  employeeId?: string
  corporateName?: string
  reporterName?: string
  reporterEmail?: string
  subject: string
  category: string
  assignedTeam?: string
  priority?: string
  message: string
  attachments?: SupportAttachment[]
}) {
  return apiPost<{ id: string; assignedTeam?: string }, any>('/platform-admin/support', { ...body, appContext: 'employee' })
}

export function fetchSupportMessages(ticketId: string) {
  return apiGet<Array<{ id: string; ticketId: string; senderRole: string; message: string; attachments: SupportAttachment[]; createdAt: string }>>(`/platform-admin/support/${encodeURIComponent(ticketId)}/messages`)
}

export function sendSupportMessage(ticketId: string, message: string, attachments: SupportAttachment[] = []) {
  return apiPost<{ id: string }, any>(`/platform-admin/support/${encodeURIComponent(ticketId)}/messages`, {
    senderRole: 'employee',
    message,
    attachments,
  })
}
