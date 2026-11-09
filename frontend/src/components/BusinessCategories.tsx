import React from 'react';
import { ShoppingBag, Scissors, Wrench, Building2, Check } from 'lucide-react';
import type { BusinessCategory, Language } from '../types/index.ts';

interface BusinessCategoriesProps {
  selectedCategory: BusinessCategory | null;
  onSelectCategory: (category: BusinessCategory) => void;
  language: Language;
}

const CATEGORIES: {
  id: BusinessCategory;
  titleEn: string;
  titleHi: string;
  subtitleEn: string;
  subtitleHi: string;
  image: string;
  typicalLoan: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'Kirana & Retail',
    titleEn: 'Kirana & Retail',
    titleHi: 'किराना एवं रिटेल दुकान',
    subtitleEn: 'Grocery stores, supermarkets, FMCG retail, apparel shops',
    subtitleHi: 'किराना दुकान, सुपरमार्केट, खुदरा व्यापारी, परिधान स्टोर',
    image: '/src/assets/images/kirana_retail_business_1794116058101.jpg',
    typicalLoan: '₹1L – ₹15L (Working Capital)',
    icon: ShoppingBag
  },
  {
    id: 'Textiles & Manufacturing',
    titleEn: 'Textiles & Manufacturing',
    titleHi: 'टेक्सटाइल एवं निर्माण',
    subtitleEn: 'Garment manufacturing, embroidery units, printing, packaging',
    subtitleHi: 'कपड़ा सिलाई इकाइयां, कढ़ाई, पैकेजिंग, लघु विनिर्माण',
    image: '/src/assets/images/textile_manufacturing_sme_1794116059537.jpg',
    typicalLoan: '₹2L – ₹50L (Machinery & Stock)',
    icon: Scissors
  },
  {
    id: 'Services & Repair',
    titleEn: 'Services & Repair',
    titleHi: 'सर्विस एवं रिपेयर वर्कशॉप',
    subtitleEn: 'Electronics repair, auto workshops, plumbing, technicians',
    subtitleHi: 'इलेक्ट्रॉनिक रिपेयर, ऑटोमोबाइल गैराज, उपकरण मरम्मत',
    image: '/src/assets/images/services_repair_workshop_1794116060061.jpg',
    typicalLoan: '₹50K – ₹10L (Mudra Kishore)',
    icon: Wrench
  },
  {
    id: 'Other Business',
    titleEn: 'Other Enterprise',
    titleHi: 'अन्य व्यवसाय / उद्यम',
    subtitleEn: 'Logistics, wholesale trading, professional consultants, food ventures',
    subtitleHi: 'होलसेल व्यापार, लॉजिस्टिक्स, कैटरिंग, अन्य लघु उद्यम',
    image: '/src/assets/images/primecapital_hero_banner_1794116058111.jpg',
    typicalLoan: '₹1L – ₹1Cr (Composite Loan)',
    icon: Building2
  }
];

export const BusinessCategories: React.FC<BusinessCategoriesProps> = ({
  selectedCategory,
  onSelectCategory,
  language
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-900 tracking-tight">
            {language === 'hi' ? 'अपना व्यवसाय वर्ग चुनें' : 'Select Your Business Category'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'hi'
              ? 'आपके बिज़नेस के अनुसार AI उपयुक्त लोन स्कीम्स और पात्रता निर्धारित करेगा'
              : 'Personalizes loan schemes, document checklists, and interest rates'}
          </p>
        </div>
        {selectedCategory && (
          <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            Active: {selectedCategory}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`group text-left rounded-xl overflow-hidden border transition-all relative flex flex-col justify-between bg-white ${
                isSelected
                  ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Image banner with overlay */}
              <div className="relative h-24 w-full overflow-hidden bg-slate-100">
                <img
                  src={cat.image}
                  alt={cat.titleEn}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent" />
                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between">
                  <span className="text-white text-xs font-semibold drop-shadow-xs flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'hi' ? cat.titleHi : cat.titleEn}</span>
                  </span>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Text content */}
              <div className="p-2.5 flex-1 flex flex-col justify-between text-xs">
                <p className="text-slate-600 line-clamp-2 leading-relaxed">
                  {language === 'hi' ? cat.subtitleHi : cat.subtitleEn}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Typical:</span>
                  <span className="font-mono text-slate-700 font-medium tabular-nums">{cat.typicalLoan}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
