import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { ConsentBanner } from './components/ConsentBanner.tsx';
import { BusinessCategories } from './components/BusinessCategories.tsx';
import { ChatAssistant } from './components/ChatAssistant.tsx';
import { ProductCatalogue } from './components/ProductCatalogue.tsx';
import { EMICalculator } from './components/EMICalculator.tsx';
import { DocumentChecklist } from './components/DocumentChecklist.tsx';
import { HandoffModal } from './components/HandoffModal.tsx';
import { TelegramModal } from './components/TelegramModal.tsx';
import { StaffDashboard } from './components/StaffDashboard.tsx';
import { Footer } from './components/Footer.tsx';
import type { Language, BusinessCategory, LoanProduct } from './types/index.ts';
import { MessageSquare, BookOpen, Calculator, CheckSquare, Sparkles, Send, ShieldCheck, ArrowRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'catalogue' | 'emi' | 'documents' | 'staff'>('chat');
  const [language, setLanguage] = useState<Language>('en');
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | null>('Kirana & Retail');
  const [consentGiven, setConsentGiven] = useState<boolean>(false);

  // Modals state
  const [isHandoffOpen, setIsHandoffOpen] = useState(false);
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);

  // Cross-component coordination state
  const [emiAmount, setEmiAmount] = useState<number>(300000);
  const [emiTenure, setEmiTenure] = useState<number>(24);
  const [selectedProductForEmi, setSelectedProductForEmi] = useState<LoanProduct | null>(null);
  const [prefilledChatPrompt, setPrefilledChatPrompt] = useState<string | null>(null);

  // Handle URL route simulation (e.g. if path is /staff)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/staff') {
      setActiveTab('staff');
    }
  }, []);

  const handleSelectCategory = (cat: BusinessCategory) => {
    setSelectedCategory(cat);
  };

  const handleOpenEMICalculator = (amount?: number, tenure?: number) => {
    if (amount) setEmiAmount(amount);
    if (tenure) setEmiTenure(tenure);
    setActiveTab('emi');
  };

  const handleAskAboutProduct = (productName: string, query?: string) => {
    const text = query || `Can you explain the interest rate and documents required for ${productName}?`;
    setActiveTab('chat');
    setPrefilledChatPrompt(text);
  };

  const handleCalculateEMIForProduct = (product: LoanProduct) => {
    setSelectedProductForEmi(product);
    setEmiAmount(product.minAmount);
    setEmiTenure(product.minTenureMonths);
    setActiveTab('emi');
  };

  const handleSendToChatFromEMI = (message: string) => {
    setActiveTab('chat');
    setPrefilledChatPrompt(message);
  };

  const handleAskAIAboutDocs = (docName: string) => {
    const promptText =
      language === 'hi'
        ? `मुझे ${docName} के बारे में बताएं। बैंक लोन के लिए यह क्यों आवश्यक है और इसे कैसे प्राप्त किया जा सकता है?`
        : `Why is "${docName}" required for a business loan and how does it affect my application approval?`;
    setActiveTab('chat');
    setPrefilledChatPrompt(promptText);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
        onOpenTelegram={() => setIsTelegramOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* If Staff Portal is active, show the Staff Dashboard */}
        {activeTab === 'staff' ? (
          <StaffDashboard
            onBackToBorrower={() => setActiveTab('chat')}
            language={language}
          />
        ) : (
          <>
            {/* Compliance & Demonstration Consent Notice */}
            <ConsentBanner
              consentGiven={consentGiven}
              onConsentToggle={setConsentGiven}
              language={language}
            />

            {/* Hero / Business Category Context Strip */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="max-w-2xl space-y-2">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Voice-First AI Loan Assistant for Indian MSMEs</span>
                  </div>

                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {language === 'hi'
                      ? 'अपने छोटे व्यवसाय के लिए सही लोन खोजें और तुरंत समझें'
                      : language === 'hinglish'
                      ? 'Apne Business ke liye Best Loan Options & EMI Jaaniye'
                      : 'Explore Small Business Loans with Conversational Voice AI'}
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {language === 'hi'
                      ? 'किराना, परिधान, ऑटो वर्कशॉप और विनिर्माण उद्यमियों के लिए डिज़ाइन किया गया। जटिल बैंकिंग फॉर्म्स के बिना बोलकर या लिखकर ब्याज दरें, कागज़ात और EMI जानें।'
                      : 'Designed specifically for Kirana shopkeepers, textile manufacturers, and workshop owners. Explore illustrative SBI-labelled demonstration products and calculate monthly EMIs effortlessly.'}
                  </p>
                </div>

                {/* Quick Action Button for Loan Officer Handoff */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                  <button
                    onClick={() => setIsHandoffOpen(true)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                  >
                    <span>Speak with Loan Officer</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => setIsTelegramOpen(true)}
                    className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-600" />
                    <span>Telegram Voice & Doc Bot</span>
                  </button>
                </div>
              </div>

              {/* Business Categories Selection Section */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <BusinessCategories
                  selectedCategory={selectedCategory}
                  onSelectCategory={handleSelectCategory}
                  language={language}
                />
              </div>
            </div>

            {/* Navigation Tabs for Borrower Workspace */}
            <div className="flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-4 py-2.5 text-xs font-semibold transition-all flex items-center gap-2 border-b-2 ${
                    activeTab === 'chat'
                      ? 'border-slate-900 text-slate-950'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>AI Loan Assistant</span>
                </button>

                <button
                  onClick={() => setActiveTab('catalogue')}
                  className={`px-4 py-2.5 text-xs font-semibold transition-all flex items-center gap-2 border-b-2 ${
                    activeTab === 'catalogue'
                      ? 'border-slate-900 text-slate-950'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-sky-600" />
                  <span>Loan Catalogue</span>
                </button>

                <button
                  onClick={() => setActiveTab('emi')}
                  className={`px-4 py-2.5 text-xs font-semibold transition-all flex items-center gap-2 border-b-2 ${
                    activeTab === 'emi'
                      ? 'border-slate-900 text-slate-950'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Calculator className="w-4 h-4 text-amber-600" />
                  <span>EMI Calculator</span>
                </button>

                <button
                  onClick={() => setActiveTab('documents')}
                  className={`px-4 py-2.5 text-xs font-semibold transition-all flex items-center gap-2 border-b-2 ${
                    activeTab === 'documents'
                      ? 'border-slate-900 text-slate-950'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <CheckSquare className="w-4 h-4 text-emerald-700" />
                  <span>Document Checklist</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                <span>Active Context: <strong>{selectedCategory}</strong></span>
              </div>
            </div>

            {/* Workspace View Selection */}
            {activeTab === 'chat' && (
              <ChatAssistant
                language={language}
                businessCategory={selectedCategory}
                consentGiven={consentGiven}
                onOpenHandoffModal={() => setIsHandoffOpen(true)}
                onOpenEMICalculator={handleOpenEMICalculator}
                onOpenChecklist={() => setActiveTab('documents')}
                onSelectProduct={(productId) => {
                  setActiveTab('catalogue');
                }}
              />
            )}

            {activeTab === 'catalogue' && (
              <ProductCatalogue
                onAskAboutProduct={handleAskAboutProduct}
                onCalculateEMIForProduct={handleCalculateEMIForProduct}
                language={language}
                selectedBusinessCategory={selectedCategory}
              />
            )}

            {activeTab === 'emi' && (
              <EMICalculator
                initialAmount={emiAmount}
                initialTenure={emiTenure}
                initialProduct={selectedProductForEmi}
                language={language}
                onSendToChat={handleSendToChatFromEMI}
              />
            )}

            {activeTab === 'documents' && (
              <DocumentChecklist
                language={language}
                selectedCategory={selectedCategory}
                onOpenTelegram={() => setIsTelegramOpen(true)}
                onAskAIAboutDocs={handleAskAIAboutDocs}
              />
            )}
          </>
        )}
      </main>

      {/* Global Modals */}
      <HandoffModal
        isOpen={isHandoffOpen}
        onClose={() => setIsHandoffOpen(false)}
        language={language}
        defaultCategory={selectedCategory}
      />

      <TelegramModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
        language={language}
      />

      {/* Footer */}
      <Footer
        language={language}
        onOpenTelegram={() => setIsTelegramOpen(true)}
        onOpenStaff={() => setActiveTab('staff')}
      />
    </div>
  );
}
