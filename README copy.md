# PrimeCapital
A runnable safety-first MVP for a fictional small-business lender. It provides product facts, source-linked FAQ retrieval, Decimal EMI calculations with read-back confirmation, consent gating, escalation queue, staff dashboard, audit log, and tests.

## Run
Python 3.11+ recommended.
```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Borrower UI: http://127.0.0.1:8000 · Staff dashboard: http://127.0.0.1:8000/staff · API docs: /docs
```bash
pytest -q
python -m app.evaluate
```

## Demo
Consent, then ask about fees/documents. Try `Calculate EMI for ₹200000 over 24 months for Working Capital Flex`; confirm with `confirm`. Ask `talk to a person` to create a staff queue item.

## Important limitations
All rates/products are synthetic. No lending decision, approval, scoring or guarantee is made. Gnani Prisma v2.5 ASR and Timbre v2.5 TTS adapters, API routes, microphone capture and optional voice replies are wired behind configurable environment settings. Exact Gnani endpoint URLs, authentication and request/response schemas must be verified against your account docs; the supplied screenshot does not include these details. Evon v3.3 now defaults to local Hugging Face Transformers loading for `gnani/gnani-evon-v3.3-30B-A3B`, following the supplied code. Install the optional heavy dependencies with `pip install -r requirements-evon.txt`. An OpenAI-compatible endpoint remains an optional alternative. Store is local JSON plus process memory, not production PostgreSQL/Redis. Staff endpoints have no authentication and must not be exposed publicly. Current retrieval is lightweight lexical matching, not production hybrid RAG/reranking. APR-style cost is illustrative only. Compliance matrix is a review aid, not certification.

## Architecture mapping
`main.py`: FastAPI gateway and consent/rate-limit; `orchestrator.py`: deterministic state machine; `facts.py`: structured approved product facts; `retrieval.py`: approved knowledge search; `calculator.py`: Decimal EMI and schedule; `guardrails.py`: banned claim checks; `speech.py`: configurable Prisma/Timbre HTTP adapters; `evon.py`: optional Evon structured-NLU adapter; `audit.py`: append-only JSONL events; `store.py`: enquiry queue; `static/`: borrower PWA-style app and staff dashboard; `evals/`: starter scenarios.

Production next steps: PostgreSQL + pgvector, Redis, object storage, authentication/RBAC, durable queues, real Gnani adapter, robust LLM JSON-schema NLU, multilingual embeddings + BM25/reranker, retention/deletion, OpenTelemetry, and full evaluation suite.

## Configure the three model integrations
Copy `.env.example` to `.env` and fill in credentials/endpoints from provider documentation:
- Prisma v2.5 ASR: `GNANI_ASR_URL`
- Timbre v2.5 TTS: `GNANI_TTS_URL`
- Evon v3.3: local default `EVON_BACKEND=local` with `EVON_HF_MODEL_ID=gnani/gnani-evon-v3.3-30B-A3B`; install `requirements-evon.txt`. Optional hosted backend: set `EVON_BACKEND=api`, `EVON_CHAT_COMPLETIONS_URL` and `EVON_API_KEY`.

The application does not automatically load `.env`; export variables in the shell before starting Uvicorn, or install `python-dotenv` and load it in startup. ASR expects multipart audio and transcript response keys `text`, `transcript`, or `transcription`. TTS expects raw audio bytes or JSON base64 audio. Adjust the adapter if the account API differs. For local Evon, Transformers loads the model and tokenizer through a text-generation pipeline. The optional API backend expects an OpenAI-compatible chat-completions response containing JSON.

New endpoints:
- `POST /api/speech/transcribe` — multipart `file`, `language`, `consent`
- `POST /api/speech/synthesize` — JSON `{ "text": "...", "language": "en" }`
- `POST /api/ai/interpret` — JSON `{ "message": "...", "language": "en" }`; advisory NLU only
- `GET /api/health` — endpoint configuration status, not a live provider health check

Gnani live speech calls are not verified because provider URLs, credentials and API contract documents were not supplied. Evon local loading follows the provided Transformers sample, but actual inference requires Hugging Face access and substantial RAM/VRAM; a 30B-parameter model may not run on an ordinary laptop. Evon does not make lending decisions or override deterministic policy.

### Evon local model resource note
The default Evon backend downloads/loads `gnani/gnani-evon-v3.3-30B-A3B` with `device_map="auto"`. This is a large 30B-parameter MoE model and may require substantial GPU memory or system RAM. macOS Apple Silicon compatibility/performance depends on the available memory and installed PyTorch/Transformers versions; if it cannot load locally, use an appropriately provisioned inference host and the optional API backend.


## Gnani speech API setup (updated)

The speech adapter uses the current documented Gnani Speech REST endpoints:
- Prisma ASR: `https://api.vachana.ai/stt/v3`
- Timbre TTS: `https://api.vachana.ai/api/v1/tts/inference`
- Both use the `X-API-Key-ID` header with `GNANI_API_KEY`.
- TTS requests use `model=timbre-v2.5`, a configurable voice (default `Kaveri`), and WAV audio output.

Copy `.env.example` to `.env`, replace `put_your_gnani_api_key_here` with your key, save, and restart the server. Do not share or commit `.env`.

Note: Gnani's documented STT formats include WAV, MP3, OGG, FLAC, AAC, and M4A. Browser microphone recordings may be WebM depending on the browser; if ASR rejects that format, convert the recording to WAV before sending it. The TTS adapter is updated to the documented payload/response shape, but a successful live call still depends on a valid key, account permissions, and available credits.


### ASR browser audio compatibility fix

The microphone UI now decodes browser MediaRecorder output (often WebM/Opus in Chrome/Brave) and converts it to PCM WAV in the browser before uploading. Gnani's STT REST docs list WAV, MP3, OGG, FLAC, AAC and M4A as supported formats, but do not list WebM. The local demo now surfaces Gnani's HTTP/error message to help diagnose invalid API keys, permissions/credits, unsupported audio, or service errors. Restart FastAPI and hard-refresh the page after updating.


### Voice-to-text input behavior

The microphone button now prefers the browser Web Speech API when available. It streams interim transcript text into the question input while the user speaks and leaves the final transcript in that input after Stop; it does not submit the question automatically. The user can review/edit the transcript and press Enter or Send. Browsers without SpeechRecognition use the Gnani Prisma upload fallback. Browser Web Speech recognition has limited browser availability and may use a browser-vendor online recognition service; see MDN's SpeechRecognition documentation.
