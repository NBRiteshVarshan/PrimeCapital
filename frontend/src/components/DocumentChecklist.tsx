import React, { useState } from 'react';
import { CheckSquare, Square, FileText, CheckCircle2, Send, Info, Download, Sparkles } from 'lucide-react';
import type { Language, BusinessCategory } from '../types/index.ts';

interface DocumentChecklistProps {
  language: Language;
  selectedCategory: BusinessCategory | null;
  onOpenTelegram: () => void;
  onAskAIAboutDocs: (docName: string) => void;
}

interface DocItem {
  id: string;
  nameEn: string;
  nameHi: string;
  category: 'identity' | 'business' | 'financial' | 'property';
  descriptionEn: string;
  descriptionHi: string;
  applicableTo: string;
  isMandatory: boolean;
}

const CHECKLIST_ITEMS: DocItem[] = [
  {
    id: 'doc_pan',
    nameEn: 'PAN Card (Borrower & Business Entity)',
    nameHi: 'पैन कार्ड (उद्यमी एवं बिज़नेस)',
    category: 'identity',
    descriptionEn: 'Required for tax identification, CIBIL credit scoring, and KYC validation.',
    descriptionHi: 'टैक्स पहचान, सिबिल क्रेडिट स्कोर और बैंक केवाईसी के लिए अनिवार्य।',
    applicableTo: 'All MSMEs',
    isMandatory: true
  },
  {
    id: 'doc_aadhaar',
    nameEn: 'Aadhaar Card / Voter ID / Passport',
    nameHi: 'आधार कार्ड / वोटर आईडी / पासपोर्ट',
    category: 'identity',
    descriptionEn: 'Identity and permanent address verification of primary proprietor or partners.',
    descriptionHi: 'प्रोपराइटर या पार्टनर्स की पहचान और निवास प्रमाण पत्र।',
    applicableTo: 'All MSMEs',
    isMandatory: true
  },
  {
    id: 'doc_udyam',
    nameEn: 'Udyam Registration Certificate',
    nameHi: 'उद्यम रजिस्ट्रेशन सर्टिफिकेट (MSME)',
    category: 'business',
    descriptionEn: 'Central Government MSME certification for priority sector lending benefits and interest subvention.',
    descriptionHi: 'प्राथमिकता प्राप्त क्षेत्र (PSL) के तहत रियायती दरों व सरकारी योजनाओं के लिए ज़रूरी।',
    applicableTo: 'All MSMEs',
    isMandatory: true
  },
  {
    id: 'doc_shop_act',
    nameEn: 'Shop & Establishment Act License / Municipal Trade License',
    nameHi: 'शॉप एंड एस्टैब्लिशमेंट लाइसेंस / गुमास्ता',
    category: 'business',
    descriptionEn: 'Proves physical operational existence of shop or service workshop for > 12 months.',
    descriptionHi: 'दुकान या वर्कशॉप के 12 महीने से अधिक समय से चालू रहने का आधिकारिक प्रमाण।',
    applicableTo: 'Kirana & Retail, Services & Repair',
    isMandatory: true
  },
  {
    id: 'doc_gst',
    nameEn: 'GST Registration Certificate & GSTR-3B Returns',
    nameHi: 'जीएसटी रजिस्ट्रेशन एवं रिटर्न (यदि लागू हो)',
    category: 'business',
    descriptionEn: 'Mandatory for loans above ₹10 Lakh or businesses with turnover exceeding statutory threshold.',
    descriptionHi: '₹10 लाख से ऊपर के लोन अथवा जीएसटी सीमा से अधिक टर्नओवर वाले व्यापारों के लिए।',
    applicableTo: 'Textiles & Manufacturing, Retail > ₹40L',
    isMandatory: false
  },
  {
    id: 'doc_bank_statements',
    nameEn: 'Last 6 to 12 Months Current/Savings Bank Statement',
    nameHi: 'पिछले 6 से 12 महीने का बैंक स्टेटमेंट',
    category: 'financial',
    descriptionEn: 'Verified via account aggregator or PDF statement with digital bank seal showing regular sales credits.',
    descriptionHi: 'दैनिक बिक्री और यूपीआई भुगतानों के बैंक में जमा होने का प्राथमिक वित्तीय प्रमाण।',
    applicableTo: 'All MSMEs',
    isMandatory: true
  },
  {
    id: 'doc_itr',
    nameEn: 'Income Tax Returns (ITR) with Computation of Income',
    nameHi: 'पिछले 2 वर्षों का इनकम टैक्स रिटर्न (ITR)',
    category: 'financial',
    descriptionEn: 'Last 2 financial years with acknowledgment copy for loans above ₹5 Lakh.',
    descriptionHi: '₹5 लाख से अधिक के लोन के लिए पिछले दो वर्षों की टैक्स फाइलिंग।',
    applicableTo: 'Loans > ₹5 Lakhs',
    isMandatory: false
  },
  {
    id: 'doc_machinery_quote',
    nameEn: 'Vendor Pro-Forma Invoice / Equipment Quotation',
    nameHi: 'मशीनरी कोटेशन / प्रो-फार्मा इनवॉइस',
    category: 'property',
    descriptionEn: 'Required for machinery term loans or equipment upgrade (from authorized vendor).',
    descriptionHi: 'सिलाई मशीन, प्रिंटिंग या रिपेयर टूल्स खरीदने के लिए अधिकृत डीलर का कोटेशन।',
    applicableTo: 'Textiles & Manufacturing, Services',
    isMandatory: false
  },
  {
    id: 'doc_electricity',
    nameEn: 'Latest Business Premises Electricity Bill / Rent Lease',
    nameHi: 'व्यावसायिक परिसर का बिजली बिल / रेंट एग्रीमेंट',
    category: 'property',
    descriptionEn: 'Verification of business location, utility connection, and operational status.',
    descriptionHi: 'दुकान या कारखाने के पते व बिजली कनेक्शन की पुष्टि हेतु।',
    applicableTo: 'All MSMEs',
    isMandatory: true
  }
];

export const DocumentChecklist: React.FC<DocumentChecklistProps> = ({
  language,
  selectedCategory,
  onOpenTelegram,
  onAskAIAboutDocs
}) => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    new Set(['doc_pan', 'doc_aadhaar'])
  );
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'mandatory' | 'optional'>('all');

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredItems = CHECKLIST_ITEMS.filter((item) => {
    if (selectedFilter === 'mandatory') return item.isMandatory;
    if (selectedFilter === 'optional') return !item.isMandatory;
    return true;
  });

  const progressCount = checkedIds.size;
  const totalCount = CHECKLIST_ITEMS.length;
  const progressPercent = Math.round((progressCount / totalCount) * 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6">
      {/* Title & Progress Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">
            {language === 'hi' ? 'दस्तावेज़ चेकलिस्ट (Document Checklist)' : 'Loan Documentation Checklist'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Informational checklist for Indian small business credit readiness
          </p>
        </div>

        {/* Progress KPI Card */}
        <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">Readiness</span>
            <span className="font-mono font-bold text-xs text-slate-900 tabular-nums">
              {progressCount} of {totalCount} Ready ({progressPercent}%)
            </span>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-emerald-600 flex items-center justify-center font-mono font-bold text-xs text-emerald-800 tabular-nums">
            {progressPercent}%
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedFilter === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            All Documents ({totalCount})
          </button>
          <button
            onClick={() => setSelectedFilter('mandatory')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedFilter === 'mandatory'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Mandatory Only (5)
          </button>
          <button
            onClick={() => setSelectedFilter('optional')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedFilter === 'optional'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Scheme Specific (4)
          </button>
        </div>

        <button
          onClick={() => {
            const summary = Array.from(checkedIds)
              .map((id) => CHECKLIST_ITEMS.find((c) => c.id === id)?.nameEn)
              .filter(Boolean)
              .join(', ');
            alert(`Ready documents noted: ${summary || 'None selected yet'}`);
          }}
          className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 underline"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save Checklist</span>
        </button>
      </div>

      {/* Items list */}
      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
        {filteredItems.map((item) => {
          const isChecked = checkedIds.has(item.id);

          return (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`p-4 transition-colors cursor-pointer flex items-start gap-3.5 ${
                isChecked ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'bg-white hover:bg-slate-50'
              }`}
            >
              <button
                type="button"
                className="mt-0.5 text-slate-400 hover:text-emerald-700 transition-colors shrink-0"
              >
                {isChecked ? (
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300" />
                )}
              </button>

              <div className="flex-1 space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span
                    className={`font-semibold text-sm ${
                      isChecked ? 'text-slate-900 line-through decoration-slate-300' : 'text-slate-900'
                    }`}
                  >
                    {language === 'hi' ? item.nameHi : item.nameEn}
                  </span>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-400">{item.applicableTo}</span>
                    <span className="text-slate-300">·</span>
                    <span
                      className={`font-medium ${
                        item.isMandatory ? 'text-amber-800 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {item.isMandatory ? 'Required' : 'Optional'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {language === 'hi' ? item.descriptionHi : item.descriptionEn}
                </p>

                <div className="pt-1 flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAskAIAboutDocs(item.nameEn);
                    }}
                    className="text-[11px] text-emerald-800 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Ask AI why this is needed</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Telegram Document Verification Notice */}
      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-sky-900 block">
              Document Scanning & Verification is Available via Telegram Bot
            </span>
            <p className="text-sky-800 mt-0.5 text-xs leading-relaxed">
              For security and privacy, web uploads are not enabled. You can submit PAN or GST photos securely through our official Telegram Assistant (@PrimeCapital_Assistant_Bot) after reviewing explicit /docconsent.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenTelegram}
          className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-semibold text-xs whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Open Telegram Bot</span>
        </button>
      </div>
    </div>
  );
};
