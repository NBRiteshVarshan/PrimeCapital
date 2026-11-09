export type Language = 'en' | 'hi' | 'hinglish';

export type BusinessCategory =
  | 'Kirana & Retail'
  | 'Textiles & Manufacturing'
  | 'Services & Repair'
  | 'Other Business';

export interface LoanProduct {
  id: string;
  name: string;
  schemeCode: string;
  category: string;
  interestRateMin?: number;
  interestRateMax?: number;
  minAmount: number;
  maxAmount: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  processingFeePercent?: number;
  processingFeeNotes?: string;
  collateralRequirement?: string;
  targetBusiness: string;
  eligibilityCriteria: string[];
  keyDocuments: string[];
  summary: string;
  disclaimerNote?: string;
  currency?: string;
  sourceId?: string;
  sourceTitle?: string;
  sourceVersion?: string;
  syntheticDemo?: boolean;
  badge?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  language?: Language;
  workflowState?: 'onboarding' | 'discovery' | 'emi_calc' | 'document_check' | 'handoff' | 'general';
  suggestedActions?: string[];
  loanMatch?: {
    productId: string;
    productName: string;
    rate: string;
    amountRange: string;
  };
  emiPreview?: {
    amount: number;
    tenureMonths: number;
    rate: number;
    monthlyEMI: number;
    totalInterest: number;
    totalRepayment: number;
  };
  isHandoff?: boolean;
  ticketId?: string;
  audioAvailable?: boolean;
}

export interface EMICalculationResult {
  amount: number;
  tenureMonths: number;
  annualRate: number;
  monthlyEMI: number;
  totalInterest: number;
  totalPayment: number;
  processingFeeEstimated?: number;
  isCompliant?: boolean;
  notes: string;
}

export interface StaffEnquiry {
  id: string;
  ticketNumber: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  category: BusinessCategory;
  requestedAmount: number;
  preferredProduct: string;
  language: Language;
  status: 'new' | 'assigned' | 'in_review' | 'contacted' | 'resolved';
  assignedTo?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffLead {
  id: string;
  name: string;
  phone: string;
  businessType: string;
  turnoverRange: string;
  leadScore: number;
  source: 'web_chat' | 'voice_assistant' | 'telegram_bot';
  status: 'lead' | 'qualified' | 'disqualified' | 'converted';
  notes: string;
  createdAt: string;
}

export interface StaffDocument {
  id: string;
  ticketNumber: string;
  documentType: 'PAN Card' | 'GST Certificate' | 'Udyam Certificate' | 'Bank Statement';
  maskedIdentifier: string;
  extractedName?: string;
  ocrConfidence?: number;
  source: 'Telegram Bot' | 'Staff Intake';
  storageStatus?: 'encrypted_vault' | 'pending_purge' | 'archived';
  verificationStatus?: 'pending' | 'accepted' | 'rejected';
  reviewStatus?: string;
  formatCheck?: string;
  reviewerNotes?: string;
  rejectionReason?: string;
  uploadedAt: string;
  reviewedAt?: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  actor: string;
  details: string;
  timestamp: string;
}
