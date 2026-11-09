import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Trash2,
  PhoneCall,
  Sparkles,
  Volume2,
  Square,
  ArrowRight,
  Calculator,
  FileText,
  CheckCircle2,
  Info,
  ShieldAlert
} from 'lucide-react';
import { VoiceMicButton } from './VoiceMicButton.tsx';
import { speakText, stopSpeaking } from '../services/speechService.ts';
import { sendChatMessage, getSessionId } from '../services/api.ts';
import type { ChatMessage, Language, BusinessCategory } from '../types/index.ts';

interface ChatAssistantProps {
  language: Language;
  businessCategory: BusinessCategory | null;
  consentGiven: boolean;
  onOpenHandoffModal: () => void;
  onOpenEMICalculator: (amount?: number, tenure?: number) => void;
  onOpenChecklist: () => void;
  onSelectProduct: (productId: string) => void;
}

const DEFAULT_SUGGESTIONS: Record<Language, string[]> = {
  en: [
    'I own a Kirana shop and need a business loan',
    'Calculate EMI for ₹2 Lakh over 24 months',
    'What documents are required for Mudra loan?',
    'What is the interest rate for machinery loan?',
    'I want to speak with a loan representative'
  ],
  hi: [
    'मेरी किराना दुकान है और मुझे बिज़नेस लोन चाहिए',
    '₹2 लाख पर 24 महीने के लिए EMI कितनी होगी?',
    'मुद्रा लोन के लिए कौन से कागज़ात चाहिए?',
    'मशीनरी लोन पर ब्याज दर क्या है?',
    'मुझे लोन अधिकारी से बात करनी है'
  ],
  hinglish: [
    'Kirana shop ke liye working capital loan chahiye',
    'Calculate EMI for ₹3 Lakh over 36 months',
    'Mudra loan ke liye required documents kya hain?',
    'Garment factory ke liye machinery loan options',
    'Loan representative se call arrange kijiye'
  ]
};

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  language,
  businessCategory,
  consentGiven,
  onOpenHandoffModal,
  onOpenEMICalculator,
  onOpenChecklist,
  onSelectProduct
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = getSessionId();

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeText =
        language === 'hi'
          ? `नमस्ते! मैं प्राइमकैपिटल AI लोन सहायक हूँ। मैं भारतीय लघु व्यापारियों और दुकानदारों को लोन स्कीम समझने, ब्याज दरों की तुलना करने, आवश्यक दस्तावेज़ चेक करने और EMI की गणना करने में मदद करता हूँ। आप मुझसे बोलकर या लिखकर बात कर सकते हैं!`
          : language === 'hinglish'
          ? `Namaste! Main PrimeCapital AI loan assistant hoon. Kirana, retail, textile ya workshop business ke liye loan schemes, documents checklist, aur EMI calculations me aapki help kar sakta hoon. Aap voice mic use karke ya text type karke pooch sakte hain!`
          : `Namaste and welcome to PrimeCapital AI! I am your voice-first business loan enquiry assistant designed for Indian MSMEs. How can I help your enterprise today with loan options, interest rates, or EMI estimates?`;

      const initialMessage: ChatMessage = {
        id: 'welcome-1',
        sender: 'assistant',
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: DEFAULT_SUGGESTIONS[language],
        workflowState: 'general'
      };

      setMessages([initialMessage]);
    }
  }, [language]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    if (!consentGiven) {
      setErrorMessage(
        language === 'hi'
          ? 'कृपया जारी रखने के लिए ऊपर दी गई सांकेतिक प्रदर्शन सहमति को स्वीकार करें।'
          : 'Please acknowledge the synthetic demonstration consent notice to proceed.'
      );
      return;
    }

    setErrorMessage(null);
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const data = await sendChatMessage({
        sessionId,
        message: text,
        language,
        consent: consentGiven,
        businessCategory: businessCategory || undefined
      });

      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        text: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        workflowState: data.workflow_state,
        suggestedActions: data.suggested_actions,
        loanMatch: data.loan_match,
        emiPreview: data.emi_preview,
        isHandoff: data.handoff_recommended
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Voice readout if enabled
      if (voiceRepliesEnabled && data.response) {
        setIsSpeaking(true);
        speakText(data.response, language, () => {
          setIsSpeaking(false);
        });
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const fallbackMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text:
          language === 'hi'
            ? 'क्षमा करें, नेटवर्क में अस्थायी बाधा आई है। कृपया पुनः प्रयास करें या हमारे प्रतिनिधि से संपर्क करें।'
            : 'We encountered a momentary connection issue. Please retry or connect with our loan desk.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: ['Try again', 'Speak to Loan Specialist']
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    stopSpeaking();
    setIsSpeaking(false);
    setMessages([]);
    // Trigger reset with initial welcome
    setTimeout(() => {
      const resetMsg: ChatMessage = {
        id: `welcome_${Date.now()}`,
        sender: 'assistant',
        text:
          language === 'hi'
            ? 'चैट रीसेट कर दी गई है। आप किस तरह के लोन के बारे में जानना चाहते हैं?'
            : 'Conversation cleared. How can I assist your business loan enquiry today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: DEFAULT_SUGGESTIONS[language]
      };
      setMessages([resetMsg]);
    }, 100);
  };

  const handleStopSpeech = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[680px] overflow-hidden">
      {/* Chat Header Bar */}
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-slate-900 text-sm">
                Evon v3.3 Loan Intelligence
              </h3>
              <span className="text-[11px] text-emerald-800 font-medium">Voice-First Assistant</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Tailored for Indian MSMEs</span>
              <span>·</span>
              <span>Context: {businessCategory || 'All Businesses'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking && (
            <button
              onClick={handleStopSpeech}
              className="px-2.5 py-1 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 flex items-center gap-1 font-medium transition-colors"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Audio</span>
            </button>
          )}

          <button
            onClick={onOpenHandoffModal}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors"
            title="Speak with a loan officer"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Speak to Human</span>
          </button>

          <button
            onClick={handleClearChat}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            title="Clear chat history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/30">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-3xl ${
                isUser ? 'ml-auto' : 'mr-auto'
              }`}
            >
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-2xl shadow-xs ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-xs'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Embedded Loan Match Card */}
                {msg.loanMatch && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{msg.loanMatch.productName}</span>
                      <span className="font-mono text-emerald-700 font-semibold">{msg.loanMatch.rate}</span>
                    </div>
                    <div className="text-slate-600">
                      Amount: <span className="font-mono font-medium">{msg.loanMatch.amountRange}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                      <button
                        onClick={() => onSelectProduct(msg.loanMatch!.productId)}
                        className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                      >
                        <span>View Product Terms</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => onOpenEMICalculator()}
                        className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
                      >
                        <Calculator className="w-3 h-3 text-slate-500" />
                        <span>Calculate EMI</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Embedded EMI Preview Card */}
                {msg.emiPreview && (
                  <div className="mt-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-slate-800 space-y-2">
                    <div className="flex items-center justify-between font-semibold text-emerald-950">
                      <span>Estimated Monthly EMI</span>
                      <span className="text-base font-mono font-bold tabular-nums text-emerald-900">
                        ₹{msg.emiPreview.monthlyEMI.toLocaleString('en-IN')} / mo
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-emerald-200/60">
                      <div>
                        Principal: <span className="font-mono tabular-nums font-medium text-slate-900">₹{msg.emiPreview.amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        Tenure: <span className="font-mono tabular-nums font-medium text-slate-900">{msg.emiPreview.tenureMonths} Months</span>
                      </div>
                      <div>
                        Indicative Rate: <span className="font-mono tabular-nums font-medium text-slate-900">{msg.emiPreview.rate}% p.a.</span>
                      </div>
                      <div>
                        Total Interest: <span className="font-mono tabular-nums font-medium text-slate-900">₹{msg.emiPreview.totalInterest.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-500 italic">
                        *Illustrative demonstration calculation
                      </span>
                      <button
                        onClick={() => onOpenEMICalculator(msg.emiPreview!.amount, msg.emiPreview!.tenureMonths)}
                        className="text-emerald-800 font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Open in Calculator</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Embedded Handoff recommendation */}
                {msg.isHandoff && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Dedicated SME Loan Executive assistance available.</span>
                    </div>
                    <button
                      onClick={onOpenHandoffModal}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 shrink-0 transition-colors"
                    >
                      Request Callback
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-1 text-[11px] text-slate-400">
                  <span className="font-mono tabular-nums">{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      onClick={() => speakText(msg.text, language)}
                      className="text-slate-400 hover:text-slate-700 flex items-center gap-1"
                      title="Read aloud"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Listen</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Suggested action chips under assistant responses */}
              {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-xl">
                  {msg.suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(action)}
                      className="px-2.5 py-1 text-xs bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors shadow-2xs font-medium text-left"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-2.5 w-fit shadow-xs animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            <span>Evon v3.3 analyzing loan parameters...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="px-5 py-2 bg-rose-50 border-t border-rose-200 text-xs text-rose-800 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-900 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Bottom Composer and Voice Controls */}
      <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 space-y-2.5">
        {/* Voice Microphone Control Strip */}
        <VoiceMicButton
          language={language}
          consentGiven={consentGiven}
          onSendTranscript={(transcript) => handleSendMessage(transcript)}
          voiceRepliesEnabled={voiceRepliesEnabled}
          onToggleVoiceReplies={setVoiceRepliesEnabled}
        />

        {/* Text Input Row */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              language === 'hi'
                ? 'अपने बिज़नेस लोन के बारे में यहाँ लिखें (उदा. किराना दुकान के लिए लोन)...'
                : language === 'hinglish'
                ? 'Apne loan query yahan likhiye (e.g., Kirana store ke liye 2 lakh loan)...'
                : 'Ask about loans, documents, rates, or type "Calculate EMI for ₹3 Lakh"...'
            }
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="h-10 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Helper Toolbar */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenEMICalculator()}
              className="hover:text-slate-900 flex items-center gap-1 font-medium transition-colors"
            >
              <Calculator className="w-3 h-3 text-slate-400" />
              <span>EMI Tool</span>
            </button>
            <span className="text-slate-300">·</span>
            <button
              onClick={onOpenChecklist}
              className="hover:text-slate-900 flex items-center gap-1 font-medium transition-colors"
            >
              <FileText className="w-3 h-3 text-slate-400" />
              <span>Document Checklist</span>
            </button>
          </div>
          <span className="text-slate-400 italic">Synthetic Demonstration · Evon v3.3</span>
        </div>
      </div>
    </div>
  );
};
