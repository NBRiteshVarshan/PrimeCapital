# PrimeCapital
### Voice-First, Multilingual Loan Assistance for Small Businesses

**Making financial assistance as simple as having a conversation.**

PrimeCapital is an AI-powered loan assistance platform designed for financial institutions and loan providers serving micro and small-scale businesses. It enables customers to enquire about loans, understand requirements, submit documents, and receive assistance through natural, multilingual text and voice conversations.

Built around Gnani AI's speech capabilities, PrimeCapital aims to make financial services more accessible to business owners who may not be comfortable navigating conventional, text-heavy digital platforms.

---

## 1. The Problem

Small businesses are essential to India's economy, yet accessing formal credit remains challenging for many of them.

The problem is not just the availability of loans. Potential borrowers may also struggle with:

- **Complex procedures:** Understanding eligibility criteria, documentation requirements, fees, and loan terms.
- **Language barriers:** Financial information is often presented in languages customers may not be comfortable with.
- **Limited literacy:** Many small-scale business owners may not be comfortable reading lengthy documents or typing queries.
- **Digital accessibility:** Conventional websites and application forms can be intimidating for customers with limited digital experience.
- **Support limitations:** Loan providers must handle repetitive enquiries while also managing document collection and customer follow-ups.

These barriers make it difficult for many small-business owners to access and understand formal financial services.

## 2. Our Solution

PrimeCapital introduces a **voice-first approach to loan assistance**.

Instead of expecting customers to read instructions, navigate complicated interfaces, or type their questions, the platform allows them to simply speak in a language they are comfortable with and receive a spoken response.

The platform connects customers and loan providers through two interfaces:

- **Customer interface:** A Telegram-based conversational assistant supporting text, voice, and document submission.
- **Staff interface:** A web dashboard for accessing customer submissions and reviewing KYC documents.

Our objective is to simplify routine customer interactions while keeping human assistance available whenever necessary.

## 3. Key Features

### A. Multilingual Voice Conversations

- Send voice messages instead of typing loan-related queries.
- Receive both text and generated voice responses.
- English and Hindi response preferences.
- Hinglish-style speech input support through configured speech recognition.
- Persistent language preferences across conversations.
- Change the preferred response language whenever required.

### B. Gnani AI Speech Integration

| Gnani Model | Purpose |
|---|---|
| **Prisma v2.5 (ASR)** | Converts customers' voice messages into text so their spoken loan enquiries can be processed. |
| **Timbre v2.5 (TTS)** | Converts generated answers into natural voice responses in the customer's selected supported language. |
| **Evon v3.3 (NLU - optional)** | Converts customer messages into structured intents and relevant information slots for downstream processing when the optional NLU endpoint is enabled. |

### C. Loan Information and Assistance

Customers can enquire about:

- Available loan products.
- Loan eligibility information and basic requirements.
- Required documents.
- Applicable interest rates, fees, and charges.
- Other available loan-related information.

Responses are grounded in configured product information rather than allowing the assistant to invent unsupported financial details.

### D. EMI Estimation

Calculate estimated monthly instalments using the loan amount, interest rate, and repayment tenure through deterministic financial calculations.

### E. KYC Document Submission

- Request document submission through Telegram.
- Explicit document-processing consent before upload.
- Upload PAN and GST document images.
- OCR-based document information extraction and basic format checks.
- Secure storage in a private Supabase Storage bucket.
- Document metadata and review status tracking.

Automated document checks are preliminary; they do not establish document authenticity or loan approval.

### F. Staff Dashboard and Document Review

- Access customer document submissions through a staff-facing dashboard.
- Preview submitted documents through authorised access.
- Approve or reject documents.
- Record rejection reasons and review information.
- Notify customers of document review outcomes through Telegram.

### G. Human Assistance and Escalation

Customers can request human support when an enquiry requires individual attention, ensuring that automation does not replace access to actual staff.

### H. Privacy and Security

- Explicit consent before general bot interactions.
- Separate consent for KYC document processing.
- Private document storage.
- Backend-only service credentials.
- Staff-token-protected document review endpoints.
- Audit events for important customer and document workflows.

---

## 4. Why Does PrimeCapital Have Market Potential?

PrimeCapital addresses a genuine accessibility and operational problem in the MSME lending ecosystem.

### Our Target Customers

- Non-Banking Financial Companies (NBFCs).
- Microfinance institutions.
- Small-business lenders.
- Cooperative financial institutions.
- Banks and fintech companies serving micro and small enterprises.

### Our Market Opportunity

India has a large MSME ecosystem with significant unmet demand for formal credit.

NITI Aayog's 2025 report highlighted an estimated **₹80 lakh crore of unmet MSME credit demand**, based on FY21 data. This demonstrates the scale of the broader financing challenge, although it is not the addressable market size for PrimeCapital.

### Where PrimeCapital Creates Value

| For Borrowers | For Loan Providers |
|---|---|
| Easier access to loan information | Reduced repetitive enquiry workload |
| Voice-based interaction | More accessible customer engagement |
| Responses in a preferred language | Wider potential customer reach |
| Simpler document submission | Structured document collection |
| Access to human support | Organised document review workflow |

### Potential Business Model

PrimeCapital can be offered as a B2B solution to loan providers through:

- Subscription-based access for financial institutions.
- Customised or white-label deployments.
- Usage-based pricing based on customer interactions.
- Enterprise integrations with existing customer-support and loan-management systems.

Its long-term opportunity lies in becoming an accessible customer-interaction layer for financial institutions serving underserved small businesses.

---

## 5. How It Works

```text
             CUSTOMER
                 |
                 v
         TELEGRAM BOT / WEB
                 |
           Text or Voice
                 |
                 v
        GNANI PRISMA v2.5
           (Speech to Text)
                 |
                 v
       PRIME CAPITAL BACKEND
                 |
          +------+------+
          |             |
          v             v
    Loan Information  Optional Evon NLU
          |             |
          +------+------+
                 |
                 v
             RESPONSE
                 |
            +----+----+
            |         |
            v         v
        Text Reply  GNANI TIMBRE v2.5
                        |
                        v
                    Voice Reply
                 (Selected Language)


         DOCUMENT WORKFLOW

 Customer Upload
        |
        v
     Supabase
        |
        v
  Staff Dashboard
        |
        v
  Review Decision
        |
        v
 Telegram Feedback
```

---

## 6. Technology Overview

| Component | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Python, FastAPI |
| Speech recognition | Gnani Prisma v2.5 |
| Speech generation | Gnani Timbre v2.5 |
| Optional NLU | Gnani Evon v3.3 |
| Customer communication | Telegram Bot API |
| Database and document storage | Supabase |
| Document processing | OCR |

---

## 7. Getting Started

### Prerequisites

- Python 3.10+
- Node.js and npm
- Telegram Bot Token
- Gnani API credentials
- Supabase project

### Installation

**1. Clone the repository**

```bash
git clone <YOUR_REPOSITORY_URL>
cd PrimeCapital
```

**2. Configure the backend**

```bash
python -m venv .venv
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and configure the required credentials.

**3. Configure Supabase**

Run the SQL migrations in the `supabase/` directory in the required order.

**4. Start the backend**

```bash
uvicorn app.main:app --reload --port 8000
```

**5. Start the frontend**

```bash
cd frontend
npm install
npm run dev
```

**6. Start the Telegram bot**

In a separate terminal:

```bash
python -m app.telegram_bot
```

Refer to the environment example and project configuration for provider-specific settings.

---

## 8. Important Notes

- PrimeCapital is a loan enquiry and assistance platform, not an automated lending or credit-scoring system.
- It does not approve or reject loan applications or make final eligibility decisions.
- Loan information is based on configured demonstration data and must be replaced with verified lender-specific information before commercial use.
- KYC document checks are preliminary and require human verification.
- English and Hindi are supported response preferences; Hinglish-style speech recognition depends on the configured Prisma input language.
- Evon v3.3 is an optional NLU integration and is not required for the core speech and loan-assistance workflow.

---

## 9. Vision

We envision a financial-services experience where a small-business owner does not need to understand complicated digital interfaces to access essential loan information.

With PrimeCapital, we want to bridge the gap between financial institutions and the businesses they serve — one conversation at a time.

**PrimeCapital — Finance made conversational.**
