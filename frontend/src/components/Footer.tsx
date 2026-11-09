import React from 'react';
import { Send, ShieldCheck, Phone, Mail, ExternalLink } from 'lucide-react';
import type { Language } from '../types/index.ts';

interface FooterProps {
  language: Language;
  onOpenTelegram: () => void;
  onOpenStaff: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  language,
  onOpenTelegram,
  onOpenStaff
}) => {
  return (
    <footer className="mt-16 bg-white border-t border-slate-200 pt-10 pb-8 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                ₹
              </div>
              <span className="font-display font-bold text-slate-900 text-sm tracking-tight">
                PrimeCapital AI
              </span>
            </div>
            <p className="text-slate-600 max-w-md leading-relaxed">
              {language === 'hi'
                ? 'भारतीय सूक्ष्म एवं लघु उद्यमों के लिए वॉयस-फर्स्ट बिज़नेस लोन सहायता प्रणाली। किराना, टेक्सटाइल, सर्विस एवं विनिर्माण व्यापारियों के लिए सुलभ वित्तीय मार्गदर्शन।'
                : 'A voice-first, AI-powered business loan enquiry assistant designed for small business owners, Kirana retailers, textile workshops, and service enterprises across India.'}
            </p>
            <div className="flex items-center gap-3 text-slate-400 text-[11px]">
              <span>Powered by Gnani Evon v3.3</span>
              <span>·</span>
              <span>English / हिन्दी / Hinglish</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <span className="font-display font-semibold text-slate-900 block text-xs uppercase tracking-wider">
              Assistance & Tools
            </span>
            <ul className="space-y-1.5 text-slate-600">
              <li>
                <a href="#assistant" className="hover:text-slate-900 transition-colors">
                  AI Loan Assistant
                </a>
              </li>
              <li>
                <a href="#catalogue" className="hover:text-slate-900 transition-colors">
                  Loan Products Catalogue
                </a>
              </li>
              <li>
                <a href="#emi" className="hover:text-slate-900 transition-colors">
                  Deterministic EMI Calculator
                </a>
              </li>
              <li>
                <a href="#checklist" className="hover:text-slate-900 transition-colors">
                  Document Readiness Checklist
                </a>
              </li>
            </ul>
          </div>

          {/* Channels & Operations */}
          <div className="space-y-2">
            <span className="font-display font-semibold text-slate-900 block text-xs uppercase tracking-wider">
              Channels & Staff
            </span>
            <ul className="space-y-1.5 text-slate-600">
              <li>
                <button
                  onClick={onOpenTelegram}
                  className="hover:text-emerald-700 transition-colors flex items-center gap-1.5 text-left"
                >
                  <Send className="w-3.5 h-3.5 text-sky-600" />
                  <span>Telegram Assistant Bot</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenStaff}
                  className="hover:text-slate-900 transition-colors text-left"
                >
                  Staff Verification Portal
                </button>
              </li>
              <li>
                <span className="text-slate-400">Toll-free Enquiry (Demonstration): 1800-000-LOAN</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Detailed Mandatory Compliance & Demonstration Disclaimer */}
        <div className="pt-6 border-t border-slate-200/80 space-y-2 text-[11px] leading-relaxed text-slate-500">
          <p>
            <strong className="text-slate-700">Demonstration Disclosure:</strong> PrimeCapital AI is an illustrative prototype. All SBI-labelled schemes, interest rates, processing fees, and eligibility criteria are synthetic demonstration fixtures and do NOT represent official offerings of the State Bank of India or any lending institution. Nothing within this interface constitutes a loan approval, credit sanction, or binding legal commitment.
          </p>
          <p>
            <strong className="text-slate-700">Data & Privacy Protection:</strong> PrimeCapital adheres to privacy-by-design. Sensitive KYC documents (such as PAN and GST certificates) are uploaded exclusively through verified Telegram workflows using explicit user consent (/docconsent) and temporary memory inspection; the web assistant does not collect unmasked sensitive government credentials.
          </p>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-400 text-[11px]">
          <span>© 2026 PrimeCapital AI. Synthetic MSME Loan Discovery Demonstration.</span>
          <div className="flex items-center gap-3">
            <span>Security Audited</span>
            <span>·</span>
            <span>Indian Small Business Finance Project</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
