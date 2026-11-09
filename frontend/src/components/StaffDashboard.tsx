import React, { useState, useEffect } from 'react';
import {
  Users,
  FileCheck2,
  TrendingUp,
  History,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Lock,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import {
  fetchStaffEnquiries,
  updateStaffEnquiry,
  fetchStaffLeads,
  fetchStaffDocuments,
  reviewStaffDocument,
  fetchAuditEvents,
  getStaffDocumentUrl
} from '../services/api.ts';
import type { StaffEnquiry, StaffLead, StaffDocument, AuditEvent, Language } from '../types/index.ts';

interface StaffDashboardProps {
  onBackToBorrower: () => void;
  language: Language;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  onBackToBorrower,
  language
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [staffToken, setStaffToken] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<'enquiries' | 'documents' | 'leads' | 'audit'>('enquiries');

  const [enquiries, setEnquiries] = useState<StaffEnquiry[]>([]);
  const [documents, setDocuments] = useState<StaffDocument[]>([]);
  const [leads, setLeads] = useState<StaffLead[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeDocPreview, setActiveDocPreview] = useState<any | null>(null);
  const [rejectingDocumentId, setRejectingDocumentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadAllStaffData = async (): Promise<boolean> => {
    if (!staffToken.trim()) return false;
    setLoading(true);
    try {
      const [enqs, docs, lds, auds] = await Promise.all([
        fetchStaffEnquiries(staffToken),
        fetchStaffDocuments(staffToken),
        fetchStaffLeads(staffToken),
        fetchAuditEvents(staffToken)
      ]);
      setEnquiries(enqs);
      setDocuments(docs);
      setLeads(lds);
      setAuditLog(auds);
      return true;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Could not load staff records.');
      setIsAuthenticated(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (enquiryId: string, status: any) => {
    try {
      const updated = await updateStaffEnquiry(enquiryId, { status }, staffToken);
      setEnquiries((prev) => prev.map((e) => (e.id === enquiryId ? updated : e)));
    } catch (err) {
      alert('Failed to update enquiry');
    }
  };

  const handleAssignOfficer = async (enquiryId: string, assignedTo: string) => {
    try {
      const updated = await updateStaffEnquiry(enquiryId, { assignedTo }, staffToken);
      setEnquiries((prev) => prev.map((e) => (e.id === enquiryId ? updated : e)));
    } catch (err) {
      alert('Failed to assign officer');
    }
  };

  const handleReviewDocument = async (docId: string, decision: 'accepted' | 'rejected', reason?: string) => {
    try {
      const result = await reviewStaffDocument(docId, decision, staffToken, reason);
      if (!result.notification_sent) {
        alert(`Review saved and uploaded file deleted, but Telegram feedback could not be sent: ${result.notification_error || 'Unknown Telegram error'}`);
      } else {
        alert(`Document ${decision}. Customer has been notified on Telegram.`);
      }
      // Reload documents and audit
      const [docs, auds] = await Promise.all([fetchStaffDocuments(staffToken), fetchAuditEvents(staffToken)]);
      setDocuments(docs);
      setAuditLog(auds);
      setRejectingDocumentId(null);
      setRejectionReason('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit review');
    }
  };

  const handleViewDocumentSigned = async (doc: StaffDocument) => {
    try {
      const data = await getStaffDocumentUrl(doc.id, staffToken);
      setActiveDocPreview(data);
    } catch (err) {
      alert('Failed to generate secure preview token');
    }
  };

  if (!isAuthenticated) return (
    <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
      <div className="flex gap-3 items-center"><Lock className="w-6 h-6 text-slate-700" /><div><h2 className="font-bold">Staff access</h2><p className="text-xs text-slate-500">Enter a valid staff token to load protected records.</p></div></div>
      {authError && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{authError}</p>}
      <input type="password" value={staffToken} onChange={e => setStaffToken(e.target.value)} placeholder="Staff access token" className="w-full px-3 py-2 border rounded-lg text-sm" />
      <div className="flex gap-2"><button disabled={loading} onClick={async () => { setAuthError(''); if (await loadAllStaffData()) setIsAuthenticated(true); }} className="px-4 py-2 bg-slate-900 disabled:opacity-50 text-white rounded-lg text-sm">{loading ? 'Signing in…' : 'Sign in'}</button><button onClick={onBackToBorrower} className="px-4 py-2 border rounded-lg text-sm">Back</button></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold tracking-tight">
                  PrimeCapital Staff Operations Portal
                </h2>
                <span className="text-emerald-300 text-xs font-mono font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  Secured Console
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage loan enquiries, review Telegram bot KYC documents, and monitor lead audit events.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllStaffData}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
            <button
              onClick={onBackToBorrower}
              className="px-4 py-1.5 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
            >
              Switch to Borrower View
            </button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center gap-2 mt-6 border-t border-slate-800 pt-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('enquiries')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'enquiries'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Enquiries Queue ({enquiries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'documents'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>KYC Document Queue ({documents.filter((d) => d.verificationStatus === 'pending').length} Pending)</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'leads'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>SME Leads ({leads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail ({auditLog.length})</span>
          </button>
        </div>
      </div>

      {/* View 1: Enquiries Queue */}
      {activeTab === 'enquiries' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900">
                Loan Enquiries & Handoff Requests
              </h3>
              <p className="text-xs text-slate-500">
                Assigned relationship manager queue for verified small businesses
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ticket, name, business..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Borrower & Enterprise</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Officer</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enquiries
                  .filter(
                    (e) =>
                      e.ticketNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      e.businessName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      e.contactPerson.toLowerCase().includes(searchFilter.toLowerCase())
                  )
                  .map((enq) => (
                    <tr key={enq.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {enq.ticketNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{enq.contactPerson}</div>
                        <div className="text-slate-500 text-[11px]">{enq.businessName} · {enq.phone}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{enq.category}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        ₹{enq.requestedAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <select
                          value={enq.status}
                          onChange={(e) => handleUpdateStatus(enq.id, e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-800"
                        >
                          <option value="new">New</option>
                          <option value="assigned">Assigned</option>
                          <option value="in_review">In Review</option>
                          <option value="contacted">Contacted</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {enq.assignedTo ? (
                          <span className="font-medium text-slate-800">{enq.assignedTo}</span>
                        ) : (
                          <button
                            onClick={() => handleAssignOfficer(enq.id, 'Vikram Joshi (SME Desk)')}
                            className="text-emerald-700 hover:underline font-semibold"
                          >
                            + Assign Self
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => alert(`Enquiry Notes:\n\n${enq.notes}\nPreferred Product: ${enq.preferredProduct}`)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded font-medium transition-colors"
                        >
                          View Notes
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Document Verification Queue */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900">
                KYC Document Verification Pipeline (Telegram OCR Intake)
              </h3>
              <p className="text-xs text-slate-500">
                Encrypted Supabase storage with short-lived memory access for bank staff review
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Bucket: private_kyc_vault (Tesseract 5.3)
            </span>
          </div>

          <div className="overflow-x-auto p-4 pt-0">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Doc ID</th>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4">Masked Identifier</th>
                  <th className="py-3 px-4">Extracted Name</th>
                  <th className="py-3 px-4">OCR Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <React.Fragment key={doc.id}>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{doc.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{doc.documentType}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{doc.maskedIdentifier}</td>
                    <td className="py-3 px-4 text-slate-800">{doc.extractedName}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-emerald-800 tabular-nums">
                        {doc.ocrConfidence}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {doc.verificationStatus === 'pending' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800">
                          Pending Staff Check
                        </span>
                      )}
                      {doc.verificationStatus === 'accepted' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
                          Accepted
                        </span>
                      )}
                      {doc.verificationStatus === 'rejected' && (
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-100 text-rose-800">Rejected</span>
                          {doc.rejectionReason && <p className="max-w-xs whitespace-normal text-[11px] text-rose-700">Reason: {doc.rejectionReason}</p>}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {doc.verificationStatus === 'pending' && <button
                        onClick={() => handleViewDocumentSigned(doc)}
                        className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-medium inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Preview</span>
                      </button>}

                      {doc.verificationStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReviewDocument(doc.id, 'accepted')}
                            className="px-2.5 py-1 text-white bg-emerald-700 hover:bg-emerald-800 rounded font-semibold transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => { setRejectingDocumentId(doc.id); setRejectionReason(''); }}
                            className="px-2.5 py-1 text-white bg-rose-700 hover:bg-rose-800 rounded font-semibold transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {rejectingDocumentId === doc.id && doc.verificationStatus === 'pending' && (
                    <tr>
                      <td colSpan={7} className="px-4 pb-4 bg-rose-50/60">
                        <div className="max-w-2xl rounded-lg border border-rose-200 bg-white p-3 space-y-2">
                          <label htmlFor={`rejection-reason-${doc.id}`} className="block text-xs font-semibold text-slate-800">Why is this document being rejected? <span className="text-rose-700">Required</span></label>
                          <textarea
                            id={`rejection-reason-${doc.id}`}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            maxLength={250}
                            rows={2}
                            placeholder="Example: The uploaded PAN image is blurry. Please upload a clear photo."
                            className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                          />
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[11px] text-slate-500">{rejectionReason.length}/250 characters</span>
                            <div className="flex gap-2">
                              <button onClick={() => { setRejectingDocumentId(null); setRejectionReason(''); }} className="rounded px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100">Cancel</button>
                              <button disabled={!rejectionReason.trim()} onClick={() => handleReviewDocument(doc.id, 'rejected', rejectionReason.trim())} className="rounded px-3 py-1.5 text-xs font-semibold text-white bg-rose-700 disabled:opacity-40">Confirm rejection</button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 3: Leads Management */}
      {activeTab === 'leads' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-display text-sm font-bold text-slate-900">
              MSME Growth Leads & Qualification Pipeline
            </h3>
            <p className="text-xs text-slate-500">
              Prospective merchants qualified through voice interaction and conversational intent
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Lead ID</th>
                  <th className="py-3 px-4">Business Name & Phone</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Turnover Estimate</th>
                  <th className="py-3 px-4">Lead Score</th>
                  <th className="py-3 px-4">Intake Channel</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{lead.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{lead.name}</div>
                      <div className="text-slate-500 text-[11px] font-mono">{lead.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{lead.businessType}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">{lead.turnoverRange}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-800">
                        <span>{lead.leadScore}</span>
                        <span className="text-[10px] text-slate-400 font-normal">/100</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="capitalize">{lead.source.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 capitalize">
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 4: Security Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-display text-sm font-bold text-slate-900">
              Immutable Security & Officer Audit Trail
            </h3>
            <p className="text-xs text-slate-500">
              Complete chronological ledger of loan reviews, status transitions, and data access
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {auditLog.map((event) => (
              <div key={event.id} className="p-4 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-900">{event.action}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{event.entity} ({event.entityId})</span>
                  </div>
                  <p className="text-slate-700">{event.details}</p>
                  <span className="text-[11px] text-slate-400">Actor: {event.actor}</span>
                </div>
                <div className="font-mono text-slate-400 text-[11px] whitespace-nowrap tabular-nums">
                  {new Date(event.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for Short-Lived Document Preview */}
      {activeDocPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h4 className="font-display font-bold text-slate-900">
                  Secure Decrypted KYC Preview
                </h4>
                <span className="text-xs text-slate-500 font-mono">
                  Doc ID: {activeDocPreview.document?.id} ({activeDocPreview.document?.documentType})
                </span>
              </div>
              <button
                onClick={() => setActiveDocPreview(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Masked ID:</span>
                <span className="font-bold text-emerald-400">{activeDocPreview.document?.maskedIdentifier}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Extracted Name:</span>
                <span>{activeDocPreview.document?.extractedName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">OCR Engine Confidence:</span>
                <span className="text-emerald-400">{activeDocPreview.document?.ocrConfidence}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Signed Token Lifespan:</span>
                <span>{activeDocPreview.signedTokenExpiresInSeconds}s (Auto-Purge)</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                {activeDocPreview.notice}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveDocPreview(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
