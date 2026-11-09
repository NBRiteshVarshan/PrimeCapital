import React from 'react';
import { ShieldCheck, MessageSquare, BookOpen, Calculator, CheckSquare, Send, UserCheck, Languages } from 'lucide-react';
import type { Language } from '../types/index.ts';

interface HeaderProps {
  activeTab: 'chat' | 'catalogue' | 'emi' | 'documents' | 'staff';
  setActiveTab: (tab: 'chat' | 'catalogue' | 'emi' | 'documents' | 'staff') => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  onOpenTelegram: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  onOpenTelegram
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single element brand wordmark */}
          <button
            onClick={() => setActiveTab('chat')}
            className="flex items-center gap-2.5 text-left group transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
              ₹
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              PrimeCapital AI
            </span>
          </button>

          {/* Zone 2: 4-5 clean single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('chat')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
                activeTab === 'chat'
                  ? 'border-slate-900 text-slate-950 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Loan Assistant
            </button>
            <button
              onClick={() => setActiveTab('catalogue')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
                activeTab === 'catalogue'
                  ? 'border-slate-900 text-slate-950 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Loan Catalogue
            </button>
            <button
              onClick={() => setActiveTab('emi')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
                activeTab === 'emi'
                  ? 'border-slate-900 text-slate-950 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              EMI Calculator
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
                activeTab === 'documents'
                  ? 'border-slate-900 text-slate-950 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Document Checklist
            </button>
            <button
              onClick={onOpenTelegram}
              className="text-slate-600 hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-sky-600" />
              <span>Telegram Bot</span>
            </button>
          </nav>

          {/* Zone 3: Language selector + 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Language Segmented Selector */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium border border-slate-200">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                  language === 'en'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                  language === 'hi'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                हिन्दी
              </button>
              <button
                onClick={() => setLanguage('hinglish')}
                className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                  language === 'hinglish'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hinglish
              </button>
            </div>

            {/* Primary Action Button: Staff Dashboard */}
            <button
              onClick={() => setActiveTab(activeTab === 'staff' ? 'chat' : 'staff')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'staff'
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{activeTab === 'staff' ? 'Borrower Portal' : 'Staff Portal'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center gap-2 overflow-x-auto py-2.5 border-t border-slate-100 no-scrollbar">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1 text-xs rounded-md whitespace-nowrap shrink-0 font-medium ${
              activeTab === 'chat' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Loan Assistant
          </button>
          <button
            onClick={() => setActiveTab('catalogue')}
            className={`px-3 py-1 text-xs rounded-md whitespace-nowrap shrink-0 font-medium ${
              activeTab === 'catalogue' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Catalogue
          </button>
          <button
            onClick={() => setActiveTab('emi')}
            className={`px-3 py-1 text-xs rounded-md whitespace-nowrap shrink-0 font-medium ${
              activeTab === 'emi' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            EMI Calc
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3 py-1 text-xs rounded-md whitespace-nowrap shrink-0 font-medium ${
              activeTab === 'documents' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Checklist
          </button>
          <button
            onClick={onOpenTelegram}
            className="px-3 py-1 text-xs rounded-md whitespace-nowrap shrink-0 font-medium text-sky-700 bg-sky-50 flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            <span>Telegram</span>
          </button>
        </div>
      </div>
    </header>
  );
};
