from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "app" / "data"
STATIC_DIR = BASE_DIR / "app" / "static"
AUDIT_PATH = Path(os.getenv("PRIME_CAPITAL_AUDIT_PATH", os.getenv("LOANSAATHI_AUDIT_PATH", str(BASE_DIR / "runtime" / "audit.jsonl"))))

# Official Gnani Speech APIs (documented REST endpoints).
GNANI_ASR_URL = os.getenv("GNANI_ASR_URL", "https://api.vachana.ai/stt/v3").strip()
GNANI_TTS_URL = os.getenv("GNANI_TTS_URL", "https://api.vachana.ai/api/v1/tts/inference").strip()
GNANI_API_KEY = os.getenv("GNANI_API_KEY", "").strip()
GNANI_API_KEY_HEADER = os.getenv("GNANI_API_KEY_HEADER", "X-API-Key-ID").strip()
GNANI_API_KEY_PREFIX = os.getenv("GNANI_API_KEY_PREFIX", "").strip()
GNANI_ASR_FILE_FIELD = os.getenv("GNANI_ASR_FILE_FIELD", "audio_file").strip()
GNANI_ASR_LANGUAGE_FIELD = os.getenv("GNANI_ASR_LANGUAGE_FIELD", "language_code").strip()
GNANI_TTS_TEXT_FIELD = os.getenv("GNANI_TTS_TEXT_FIELD", "text").strip()
GNANI_TTS_LANGUAGE_FIELD = os.getenv("GNANI_TTS_LANGUAGE_FIELD", "language").strip()
GNANI_TTS_AUDIO_FIELD = os.getenv("GNANI_TTS_AUDIO_FIELD", "audio").strip()
GNANI_TTS_MODEL = os.getenv("GNANI_TTS_MODEL", "timbre-v2.5").strip()
GNANI_TTS_VOICE = os.getenv("GNANI_TTS_VOICE", "Kaveri").strip()
GNANI_TTS_SAMPLE_RATE = int(os.getenv("GNANI_TTS_SAMPLE_RATE", "48000"))
GNANI_HTTP_TIMEOUT_SECONDS = float(os.getenv("GNANI_HTTP_TIMEOUT_SECONDS", "60"))

EVON_CHAT_COMPLETIONS_URL = os.getenv("EVON_CHAT_COMPLETIONS_URL", "").strip()
EVON_API_KEY = os.getenv("EVON_API_KEY", "").strip()
EVON_MODEL_NAME = os.getenv("EVON_MODEL_NAME", "evon-v3.3").strip()
EVON_HTTP_TIMEOUT_SECONDS = float(os.getenv("EVON_HTTP_TIMEOUT_SECONDS", "20"))

# Evon Hugging Face Transformers backend. Default to the provided model ID.
EVON_BACKEND = os.getenv("EVON_BACKEND", "local").strip().lower()
EVON_HF_MODEL_ID = os.getenv("EVON_HF_MODEL_ID", "gnani/gnani-evon-v3.3-30B-A3B").strip()
EVON_MAX_NEW_TOKENS = int(os.getenv("EVON_MAX_NEW_TOKENS", "256"))
EVON_TEMPERATURE = float(os.getenv("EVON_TEMPERATURE", "0.0"))
EVON_TRUST_REMOTE_CODE = os.getenv("EVON_TRUST_REMOTE_CODE", "false").strip().lower() == "true"


# Optional Supabase backend. Keep the service-role key server-side only.
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
SUPABASE_ENABLED = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
SUPABASE_HTTP_TIMEOUT_SECONDS = float(os.getenv("SUPABASE_HTTP_TIMEOUT_SECONDS", "10"))

# Telegram document OCR and staff-only document access.
SUPABASE_DOCUMENT_BUCKET = os.getenv("SUPABASE_DOCUMENT_BUCKET", "primecapital-documents").strip()
STAFF_ACCESS_TOKEN = os.getenv("STAFF_ACCESS_TOKEN", "").strip()
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_DOCUMENT_MAX_BYTES = int(os.getenv("TELEGRAM_DOCUMENT_MAX_BYTES", str(8 * 1024 * 1024)))
