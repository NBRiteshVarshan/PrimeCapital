import React, { useState } from 'react';
import { AlertCircle, Check, Info, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import type { Language } from '../types/index.ts';

interface ConsentBannerProps {
  consentGiven: boolean;
  onConsentToggle: (consent: boolean) => void;
  language: Language;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({
  consentGiven,
  onConsentToggle,
  language
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-100/90 border border-slate-200 rounded-xl p-4 transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5 sm:mt-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-xs uppercase tracking-wider text-slate-800">
                {language === 'hi'
                  ? 'सांकेतिक प्रदर्शन सूचना (Synthetic Demonstration)'
                  : 'Demonstration & Compliance Notice'}
              </span>
              <span className="text-slate-400 text-xs">·</span>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-slate-600 hover:text-slate-900 underline flex items-center gap-1 font-medium"
              >
                {isExpanded ? 'Less details' : 'View full disclosure'}
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {language === 'hi'
                ? 'प्राइमकैपिटल AI एक शोध एवं प्रदर्शन प्लेटफॉर्म है। इसमें दर्शाए गए एसबीआई-लेबल वाले लोन उत्पाद, ब्याज दरें व शुल्क केवल सांकेतिक (fictional) हैं, आधिकारिक ऋण प्रस्ताव नहीं।'
                : language === 'hinglish'
                ? 'PrimeCapital AI demonstration platform hai. SBI-labelled loan products aur interest rates fictional simulation hain, official SBI offer ya loan guarantee nahi.'
                : 'PrimeCapital AI is an experimental demonstration assistant. All SBI-labelled products, interest rates, and fees are synthetic illustrative models, not official bank loan approvals.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center mt-2 sm:mt-0">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => onConsentToggle(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-medium text-slate-800">
              {language === 'hi' ? 'सहमति स्वीकृत' : 'I acknowledge & consent'}
            </span>
          </label>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3.5 pt-3.5 border-t border-slate-200/80 text-xs text-slate-600 space-y-2 leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-0.5">1. Synthetic Loan Products</span>
              <span>Parameters are derived for small business educational exploration and are not binding lending commitments.</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-0.5">2. Privacy & Verification</span>
              <span>This web assistant does not collect or upload PAN/GST document images. Document submission is strictly conducted via our verified Telegram workflow.</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-0.5">3. Human Underwriting</span>
              <span>All financial decisions require formal verification by a designated bank branch or licensed credit officer.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
