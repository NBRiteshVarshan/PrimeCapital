import React from 'react';
import { X, Send, ShieldCheck, Camera, Mic, CheckCircle, ExternalLink, Bot, Lock } from 'lucide-react';
import type { Language } from '../types/index.ts';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({
  isOpen,
  onClose,
  language
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
            <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              PrimeCapital Telegram Assistant Bot
            </h3>
            <span className="text-xs text-sky-700 font-mono">@PrimeCapital_Assistant_Bot</span>
          </div>
        </div>

        <div className="py-4 space-y-4 text-xs text-slate-600 leading-relaxed">
          <p>
            The official Telegram bot extends PrimeCapital with voice messaging in Hindi & English, plus secure smartphone document capture.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs">
                <Mic className="w-4 h-4 text-emerald-600" />
                <span>Voice Notes & Chat</span>
              </div>
              <p className="text-slate-500">
                Send voice notes in Hindi or English while walking in your shop or warehouse. The bot transcribes and responds instantly.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs">
                <Camera className="w-4 h-4 text-sky-600" />
                <span>PAN / GST Verification</span>
              </div>
              <p className="text-slate-500">
                Snap photos of your business PAN or GST certificate directly via camera after explicit consent.
              </p>
            </div>
          </div>

          {/* Secure Workflow Steps */}
          <div className="bg-sky-50/70 border border-sky-200 p-3.5 rounded-xl space-y-2">
            <span className="font-semibold text-sky-950 block">
              Document Processing & Privacy Safeguards
            </span>
            <div className="space-y-1.5 text-sky-900">
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-sky-700">01.</span>
                <span>Review and type <code>/docconsent</code> before sending any certificate image.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-sky-700">02.</span>
                <span>Local Tesseract OCR extracts masked identifiers (e.g. <code>ABCDE****F</code>).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-sky-700">03.</span>
                <span>Original image is placed in an encrypted Supabase vault for loan officer review only.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono font-bold text-sky-700">04.</span>
                <span>Original files are securely purged following human verification decision.</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>OCR does not claim government verification. Human staff confirm all applications.</span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">Available 24/7 on Telegram</span>
          <a
            href="https://t.me/PrimeCapital_Assistant_Bot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Launch Telegram Bot</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
