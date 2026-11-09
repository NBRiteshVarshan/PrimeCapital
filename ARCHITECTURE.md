# Architecture and safety decisions

```text
Borrower PWA-style UI
  -> FastAPI gateway (request ID, validation, consent, basic rate limit)
  -> deterministic conversation orchestrator
     -> structured product facts (approved + effective-date filter)
     -> lexical approved-knowledge retrieval
     -> Decimal calculator (rate/method sourced from product record)
     -> enquiry/escalation queue
  -> response guardrail
  -> source/version transcript + append-only JSONL audit
Staff dashboard -> queue assignment/status/feedback + audit view
```

## State behavior
- `DISCOVERY`: interpret the user's enquiry.
- `CLARIFY`: ask for missing product/amount/tenure or confirm critical calculation slots.
- `FACT_ANSWER` / `DOCUMENTS`: return sourced product facts/checklists.
- `CALCULATE`: compute only after read-back confirmation.
- `HANDOFF` / `ESCALATE`: create a staff queue item when requested, risky, or evidence is insufficient.

## Safety boundaries
- Fictional data only; no identity documents or autonomous lending decisions.
- Product numbers come from approved structured records. Calculation arithmetic uses `Decimal`.
- No calculation until amount/product/tenure are read back and confirmed.
- Conflicting/insufficient evidence should escalate; the starter retrieval is intentionally simple and must be upgraded before production.
- No raw audio is accepted/stored. `SpeechProvider` is an adapter contract, not a live Gnani integration.
- The local staff API is unauthenticated and must never be exposed publicly.

## Model provider integration
- Prisma v2.5 ASR: browser MediaRecorder -> `/api/speech/transcribe` -> configurable provider adapter.
- Timbre v2.5 TTS: optional browser voice reply -> `/api/speech/synthesize` -> configurable provider adapter.
- Evon v3.3: `/api/ai/interpret` defaults to local Hugging Face Transformers loading for `gnani/gnani-evon-v3.3-30B-A3B`; an OpenAI-compatible private inference endpoint is optional. It is advisory and does not execute tools or determine eligibility.
- Credentials are environment-only. Exact provider URLs and request/response mappings must be checked against account-specific documentation.
