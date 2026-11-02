# PrimeCapital — Supabase integration

This project is a voice-first **synthetic loan-enquiry demo**. The SBI-labelled products and policy facts in the training database are invented test data, not official State Bank of India products or lending terms.

## Configure Supabase (FastAPI backend)

1. In Supabase, open Project Settings → API (or API Keys). Copy the project URL and the server-side service-role/secret key.
2. Create a local `.env` in the repository root (same directory as this README), using `.env.example` as a template:
   ```env
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_SIDE_SERVICE_ROLE_KEY
   SUPABASE_HTTP_TIMEOUT_SECONDS=10
   ```
3. Keep `.env` out of Git. Never put the service-role key in frontend JavaScript, static HTML, screenshots, or a public repository.
4. Install requirements and start FastAPI:
   ```bash
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```
5. Test `GET http://127.0.0.1:8000/api/supabase/status`, `GET http://127.0.0.1:8000/api/products`, and `GET http://127.0.0.1:8000/api/health`.

`/api/supabase/status` calls the fixed `lookup_demo_products` RPC and reports how many demo products it returned. If it reports an RPC permission error, review Supabase function/table privileges rather than granting broad anonymous table access.

## Security and current scope

- Supabase calls happen server-side only.
- Product listing uses the fixed `lookup_demo_products` function; helper operations for fees, eligibility rules, and documents are fixed, read-only PostgREST queries.
- Evon must never generate SQL to execute. Future query plans must be mapped to allow-listed operations and validated by FastAPI.
- `/api/products` reads Supabase when configured and falls back to bundled local synthetic data otherwise.
- This update adds a database connector and status endpoint; it does **not yet route all `/api/chat` answers through Supabase**. That is the next integration step after connection verification.
- Synthetic values are not official SBI policy and must not be used for real lending decisions.


## Frontend refresh
The borrower UI has been refreshed to a responsive blue-and-white PrimeCapital experience with consent, language selection, chat, voice controls, product cards, and quick-question shortcuts. The staff dashboard has matching styling. Telegram bot access and scheduled follow-up are not implemented by this visual refresh; they require a configured provider and backend workflow.
