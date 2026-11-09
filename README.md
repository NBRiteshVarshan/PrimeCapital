# PrimeCapital

PrimeCapital is a synthetic business-loan enquiry demonstration. The catalogue is illustrative training data, not an official lender offer, eligibility decision, or loan approval.

## Architecture

- React + Vite frontend in `frontend/`
- FastAPI is the only backend in `app/`
- Production frontend assets are built into `app/static/frontend/` and served by FastAPI
- All browser API calls use the same-origin `/api` routes

The legacy `frontend/server.ts` is not started by any npm script and is not part of the application workflow.

## Setup

1. Copy `.env.example` to `.env` and set only backend secrets. Never put service-role, staff, Telegram, or provider keys in frontend files.
2. Create a Python environment and install backend dependencies:

```bash
python -m venv .venv
.venv/Scripts/activate  # Windows
pip install -r requirements.txt
```

3. Run the one-time SQL migrations in the Supabase SQL Editor:
   - `supabase/kyc_review_feedback_migration.sql` adds KYC review metadata.
   - `supabase/telegram_language_preferences.sql` creates persistent per-chat English/Hindi reply-language preferences.

   The Telegram bot uses the Supabase service-role key on the backend to read and save the selected language. Users choose their preferred reply language after `/consent`, and can change it at any time with `/language`.

4. Ensure `TELEGRAM_BOT_TOKEN` is set in the backend `.env`. The same bot token used by the Telegram bot is used by FastAPI to send review notifications. Keep it server-side; never add it to frontend variables.

5. Install the frontend dependencies and start the Vite development server:

```bash
cd frontend
npm install
npm run dev
```

6. In a second terminal, run FastAPI:

```bash
uvicorn app.main:app --reload --port 8000
```

Vite proxies `/api` to FastAPI during development. For production, run `npm run build` in `frontend/`, then start FastAPI; it serves the built application at `http://127.0.0.1:8000/`.

## Telegram reply language

- On first consent, the bot asks the user to choose English or Hindi.
- The selection is saved in `telegram_language_preferences` by Telegram chat ID and survives bot restarts.
- `/language` lets the user change the preference.
- The selected language controls both the text answer and Gnani Timbre v2.5 voice locale (`en-IN` or `hi-IN`). The ASR input configuration is unchanged; the bot does not infer the user's spoken language.
- Hindi system responses use reviewed, deterministic Hindi templates. Product names, codes, and numeric financial values are preserved. The current approved local FAQ records include reviewed Hindi versions. If a future knowledge-base item has no reviewed Hindi version, the bot responds in Hindi that the Hindi version is unavailable rather than silently sending an English answer or inventing a translation. Add a reviewed `text_hi` field for every new approved knowledge-base entry.

## KYC review feedback

- Staff acceptance/rejection is saved to `primecapital_documents`; the uploaded object is deleted from the private Supabase Storage bucket.
- Review metadata is retained (`review_status`, `rejection_reason`, `reviewed_at`, `reviewed_by`). Do not store raw PAN numbers in this record.
- Telegram feedback is sent after the decision is saved. If Telegram delivery fails, the staff dashboard reports that separately; the review decision remains saved.
- Rejection requires a staff-entered reason (maximum 250 characters), which is included in the customer's Telegram message.

## Security and privacy

- Consent is never assumed by the browser. Voice transcription and chat requests send the current consent value.
- Speech endpoints are the primary voice path. Browser text-to-speech is a clearly limited fallback when backend TTS is unavailable.
- Staff endpoints require the `x-staff-token` header, including document previews and audit records.
- Supabase service-role credentials remain backend-only. Document previews use short-lived signed URLs.
- Telegram document upload requires consent and is stored in a private bucket. A metadata write failure triggers a best-effort storage cleanup.

## Checks

```bash
cd frontend
npm run build
cd ..
python -m compileall app
```

Provider-dependent features require their configured endpoints and credentials. Missing integrations return controlled API errors instead of fabricated success responses.
