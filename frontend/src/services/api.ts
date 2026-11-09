import type { AuditEvent, BusinessCategory, Language, LoanProduct, StaffDocument, StaffEnquiry, StaffLead } from '../types/index.ts';

const API_BASE = import.meta.env.VITE_API_URL || '';
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (response.ok) return response.json() as Promise<T>;
  const body = await response.json().catch(() => ({}));
  throw new Error(body.detail || body.message || `Request failed (${response.status})`);
}
function staffHeaders(token: string, json = false): HeadersInit {
  if (!token.trim()) throw new Error('Enter a staff access token.');
  return { 'x-staff-token': token, ...(json ? { 'Content-Type': 'application/json' } : {}) };
}
export function getSessionId(): string {
  let id = sessionStorage.getItem('primecapital_session_id');
  if (!id) { id = `pc_sess_${crypto.randomUUID()}`; sessionStorage.setItem('primecapital_session_id', id); }
  return id;
}
export function mapProduct(raw: Record<string, unknown>): LoanProduct {
  const rate = typeof raw.annual_interest_rate === 'number' ? raw.annual_interest_rate * 100 : undefined;
  return { id: String(raw.id), name: String(raw.name || 'Unnamed product'), schemeCode: String(raw.id), category: String(raw.category || ''), currency: typeof raw.currency === 'string' ? raw.currency : 'INR', interestRateMin: rate, interestRateMax: rate, minAmount: Number(raw.min_amount), maxAmount: Number(raw.max_amount), minTenureMonths: Number(raw.min_tenure_months), maxTenureMonths: Number(raw.max_tenure_months), collateralRequirement: typeof raw.collateral_required === 'string' ? raw.collateral_required : undefined, targetBusiness: String(raw.category || ''), eligibilityCriteria: [], keyDocuments: [], summary: typeof raw.description === 'string' ? raw.description : '', disclaimerNote: typeof raw.notice === 'string' ? raw.notice : undefined, sourceId: typeof raw.source_id === 'string' ? raw.source_id : undefined, sourceTitle: typeof raw.source_title === 'string' ? raw.source_title : undefined, sourceVersion: typeof raw.source_version === 'string' ? raw.source_version : undefined, syntheticDemo: raw.synthetic_demo === true };
}
export async function fetchProducts(): Promise<LoanProduct[]> {
  const data = await request<Record<string, unknown>[] | { products?: Record<string, unknown>[] }>('/api/products');
  return (Array.isArray(data) ? data : data.products || []).map(mapProduct);
}
export async function sendChatMessage(payload: { sessionId: string; message: string; language: Language; consent: boolean; businessCategory?: BusinessCategory }) {
  const data = await request<Record<string, any>>('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: payload.sessionId, message: payload.message, language: payload.language, consent: payload.consent, business_category: payload.businessCategory }) });
  return { response: data.text || data.response || data.message || '', workflow_state: data.state || data.workflow_state || 'general', suggested_actions: data.suggested_actions || [], loan_match: data.loan_match, emi_preview: data.emi_preview, handoff_recommended: Boolean(data.handoff_recommended || data.state === 'HANDOFF') };
}
export async function confirmConversation(sessionId: string, confirmed: boolean) { return request('/api/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, confirmed }) }); }
export async function submitHandoff(payload: { name: string; phone: string; businessName: string; category: BusinessCategory; loanAmount: number; notes?: string; language: Language }) {
  const summary = `Name: ${payload.name}; Phone: ${payload.phone}; Business: ${payload.businessName}; Category: ${payload.category}; Requested amount: ${payload.loanAmount}; Notes: ${payload.notes || 'None'}`;
  return request<Record<string, unknown>>('/api/handoff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary, language: payload.language }) });
}
export async function transcribeAudio(file: Blob, language: Language, consent: boolean) { const form = new FormData(); form.append('file', file, 'recording.webm'); form.append('language', language); form.append('consent', String(consent)); return request<{ text: string }>('/api/speech/transcribe', { method: 'POST', body: form }); }
export async function synthesizeSpeech(text: string, language: Language): Promise<Blob> { const response = await fetch(`${API_BASE}/api/speech/synthesize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language }) }); if (!response.ok) throw new Error('Speech service is unavailable.'); return response.blob(); }
async function staffList(path: string, token: string): Promise<Record<string, unknown>[]> {
  const data = await request<unknown>(path, { headers: staffHeaders(token) });
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === 'object') {
    const candidate = Object.values(data as Record<string, unknown>).find(Array.isArray);
    if (Array.isArray(candidate)) return candidate as Record<string, unknown>[];
  }
  throw new Error('The staff service returned an invalid response.');
}
export async function fetchStaffEnquiries(token: string): Promise<StaffEnquiry[]> {
  const rows = await staffList('/api/staff/enquiries', token);
  return rows.map(row => ({ id: String(row.id), ticketNumber: String(row.id), businessName: 'Not provided', contactPerson: 'Not provided', phone: 'Not provided', category: 'Other Business', requestedAmount: 0, preferredProduct: 'Not provided', language: (row.language as Language) || 'en', status: (row.status as StaffEnquiry['status']) || 'new', assignedTo: row.assigned_to as string | undefined, notes: String(row.summary || ''), createdAt: String(row.created_at || ''), updatedAt: String(row.created_at || '') }));
}
export const updateStaffEnquiry = (id: string, updates: Partial<StaffEnquiry>, token: string) => request<StaffEnquiry>(`/api/staff/enquiries/${id}`, { method: 'PATCH', headers: staffHeaders(token, true), body: JSON.stringify(updates) });
export async function fetchStaffLeads(token: string): Promise<StaffLead[]> { const rows = await staffList('/api/staff/leads', token); return rows.map(row => ({ id: String(row.id), name: String(row.name || 'Not provided'), phone: String(row.phone || 'Not provided'), businessType: String(row.business_type || row.loan_interest || 'Not provided'), turnoverRange: 'Not provided', leadScore: 0, source: row.channel === 'telegram' ? 'telegram_bot' : 'web_chat', status: (row.status as StaffLead['status']) || 'lead', notes: String(row.conversation_summary || ''), createdAt: String(row.created_at || '') })); }
export async function fetchStaffDocuments(token: string): Promise<StaffDocument[]> { const rows = await staffList('/api/staff/documents', token); return rows.map(row => ({ id: String(row.id), ticketNumber: String(row.ticketNumber || ''), documentType: String(row.documentType || 'Document') as StaffDocument['documentType'], maskedIdentifier: String(row.maskedIdentifier || 'Not available'), source: 'Telegram Bot', verificationStatus: (row.verificationStatus === 'pending_human_review' ? 'pending' : row.verificationStatus) as StaffDocument['verificationStatus'], reviewStatus: String(row.reviewStatus || ''), rejectionReason: typeof row.rejectionReason === 'string' ? row.rejectionReason : undefined, formatCheck: String(row.formatCheck || 'Not available'), uploadedAt: String(row.uploadedAt || '') })); }
export const reviewStaffDocument = (id: string, decision: 'accepted' | 'rejected', token: string, rejectionReason?: string) => request<{ notification_sent: boolean; notification_error?: string; file_deleted: boolean }>(`/api/staff/documents/${id}/review`, { method: 'POST', headers: staffHeaders(token, true), body: JSON.stringify({ decision, rejection_reason: rejectionReason }) });
export async function fetchAuditEvents(token: string): Promise<AuditEvent[]> { const rows = await staffList('/api/staff/audit', token); return rows.map((row, index) => ({ id: String(row.id || index), action: String(row.event_type || 'Event'), entity: String(row.entity || ''), entityId: String(row.enquiry_id || row.document_id || ''), actor: String(row.actor || 'System'), details: '', timestamp: String(row.timestamp || '') })); }
export async function getStaffDocumentUrl(id: string, token: string) { return request<{ url: string }>(`/api/staff/documents/${id}/view`, { headers: staffHeaders(token) }); }
