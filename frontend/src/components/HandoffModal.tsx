import React, { useState } from 'react';
import { X, PhoneCall, CheckCircle2, AlertCircle, Send, User, Building, Phone, CreditCard } from 'lucide-react';
import { submitHandoff, getSessionId } from '../services/api.ts';
import type { Language, BusinessCategory } from '../types/index.ts';

interface HandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  defaultCategory: BusinessCategory | null;
}

export const HandoffModal: React.FC<HandoffModalProps> = ({
  isOpen,
  onClose,
  language,
  defaultCategory
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<BusinessCategory>(defaultCategory || 'Kirana & Retail');
  const [amount, setAmount] = useState<string>('300000');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !businessName.trim()) {
      setError('Please fill in your name, phone number, and business name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await submitHandoff({
        sessionId: getSessionId(),
        name,
        phone,
        businessName,
        category,
        loanAmount: Number(amount) || 200000,
        notes,
        language
      });

      setTicketResult(res.ticket_number || 'PC-2026-CONFIRMED');
    } catch (err: any) {
      setError(err?.message || 'Failed to register callback request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setTicketResult(null);
    setName('');
    setPhone('');
    setBusinessName('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={handleResetAndClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {ticketResult ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Loan Officer Request Registered
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Your enquiry ticket has been generated in PrimeCapital's staff queue.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl max-w-xs mx-auto">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Ticket Number</span>
              <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                {ticketResult}
              </span>
              <span className="text-[11px] text-emerald-700 block mt-1 font-medium">
                Assigned to SME Relationship Desk
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed px-4">
              A designated credit specialist will contact you on <strong>{phone}</strong> to guide you through interest rates, application forms, and branch inspection.
            </p>

            <button
              onClick={handleResetAndClose}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Back to Assistant
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  {language === 'hi' ? 'लोन प्रतिनिधि से संपर्क करें' : 'Speak with an SME Loan Officer'}
                </h3>
                <p className="text-xs text-slate-500">
                  Personalized human assistance for complex inquiries and documentation
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Owner / Applicant Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Mobile Number (WhatsApp) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98200 00000"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Business / Enterprise Name *
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Ganesh Kirana Store"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Business Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as BusinessCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                  >
                    <option value="Kirana & Retail">Kirana & Retail</option>
                    <option value="Textiles & Manufacturing">Textiles & Manufacturing</option>
                    <option value="Services & Repair">Services & Repair</option>
                    <option value="Other Business">Other Business</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Requested Loan Amount (INR)
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="300000"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Specific Query or Preferred Time to Call
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Please call in the afternoon. Need advice regarding Udyam certificate."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Registering...' : 'Request Callback'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
