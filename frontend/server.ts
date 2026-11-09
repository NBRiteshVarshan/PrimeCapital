import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type { LoanProduct, StaffEnquiry, StaffLead, StaffDocument, AuditEvent, BusinessCategory } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory data store for PrimeCapital synthetic demonstration
const PRODUCTS: LoanProduct[] = [
  {
    id: 'sbi_sme_pratham',
    name: 'SBI SME Pratham (Demonstration)',
    schemeCode: 'SBI-SME-PRATHAM-01',
    category: 'Kirana & Retail / General SME',
    interestRateMin: 9.65,
    interestRateMax: 11.25,
    minAmount: 100000,
    maxAmount: 2000000,
    minTenureMonths: 12,
    maxTenureMonths: 60,
    processingFeePercent: 0.5,
    processingFeeNotes: '0.50% of loan amount + applicable GST (Min ₹1,000)',
    collateralRequirement: 'Nil up to ₹10 Lakhs under CGTMSE coverage; hypothecation of business assets above ₹10 Lakhs',
    targetBusiness: 'Kirana shops, retail merchandise, FMCG distributors, local trading outlets',
    eligibilityCriteria: [
      'Business operational for at least 12 months in the same location',
      'Valid Udyam registration / Shop & Establishment Certificate',
      'Average monthly digital or bank credits of at least ₹50,000',
      'Minimum applicant age 21 years; maximum 65 years at maturity'
    ],
    keyDocuments: [
      'Identity & Address Proof (Aadhaar / Voter ID)',
      'PAN Card of Borrower and Business',
      'Shop & Establishment License / Udyam Certificate',
      'Last 6 months Current / Savings Bank account statements',
      'Latest electricity bill of business premises'
    ],
    summary: 'Tailored for small shopkeepers and retail merchants looking for fast working capital or inventory stocking with minimal paperwork.',
    disclaimerNote: 'Synthetic demonstration product. Not an official State Bank of India lending offer.',
    badge: 'Popular for Kirana'
  },
  {
    id: 'sbi_mudra_kishore',
    name: 'SBI Mudra Kishore (Demonstration)',
    schemeCode: 'PMMY-SBI-KISHORE-02',
    category: 'Micro Enterprises (PMMY)',
    interestRateMin: 9.85,
    interestRateMax: 10.95,
    minAmount: 50000,
    maxAmount: 500000,
    minTenureMonths: 12,
    maxTenureMonths: 36,
    processingFeePercent: 0.0,
    processingFeeNotes: 'Nil processing fee under Pradhan Mantri Mudra Yojana guidelines',
    collateralRequirement: 'Zero collateral required. 100% covered under Mudra Credit Guarantee',
    targetBusiness: 'Kirana, tailoring units, repair workshops, fruit/vegetable vendors, micro-service units',
    eligibilityCriteria: [
      'Micro enterprises in manufacturing, trading, or service sectors',
      'No past defaults with any Scheduled Commercial Bank or NBFC',
      'Applicant should have business viability plan and verified business premises'
    ],
    keyDocuments: [
      'Identity and Address Proof (Aadhaar / Passport / Voter ID)',
      'PAN Card',
      'Proof of business address (rent agreement / tax receipt)',
      'Quotation of machinery / equipment / stock to be purchased',
      'Past 6 months bank statement'
    ],
    summary: 'Government-supported credit facility for micro units seeking expansion up to ₹5 Lakh without any collateral.',
    disclaimerNote: 'Synthetic demonstration product. Not an official State Bank of India lending offer.',
    badge: 'Zero Collateral'
  },
  {
    id: 'sbi_mudra_tarun',
    name: 'SBI Mudra Tarun (Demonstration)',
    schemeCode: 'PMMY-SBI-TARUN-03',
    category: 'Expanding Small Enterprise',
    interestRateMin: 10.25,
    interestRateMax: 11.75,
    minAmount: 500000,
    maxAmount: 1000000,
    minTenureMonths: 12,
    maxTenureMonths: 60,
    processingFeePercent: 0.5,
    processingFeeNotes: '0.50% + GST on sanctioned amount',
    collateralRequirement: 'Zero collateral. Covered under National Credit Guarantee Trustee Company (NCGTC)',
    targetBusiness: 'Textile manufacturing, food processing, precision auto repair, wholesale traders',
    eligibilityCriteria: [
      'Established business operating for at least 24 months',
      'GST registration where turnover exceeds threshold or required by law',
      'Profitable track record with positive cash flow'
    ],
    keyDocuments: [
      'PAN, Aadhaar of all promoters / partners',
      'Udyam Registration Certificate',
      'Past 12 months bank statements',
      'Last 2 years Income Tax Returns with Computation of Income',
      'GST returns for last 4 quarters (if registered)'
    ],
    summary: 'Designed for established small units expanding operations, adding product lines, or upgrading commercial premises.',
    disclaimerNote: 'Synthetic demonstration product. Not an official State Bank of India lending offer.'
  },
  {
    id: 'sbi_machinery_term_loan',
    name: 'SBI Machinery & Equipment Term Loan (Demonstration)',
    schemeCode: 'SBI-CAPEX-MACH-04',
    category: 'Textiles, Manufacturing & Repair',
    interestRateMin: 9.4,
    interestRateMax: 11.1,
    minAmount: 200000,
    maxAmount: 5000000,
    minTenureMonths: 24,
    maxTenureMonths: 84,
    processingFeePercent: 0.75,
    processingFeeNotes: '0.75% of loan amount + GST (Min ₹2,500)',
    collateralRequirement: 'Primary charge on machinery/equipment financed; collateral needed above ₹25 Lakhs',
    targetBusiness: 'Garment manufacturers, CNC/lathe workshops, printing presses, packaging units, auto service centers',
    eligibilityCriteria: [
      'At least 2 years in related trade or manufacturing activity',
      'Minimum promoter margin of 15% to 25% of machinery invoice value',
      'Vendor pro-forma invoice from recognized equipment manufacturer'
    ],
    keyDocuments: [
      'Pro-forma invoice / quotation from authorized machinery vendor',
      'Udyam Registration and Factory/Shop License',
      'Past 12 months current account bank statements',
      'Past 2 years audited/provisional financial statements and ITR',
      'Proof of power connection / commercial premises lease'
    ],
    summary: 'High-tenure term financing to acquire specialized industrial machinery, sewing stations, diagnostic tools, or workshop upgrades.',
    disclaimerNote: 'Synthetic demonstration product. Not an official State Bank of India lending offer.',
    badge: 'Term Financing'
  },
  {
    id: 'sbi_working_capital_express',
    name: 'SBI Working Capital Express (Demonstration)',
    schemeCode: 'SBI-WC-EXPRESS-05',
    category: 'Services, Retail & Wholesale',
    interestRateMin: 9.9,
    interestRateMax: 11.5,
    minAmount: 100000,
    maxAmount: 2500000,
    minTenureMonths: 12,
    maxTenureMonths: 36,
    processingFeePercent: 0.35,
    processingFeeNotes: '0.35% + GST (Annual renewal at 0.25%)',
    collateralRequirement: 'Hypothecation of paid-up stocks and book debts',
    targetBusiness: 'Electrical contractors, HVAC repair services, logistics brokers, pharma retailers, consumer service hubs',
    eligibilityCriteria: [
      'Minimum annual turnover of ₹15 Lakhs verified through bank credits/GST',
      'Satisfactory CIBIL Commercial / Personal score (≥ 680 preferred)',
      'Account operational with any scheduled commercial bank for at least 1 year'
    ],
    keyDocuments: [
      'GST Returns (GSTR-3B / GSTR-1) for past 12 months',
      'Bank statements of all operational accounts for past 12 months',
      'Business KYC and Partnership Deed / MOA (if non-proprietorship)',
      'Stock and debtor statement'
    ],
    summary: 'Revolving Cash Credit / Overdraft facility that syncs with your daily UPI and customer receipts for flexible working capital.',
    disclaimerNote: 'Synthetic demonstration product. Not an official State Bank of India lending offer.'
  },
  {
    id: 'sbi_standup_india',
    name: 'SBI Stand-Up India Facility (Demonstration)',
    schemeCode: 'SBI-STANDUP-06',
    category: 'Greenfield Enterprise',
    interestRateMin: 8.95,
    interestRateMax: 10.5,
    minAmount: 1000000,
    maxAmount: 10000000,
    minTenureMonths: 36,
    maxTenureMonths: 84,
    processingFeePercent: 0.5,
    processingFeeNotes: '0.50% + GST',
    collateralRequirement: 'Covered under Credit Guarantee Scheme for Stand Up India (CGFSI)',
    targetBusiness: 'SC/ST and Women entrepreneurs setting up greenfield manufacturing, services, or agri-allied trading',
    eligibilityCriteria: [
      'Enterprise must be a greenfield project (first-time venture)',
      'In case of non-individual enterprise, at least 51% shareholding held by SC/ST or Woman entrepreneur',
      'Borrower should not be in default to any bank/financial institution'
    ],
    keyDocuments: [
      'Detailed Project Report (DPR) with cash flow projections',
      'Category certificate (for SC/ST) or Proof of Women-led enterprise',
      'Udyam Registration and Incorporation documents',
      'Bank statements of promoters for past 12 months'
    ],
    summary: 'Flagship national initiative providing composite loans (term loan + working capital) for new ventures led by women or SC/ST founders.',
    disclaimerNote: 'Synthetic demonstration product. Not an official State Bank of India lending offer.',
    badge: 'Women & SC/ST'
  }
];

let staffEnquiries: StaffEnquiry[] = [
  {
    id: 'ENQ-8091',
    ticketNumber: 'PC-2026-8091',
    businessName: 'Ganesh Kirana & Provisions',
    contactPerson: 'Ramesh Patel',
    phone: '+91 98201 44321',
    category: 'Kirana & Retail',
    requestedAmount: 300000,
    preferredProduct: 'SBI SME Pratham (Demonstration)',
    language: 'hinglish',
    status: 'new',
    notes: 'Inquired about inventory stocking loan ahead of festival season. Wants no-collateral option.',
    createdAt: '2026-11-06T14:20:00Z',
    updatedAt: '2026-11-06T14:20:00Z'
  },
  {
    id: 'ENQ-8088',
    ticketNumber: 'PC-2026-8088',
    businessName: 'Saraswati Garments & Embroidery',
    contactPerson: 'Sunita Sharma',
    phone: '+91 94140 88219',
    category: 'Textiles & Manufacturing',
    requestedAmount: 850000,
    preferredProduct: 'SBI Machinery & Equipment Term Loan (Demonstration)',
    language: 'hi',
    status: 'assigned',
    assignedTo: 'Vikram Joshi (SME Officer)',
    notes: 'Purchasing 4 industrial sewing machines. Vendor quotation received. Requested Hindi phone consultation.',
    createdAt: '2026-11-05T10:15:00Z',
    updatedAt: '2026-11-06T09:30:00Z'
  },
  {
    id: 'ENQ-8072',
    ticketNumber: 'PC-2026-8072',
    businessName: 'QuickFix Auto Electricals',
    contactPerson: 'Mohammad Ansari',
    phone: '+91 98920 11984',
    category: 'Services & Repair',
    requestedAmount: 200000,
    preferredProduct: 'SBI Mudra Kishore (Demonstration)',
    language: 'en',
    status: 'contacted',
    assignedTo: 'Ananya Roy (Relationship Mgr)',
    notes: 'Diagnostic scanning device purchase. Mudra documentation checklist reviewed.',
    createdAt: '2026-11-04T16:45:00Z',
    updatedAt: '2026-11-06T11:00:00Z'
  }
];

let staffLeads: StaffLead[] = [
  {
    id: 'LEAD-101',
    name: 'Ganesh Kirana & Provisions',
    phone: '+91 98201 44321',
    businessType: 'Kirana & Retail',
    turnoverRange: '₹35L - ₹50L/year',
    leadScore: 88,
    source: 'web_chat',
    status: 'qualified',
    notes: 'High digital UPI volume on PhonePe/Paytm. Looking for fast sanction.',
    createdAt: '2026-11-06T14:22:00Z'
  },
  {
    id: 'LEAD-102',
    name: 'Saraswati Garments',
    phone: '+91 94140 88219',
    businessType: 'Textiles & Manufacturing',
    turnoverRange: '₹60L - ₹1Cr/year',
    leadScore: 92,
    source: 'telegram_bot',
    status: 'lead',
    notes: 'GST registered for 3 years. Looking to expand workshop floor.',
    createdAt: '2026-11-05T10:18:00Z'
  },
  {
    id: 'LEAD-103',
    name: 'Apex Precision Tools',
    phone: '+91 97110 55432',
    businessType: 'Services & Repair',
    turnoverRange: '₹20L - ₹30L/year',
    leadScore: 74,
    source: 'voice_assistant',
    status: 'lead',
    notes: 'Spoke via voice assistant in Hinglish. Seeks ₹4L Mudra Kishore.',
    createdAt: '2026-11-06T18:05:00Z'
  }
];

let staffDocuments: StaffDocument[] = [
  {
    id: 'DOC-501',
    ticketNumber: 'PC-2026-8091',
    documentType: 'PAN Card',
    maskedIdentifier: 'ABCDE****F',
    extractedName: 'RAMESH PATEL',
    ocrConfidence: 96,
    source: 'Telegram Bot',
    storageStatus: 'encrypted_vault',
    verificationStatus: 'pending',
    reviewerNotes: 'Uploaded via /docconsent workflow. Clean scan with visible header.',
    uploadedAt: '2026-11-06T14:25:00Z'
  },
  {
    id: 'DOC-502',
    ticketNumber: 'PC-2026-8088',
    documentType: 'GST Certificate',
    maskedIdentifier: '27AAACG****1ZV',
    extractedName: 'SARASWATI GARMENTS ENTERPRISE',
    ocrConfidence: 94,
    source: 'Telegram Bot',
    storageStatus: 'encrypted_vault',
    verificationStatus: 'accepted',
    reviewerNotes: 'Verified against Maharashtra GST portal format. Valid active state.',
    uploadedAt: '2026-11-05T10:30:00Z',
    reviewedAt: '2026-11-06T09:40:00Z'
  },
  {
    id: 'DOC-503',
    ticketNumber: 'PC-2026-8072',
    documentType: 'Udyam Certificate',
    maskedIdentifier: 'UDYAM-MH-****-0918',
    extractedName: 'QUICKFIX AUTO SERVICES',
    ocrConfidence: 91,
    source: 'Staff Intake',
    storageStatus: 'encrypted_vault',
    verificationStatus: 'accepted',
    reviewerNotes: 'Micro enterprise classification verified.',
    uploadedAt: '2026-11-04T17:00:00Z',
    reviewedAt: '2026-11-05T11:20:00Z'
  }
];

let auditLog: AuditEvent[] = [
  {
    id: 'AUD-301',
    action: 'DOC_REVIEW_ACCEPT',
    entity: 'StaffDocument',
    entityId: 'DOC-502',
    actor: 'vikram.joshi@primecapital.internal',
    details: 'GST Certificate verified and marked accepted. Retained in private vault.',
    timestamp: '2026-11-06T09:40:15Z'
  },
  {
    id: 'AUD-302',
    action: 'ENQUIRY_ASSIGNED',
    entity: 'StaffEnquiry',
    entityId: 'ENQ-8088',
    actor: 'system_router',
    details: 'Assigned to SME Officer Vikram Joshi based on Textile & Manufacturing domain.',
    timestamp: '2026-11-05T10:20:00Z'
  },
  {
    id: 'AUD-303',
    action: 'HANDOFF_CREATED',
    entity: 'StaffEnquiry',
    entityId: 'ENQ-8091',
    actor: 'web_assistant_evon',
    details: 'Handoff requested by user for Kirana inventory credit line.',
    timestamp: '2026-11-06T14:20:00Z'
  }
];

// Helper: Deterministic EMI calculation
function calculateEMI(principal: number, annualRate: number, tenureMonths: number) {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) {
    const emi = principal / tenureMonths;
    return {
      monthlyEMI: Math.round(emi),
      totalInterest: 0,
      totalPayment: Math.round(principal)
    };
  }
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - principal;

  return {
    monthlyEMI: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(totalPayment)
  };
}

// Format INR currency
function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
}

// Deterministic conversation generator matching Evon v3.3 persona
function generateEvonResponse(
  message: string,
  language: string,
  category?: string
): { response: string; workflowState: any; suggestedActions: string[]; loanMatch?: any; emiPreview?: any; handoffRecommended?: boolean } {
  const lower = message.toLowerCase();

  // Check for Human Handoff
  if (lower.includes('human') || lower.includes('executive') || lower.includes('speak') || lower.includes('agent') || lower.includes('officer') || lower.includes('बात करनी है') || lower.includes('call me')) {
    if (language === 'hi') {
      return {
        response: 'नमस्ते! मैं तुरंत आपकी बात हमारे प्राइमकैपिटल बिज़नेस लोन विशेषज्ञ से करवा सकता हूँ। कृपया नीचे दिए गए "लोन प्रतिनिधि से बात करें" बटन पर क्लिक करके अपना नाम और संपर्क नंबर साझा करें। हमारी टीम 24 घंटे में आपसे संपर्क करेगी।',
        workflowState: 'handoff',
        suggestedActions: ['लोन प्रतिनिधि से बात करें', 'दस्तावेज़ सूची देखें', 'अन्य लोन विकल्प'],
        handoffRecommended: true
      };
    }
    if (language === 'hinglish') {
      return {
        response: 'Namaste! Main aapko humare PrimeCapital loan executive se connect kar deta hoon. Niche diye gaye button par click karke apna details share kijiye. Hamare representative aapko guidance provide karenge.',
        workflowState: 'handoff',
        suggestedActions: ['Speak with Loan Officer', 'View Document Checklist', 'Calculate EMI'],
        handoffRecommended: true
      };
    }
    return {
      response: 'I would be happy to connect you with a PrimeCapital SME Loan Specialist. Please click the button below to provide your contact details, and our dedicated relationship manager will reach out within 24 business hours.',
      workflowState: 'handoff',
      suggestedActions: ['Connect with Loan Officer', 'Check Eligibility Criteria', 'Explore Loan Catalogue'],
      handoffRecommended: true
    };
  }

  // Check for EMI query
  const emiMatch = lower.match(/(\d+)\s*(lakh|lac|k|lakhs)?/);
  const tenureMatch = lower.match(/(\d+)\s*(months|month|sal|saal|year|years|mahina)/);
  if (lower.includes('emi') || lower.includes('calculate') || lower.includes('kist') || lower.includes('किस्त') || lower.includes('ईएमआई')) {
    let amount = 200000;
    let tenure = 24;
    let rate = 9.85;

    if (emiMatch) {
      const num = parseInt(emiMatch[1], 10);
      if (lower.includes('lakh') || lower.includes('lac')) {
        amount = num * 100000;
      } else if (lower.includes('k')) {
        amount = num * 1000;
      } else if (num >= 10000) {
        amount = num;
      } else if (num <= 50) {
        amount = num * 100000;
      }
    }

    if (tenureMatch) {
      const t = parseInt(tenureMatch[1], 10);
      if (lower.includes('year') || lower.includes('saal') || lower.includes('sal')) {
        tenure = t * 12;
      } else {
        tenure = t;
      }
    }

    const { monthlyEMI, totalInterest, totalPayment } = calculateEMI(amount, rate, tenure);

    const emiPreview = {
      amount,
      tenureMonths: tenure,
      rate,
      monthlyEMI,
      totalInterest,
      totalRepayment: totalPayment
    };

    if (language === 'hi') {
      return {
        response: `${formatINR(amount)} के लोन पर ${tenure} महीनों के लिए अनुमानित ब्याज दर ${rate}% वार्षिक के अनुसार आपकी मासिक EMI लगभग ${formatINR(monthlyEMI)} होगी। कुल देय ब्याज लगभग ${formatINR(totalInterest)} होगा। (कृपया ध्यान दें: यह सांकेतिक गणना है, अंतिम दर बैंक सत्यापन पर निर्भर करती है)।`,
        workflowState: 'emi_calc',
        suggestedActions: ['इस लोन के लिए दस्तावेज़ देखें', 'EMI कैलकुलेटर खोलें', 'प्रतिनिधि से बात करें'],
        emiPreview
      };
    }
    if (language === 'hinglish') {
      return {
        response: `${formatINR(amount)} ke business loan ke liye ${tenure} months tenure par approximate interest rate ${rate}% p.a. par aapki monthly EMI approximately ${formatINR(monthlyEMI)} aayegi. Total estimated interest ${formatINR(totalInterest)} hoga. Note: Yeh indicative demonstration calculation hai.`,
        workflowState: 'emi_calc',
        suggestedActions: ['Check Required Documents', 'Open Interactive EMI Tool', 'Request Callback'],
        emiPreview
      };
    }
    return {
      response: `For an illustrative loan of ${formatINR(amount)} over ${tenure} months at an estimated interest rate of ${rate}% p.a., your estimated monthly EMI is approximately ${formatINR(monthlyEMI)}. The estimated total interest is ${formatINR(totalInterest)} with a total outflow of ${formatINR(totalPayment)}. Note: This is an illustrative demonstration estimate.`,
      workflowState: 'emi_calc',
      suggestedActions: ['View Required Documents', 'Adjust in EMI Calculator', 'Request Loan Officer Handoff'],
      emiPreview
    };
  }

  // Check for Documents
  if (lower.includes('document') || lower.includes('doc') || lower.includes('kagaz') || lower.includes('कागज़') || lower.includes('दस्तावेज़') || lower.includes('requirements')) {
    if (language === 'hi') {
      return {
        response: 'बिज़नेस लोन (जैसे SBI SME Pratham या Mudra) के लिए आम तौर पर आवश्यक प्राथमिक दस्तावेज़:\n1. पहचान एवं पता प्रमाण (आधार कार्ड / वोटर कार्ड)\n2. बिज़नेस एवं आवेदक का पैन कार्ड (PAN)\n3. उद्यम पंजीकरण (Udyam) या शॉप एक्ट लाइसेंस\n4. पिछले 6 महीने का चालू/बचत बैंक खाता विवरण\n5. बिज़नेस स्थान का बिजली बिल / रेंट एग्रीमेंट।\n\nआप नीचे दिए गए दस्तावेज़ चेकलिस्ट में इन्हें मार्क कर सकते हैं!',
        workflowState: 'document_check',
        suggestedActions: ['दस्तावेज़ चेकलिस्ट खोलें', 'पात्रता की जाँच करें', 'ब्याज दरें जानें']
      };
    }
    if (language === 'hinglish') {
      return {
        response: 'Small business loan enquiry ke liye primary documents standard hote hain:\n1. Aadhaar Card / Address Proof\n2. Business & Personal PAN Card\n3. Udyam Registration ya Shop Establishment Certificate\n4. Past 6 months Bank Account Statement\n5. Business premises rent agreement ya electricity bill.\n\nAap niche document checklist me easily tick mark karke ready kar sakte hain.',
        workflowState: 'document_check',
        suggestedActions: ['Open Document Checklist', 'Compare Loan Products', 'Speak to Loan Officer']
      };
    }
    return {
      response: 'Standard document requirements for Indian MSME loan products (e.g. SBI SME Pratham or Mudra Kishore) include:\n1. Identity & Address Proof (Aadhaar / Voter ID)\n2. PAN Card of Borrower and Business\n3. Udyam Registration or Shop & Establishment License\n4. Past 6 months Bank Account Statements\n5. Proof of Business Premises (Electricity bill / lease agreement).\n\nYou can track and prepare your documents in our interactive checklist tab!',
      workflowState: 'document_check',
      suggestedActions: ['Open Document Checklist', 'Check Eligibility Rules', 'Explore Loan Catalogue']
    };
  }

  // Check for Kirana / Retail query
  if (lower.includes('kirana') || lower.includes('retail') || lower.includes('shop') || lower.includes('दुकान') || lower.includes('किराना')) {
    const product = PRODUCTS[0]; // sbi_sme_pratham
    const loanMatch = {
      productId: product.id,
      productName: product.name,
      rate: `${product.interestRateMin}% - ${product.interestRateMax}% p.a.`,
      amountRange: `${formatINR(product.minAmount)} to ${formatINR(product.maxAmount)}`
    };

    if (language === 'hi') {
      return {
        response: `किराना और रिटेल दुकानदारों के लिए हमारा सबसे अनुशंसित विकल्प "${product.name}" है। इसमें ₹10 लाख तक किसी कोलैटरल (बिना किसी गिरवी) की आवश्यकता नहीं होती। ब्याज दर ${product.interestRateMin}% से ${product.interestRateMax}% प्रति वर्ष के बीच रहती है। आप अपनी दुकान में नया स्टॉक भरने या दुकान नवीनीकरण के लिए इसका उपयोग कर सकते हैं।`,
        workflowState: 'discovery',
        suggestedActions: ['₹3 लाख पर EMI निकालें', 'आवश्यक दस्तावेज़ देखें', 'लोन विवरण जांचें'],
        loanMatch
      };
    }
    if (language === 'hinglish') {
      return {
        response: `Kirana aur retail stores ke liye most suitable option "${product.name}" hai. Isme ₹10 Lakhs tak collateral-free benefit milta hai (CGTMSE coverage ke under). Illustrative interest rate ${product.interestRateMin}% - ${product.interestRateMax}% p.a. hai. Inventory stocking aur daily operations ke liye best hai.`,
        workflowState: 'discovery',
        suggestedActions: ['Calculate EMI for ₹3 Lakh', 'View Document Checklist', 'Compare Mudra Loans'],
        loanMatch
      };
    }
    return {
      response: `For Kirana and retail merchandise owners, our top demonstration product is "${product.name}". It offers loans from ${formatINR(product.minAmount)} up to ${formatINR(product.maxAmount)} with zero collateral required up to ₹10 Lakhs under CGTMSE. Interest rates range from ${product.interestRateMin}% to ${product.interestRateMax}% p.a. with repayment tenures up to 5 years.`,
      workflowState: 'discovery',
      suggestedActions: ['Calculate ₹3 Lakh EMI', 'View Kirana Documents', 'Speak to Loan Specialist'],
      loanMatch
    };
  }

  // Check for Textile / Manufacturing
  if (lower.includes('textile') || lower.includes('garment') || lower.includes('cloth') || lower.includes('machinery') || lower.includes('कपड़ा') || lower.includes('मशीन')) {
    const product = PRODUCTS[3]; // machinery loan
    const loanMatch = {
      productId: product.id,
      productName: product.name,
      rate: `${product.interestRateMin}% - ${product.interestRateMax}% p.a.`,
      amountRange: `${formatINR(product.minAmount)} to ${formatINR(product.maxAmount)}`
    };
    if (language === 'hi') {
      return {
        response: `टेक्सटाइल और परिधान निर्माण इकाइयों के लिए "${product.name}" सबसे उपयुक्त है। इसमें सिलाई मशीन, कढ़ाई उपकरण या फैब्रिक कटिंग मशीनरी की खरीद के लिए 80% तक फाइनेंसिंग 7 साल तक की अवधि के लिए उपलब्ध होती है। ब्याज दर ${product.interestRateMin}% - ${product.interestRateMax}% प्रति वर्ष है।`,
        workflowState: 'discovery',
        suggestedActions: ['₹5 लाख पर EMI देखें', 'मशीनरी कोटेशन नियम', 'प्रतिनिधि से बात करें'],
        loanMatch
      };
    }
    if (language === 'hinglish') {
      return {
        response: `Textile aur manufacturing businesses ke liye "${product.name}" design kiya gaya hai. Industrial sewing machines, printing equipment ya raw material stocking ke liye up to ₹50 Lakhs term loan milta hai with tenure up to 84 months. Interest rates ${product.interestRateMin}% - ${product.interestRateMax}% p.a.`,
        workflowState: 'discovery',
        suggestedActions: ['Calculate EMI for ₹5 Lakh', 'Check Machinery Guidelines', 'Request Callback'],
        loanMatch
      };
    }
    return {
      response: `For textile, apparel, and manufacturing units, "${product.name}" provides long-term capital to procure sewing machinery, diagnostic equipment, or facility expansion. Loan quantum ranges from ${formatINR(product.minAmount)} up to ${formatINR(product.maxAmount)} with tenure up to 84 months and rates from ${product.interestRateMin}% to ${product.interestRateMax}% p.a.`,
      workflowState: 'discovery',
      suggestedActions: ['Calculate ₹5 Lakh EMI', 'Check Machinery Documents', 'Speak with Representative'],
      loanMatch
    };
  }

  // Check for Services / Repair
  if (lower.includes('service') || lower.includes('repair') || lower.includes('auto') || lower.includes('workshop') || lower.includes('रिपेयर') || lower.includes('सर्विस')) {
    const product = PRODUCTS[1]; // mudra kishore
    const loanMatch = {
      productId: product.id,
      productName: product.name,
      rate: `${product.interestRateMin}% - ${product.interestRateMax}% p.a.`,
      amountRange: `${formatINR(product.minAmount)} to ${formatINR(product.maxAmount)}`
    };
    if (language === 'hi') {
      return {
        response: `इलेक्ट्रिकल, ऑटोमोबाइल या रिपेयर सर्विस सेंटर के लिए "${product.name}" या वर्किंग कैपिटल फैसिलिटी बहुत मददगार है। इसमें ₹50,000 से ₹5,00,000 तक का लोन बिना किसी गिरवी (Zero Collateral) और शून्य प्रोसेसिंग फीस के साथ उपलब्ध है।`,
        workflowState: 'discovery',
        suggestedActions: ['₹1.5 लाख पर EMI निकालें', 'मुद्रा लोन पात्रता देखें', 'दस्तावेज़ चेकलिस्ट'],
        loanMatch
      };
    }
    if (language === 'hinglish') {
      return {
        response: `Repair aur service workshops ke diagnostic tools aur spare parts inventory ke liye "${product.name}" perfect hai. ₹50,000 se ₹5 Lakhs tak 100% government guarantee ke saath bina collateral milta hai. Zero processing fees apply hoti hai.`,
        workflowState: 'discovery',
        suggestedActions: ['Calculate EMI for ₹1.5 Lakh', 'View Mudra Guidelines', 'Speak to Loan Officer'],
        loanMatch
      };
    }
    return {
      response: `For service providers, vehicle garages, and electronic repair workshops, "${product.name}" provides fast access to credit up to ₹5,00,000 under the Pradhan Mantri Mudra Yojana with 0% processing fee and no collateral required. Rates range from ${product.interestRateMin}% to ${product.interestRateMax}% p.a.`,
      workflowState: 'discovery',
      suggestedActions: ['Calculate ₹1.5 Lakh EMI', 'Mudra Kishore Details', 'Request Callback'],
      loanMatch
    };
  }

  // General default helpful response
  if (language === 'hi') {
    return {
      response: `नमस्ते! मैं प्राइमकैपिटल AI लोन सहायक हूँ। आप मुझसे अपने बिज़नेस (किराना, टेक्सटाइल, सर्विस, या निर्माण) के लिए उपयुक्त लोन स्कीम, ब्याज दरें, आवश्यक कागज़ात या मासिक EMI के बारे में पूछ सकते हैं। आप बोलकर (माइक बटन दबाकर) या टाइप करके बात कर सकते हैं।`,
      workflowState: 'general',
      suggestedActions: ['किराना दुकान लोन विकल्प', '₹2 लाख पर EMI निकालें', 'दस्तावेज़ चेकलिस्ट', 'लोन अधिकारी से बात करें']
    };
  }
  if (language === 'hinglish') {
    return {
      response: `Namaste! Main PrimeCapital AI hoon - aapka voice-first business loan assistant. Aap mujhse kisi bhi loan product, interest rate, documents, ya EMI calculation ke baare me pooch sakte hain. Aap voice mic use karke bol bhi sakte hain!`,
      workflowState: 'general',
      suggestedActions: ['Kirana Loan Options', 'Calculate EMI for ₹2 Lakh', 'Required Documents', 'Speak with Representative']
    };
  }
  return {
    response: `Welcome to PrimeCapital AI! I am your voice-first business loan discovery assistant. I can help you explore SBI-labelled demonstration loan products, compare indicative interest rates, verify documentation requirements, and calculate monthly EMIs for your small business. How may I assist your business today?`,
    workflowState: 'general',
    suggestedActions: ['Kirana & Retail Options', 'Calculate EMI for ₹2 Lakh', 'Document Checklist', 'Speak to a Loan Officer']
  };
}

// ---------------- API ENDPOINTS ----------------

// General & Health
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'PrimeCapital AI Loan Assistant',
    version: '3.3.0',
    model: 'Gnani Evon v3.3 / Gemini Flash',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/supabase/status', (_req, res) => {
  res.json({
    connected: true,
    storage: 'ready',
    status: 'operational',
    documents_bucket: 'private_kyc_vault',
    ocr_engine: 'Tesseract OCR v5.3.0 (Local Privacy Preserving)',
    audit_events_count: auditLog.length
  });
});

// Loan Products Catalogue
app.get('/api/products', (_req, res) => {
  res.json({
    products: PRODUCTS,
    total: PRODUCTS.length,
    disclaimer: 'Synthetic demonstration catalogue. All products, rates, fees, and rules are illustrative and not official SBI offerings.'
  });
});

// Chat Conversation Endpoint
app.post('/api/chat', async (req, res) => {
  const { session_id, message, language = 'en', consent = true, business_category } = req.body;

  if (!consent) {
    return res.status(403).json({
      error: 'Consent Required',
      message: 'Please review and accept the demonstration consent notice before proceeding with loan enquiry.',
      workflow_state: 'consent_required'
    });
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Attempt Gemini API if key is present
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI();
      const prompt = `You are "Evon v3.3", the voice-first AI Business Loan Enquiry Assistant for "PrimeCapital AI".
Your target users are Indian small-business owners (Kirana & retail, textiles, manufacturing, services & repair).
You speak in the user's requested language (${language}: English, Hindi, or Hinglish).
CRITICAL RULES:
1. All SBI-labelled loan products and rates are SYNTHETIC DEMONSTRATION DATA only. Never present them as official SBI offers.
2. Never promise loan approval. Always state values and interest rates as illustrative demonstration estimates.
3. Keep responses warm, respectful, concise, and accessible (under 4-5 sentences). Avoid complex financial jargon.
4. Business Category Context: ${business_category || 'General MSME'}.
Approved Demonstration Products:
${PRODUCTS.map(p => `- ${p.name} (${p.category}): Min ₹${p.minAmount} to Max ₹${p.maxAmount}, Rate ${p.interestRateMin}%-${p.interestRateMax}%, Tenure ${p.minTenureMonths}-${p.maxTenureMonths}m, Fee: ${p.processingFeeNotes}`).join('\n')}

User message: "${message}"

Respond directly to the business owner in a respectful, clear voice. If they ask about loans, cite the matching demonstration product. If they ask to speak to a human, reassure them and confirm handoff.`;

      const geminiResult = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const responseText = geminiResult.text;
      if (responseText) {
        // Derive workflow state and quick suggestions
        const fallback = generateEvonResponse(message, language, business_category);
        return res.json({
          response: responseText.trim(),
          workflow_state: fallback.workflowState,
          suggested_actions: fallback.suggestedActions,
          loan_match: fallback.loanMatch,
          emi_preview: fallback.emiPreview,
          handoff_recommended: fallback.handoffRecommended || false,
          session_id
        });
      }
    } catch (err) {
      console.warn('Gemini API call skipped or failed, using deterministic Evon v3.3 engine:', err);
    }
  }

  // Fallback to high-fidelity Evon v3.3 response engine
  const evonData = generateEvonResponse(message, language, business_category);
  return res.json({
    response: evonData.response,
    workflow_state: evonData.workflowState,
    suggested_actions: evonData.suggestedActions,
    loan_match: evonData.loanMatch,
    emi_preview: evonData.emiPreview,
    handoff_recommended: evonData.handoffRecommended || false,
    session_id
  });
});

// Deterministic Confirmation / EMI calculation endpoint
app.post('/api/confirm', (req, res) => {
  const { session_id, product_id, amount, tenure_months } = req.body;

  const product = PRODUCTS.find(p => p.id === product_id) || PRODUCTS[0];
  const principal = Number(amount) || product.minAmount;
  const tenure = Number(tenure_months) || 24;
  const avgRate = (product.interestRateMin + product.interestRateMax) / 2;

  const isAmountValid = principal >= product.minAmount && principal <= product.maxAmount;
  const isTenureValid = tenure >= product.minTenureMonths && tenure <= product.maxTenureMonths;

  const { monthlyEMI, totalInterest, totalPayment } = calculateEMI(principal, avgRate, tenure);
  const estimatedFee = Math.round((principal * product.processingFeePercent) / 100);

  res.json({
    session_id,
    product: {
      id: product.id,
      name: product.name,
      schemeCode: product.schemeCode,
      rateRange: `${product.interestRateMin}% - ${product.interestRateMax}% p.a.`,
      appliedRate: avgRate
    },
    calculation: {
      principal,
      tenureMonths: tenure,
      annualRate: avgRate,
      monthlyEMI,
      totalInterest,
      totalPayment,
      estimatedProcessingFee: estimatedFee,
      isCompliant: isAmountValid && isTenureValid,
      notes: isAmountValid && isTenureValid
        ? 'Parameters are within product demonstration guidelines.'
        : `Requested amount or tenure exceeds demonstration product thresholds (${formatINR(product.minAmount)} - ${formatINR(product.maxAmount)}, ${product.minTenureMonths} - ${product.maxTenureMonths} months).`
    },
    disclaimer: 'Illustrative calculation based on synthetic demonstration rates. Final terms are subject to formal underwriting.'
  });
});

// AI Intent Interpretation endpoint
app.post('/api/ai/interpret', (req, res) => {
  const { message } = req.body;
  const lower = (message || '').toLowerCase();

  let intent = 'general_inquiry';
  if (lower.includes('emi') || lower.includes('calculate') || lower.includes('किस्त')) {
    intent = 'emi_calculation';
  } else if (lower.includes('document') || lower.includes('कागज़') || lower.includes('requirements')) {
    intent = 'document_inquiry';
  } else if (lower.includes('human') || lower.includes('speak') || lower.includes('call') || lower.includes('agent')) {
    intent = 'human_handoff';
  } else if (lower.includes('rate') || lower.includes('interest') || lower.includes('ब्याज')) {
    intent = 'rate_inquiry';
  } else if (lower.includes('kirana') || lower.includes('textile') || lower.includes('shop') || lower.includes('repair')) {
    intent = 'product_discovery';
  }

  res.json({
    intent,
    confidence: 0.94,
    extracted_entities: {
      category: lower.includes('kirana') ? 'Kirana & Retail' : lower.includes('textile') ? 'Textiles & Manufacturing' : 'General SME'
    }
  });
});

// Speech Transcribe endpoint (Gnani Prisma v2.5 compatible)
app.post('/api/speech/transcribe', (req, res) => {
  const { audio_base64, language = 'en' } = req.body;
  res.json({
    transcript: req.body.transcript || 'I own a kirana shop and need a business loan of 3 lakh rupees.',
    language,
    confidence: 0.98,
    asr_engine: 'Gnani Prisma v2.5 ASR',
    audio_processed_bytes: audio_base64 ? audio_base64.length : 0
  });
});

// Speech Synthesize endpoint (Gnani Timbre v2.5 compatible)
app.post('/api/speech/synthesize', (req, res) => {
  const { text, language = 'en', voice_gender = 'female' } = req.body;
  res.json({
    text,
    language,
    tts_engine: 'Gnani Timbre v2.5 TTS',
    voice_profile: `${language}_${voice_gender}_expressive`,
    audio_format: 'mp3',
    supported_native_tts: true
  });
});

// Human Handoff endpoint
app.post('/api/handoff', (req, res) => {
  const { session_id, name, phone, business_name, category, loan_amount, notes, language = 'en' } = req.body;

  const ticketNumber = `PC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const newEnquiry: StaffEnquiry = {
    id: `ENQ-${ticketNumber.split('-')[2]}`,
    ticketNumber,
    businessName: business_name || 'Retail Enterprise',
    contactPerson: name || 'Small Business Owner',
    phone: phone || '+91 98000 00000',
    category: (category as BusinessCategory) || 'Kirana & Retail',
    requestedAmount: Number(loan_amount) || 200000,
    preferredProduct: 'SBI SME Pratham (Demonstration)',
    language: language as any,
    status: 'new',
    notes: notes || 'Enquiry initiated via PrimeCapital voice-first web assistant.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  staffEnquiries.unshift(newEnquiry);

  // Add lead entry
  staffLeads.unshift({
    id: `LEAD-${Math.floor(100 + Math.random() * 900)}`,
    name: newEnquiry.businessName,
    phone: newEnquiry.phone,
    businessType: newEnquiry.category,
    turnoverRange: '₹25L - ₹50L/year (Estimated)',
    leadScore: 85,
    source: 'web_chat',
    status: 'lead',
    notes: `Handoff requested via web chat: ${newEnquiry.notes}`,
    createdAt: new Date().toISOString()
  });

  // Audit event
  auditLog.unshift({
    id: `AUD-${Math.floor(300 + Math.random() * 700)}`,
    action: 'HANDOFF_CREATED',
    entity: 'StaffEnquiry',
    entityId: newEnquiry.id,
    actor: 'web_assistant_evon',
    details: `Handoff registered for ${newEnquiry.contactPerson} (${newEnquiry.businessName}). Ticket: ${ticketNumber}`,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    ticket_number: ticketNumber,
    enquiry_id: newEnquiry.id,
    message: 'Your enquiry has been assigned to a PrimeCapital SME Relationship Manager. You will receive a call within 24 business hours.'
  });
});

// Staff Endpoints
app.get('/api/staff/enquiries', (_req, res) => {
  res.json({ enquiries: staffEnquiries });
});

app.patch('/api/staff/enquiries/:enquiry_id', (req, res) => {
  const { enquiry_id } = req.params;
  const { status, assignedTo, notes } = req.body;
  const enq = staffEnquiries.find(e => e.id === enquiry_id || e.ticketNumber === enquiry_id);

  if (!enq) {
    return res.status(404).json({ error: 'Enquiry not found' });
  }

  if (status) enq.status = status;
  if (assignedTo !== undefined) enq.assignedTo = assignedTo;
  if (notes) enq.notes = notes;
  enq.updatedAt = new Date().toISOString();

  auditLog.unshift({
    id: `AUD-${Math.floor(300 + Math.random() * 700)}`,
    action: 'ENQUIRY_UPDATED',
    entity: 'StaffEnquiry',
    entityId: enq.id,
    actor: 'staff_console',
    details: `Updated enquiry status to "${enq.status}"`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, enquiry: enq });
});

app.get('/api/staff/audit', (_req, res) => {
  res.json({ audit: auditLog });
});

app.get('/api/staff/leads', (_req, res) => {
  res.json({ leads: staffLeads });
});

app.patch('/api/staff/leads/:lead_id', (req, res) => {
  const { lead_id } = req.params;
  const { status, notes } = req.body;
  const lead = staffLeads.find(l => l.id === lead_id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  if (status) lead.status = status;
  if (notes) lead.notes = notes;

  res.json({ success: true, lead });
});

app.get('/api/staff/documents/:document_id/view', (req, res) => {
  const { document_id } = req.params;
  const doc = staffDocuments.find(d => d.id === document_id);
  if (!doc) return res.status(404).json({ error: 'Document metadata not found' });

  res.json({
    document: doc,
    previewUrl: `https://storage.supabase.internal/private_kyc_vault/${doc.id}?signed_token=exp_300s`,
    signedTokenExpiresInSeconds: 300,
    notice: 'Document preview token valid for 5 minutes. Decrypted only in authorized staff memory.'
  });
});

app.post('/api/staff/documents/:document_id/review', (req, res) => {
  const { document_id } = req.params;
  const { decision, notes, reviewer = 'Officer (Staff Console)' } = req.body;
  const doc = staffDocuments.find(d => d.id === document_id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  if (decision === 'accept') {
    doc.verificationStatus = 'accepted';
  } else if (decision === 'reject') {
    doc.verificationStatus = 'rejected';
  }
  doc.reviewerNotes = notes || doc.reviewerNotes;
  doc.reviewedAt = new Date().toISOString();

  auditLog.unshift({
    id: `AUD-${Math.floor(300 + Math.random() * 700)}`,
    action: decision === 'accept' ? 'DOC_REVIEW_ACCEPT' : 'DOC_REVIEW_REJECT',
    entity: 'StaffDocument',
    entityId: doc.id,
    actor: reviewer,
    details: `Document ${doc.documentType} (${doc.maskedIdentifier}) was ${decision === 'accept' ? 'Accepted' : 'Rejected'}. Notes: ${notes || 'None'}`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, document: doc });
});

// Staff documents list endpoint
app.get('/api/staff/documents', (_req, res) => {
  res.json({ documents: staffDocuments });
});

// Vite Middleware Integration for Development / SPA Serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`PrimeCapital AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
