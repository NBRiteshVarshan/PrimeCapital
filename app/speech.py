"""Gnani Prisma v2.5 ASR / Timbre v2.5 TTS REST adapters.

Endpoints and payloads follow Gnani's published Speech API documentation.
Keep credentials in .env; never hard-code or commit API keys.
"""
from dataclasses import dataclass
from pathlib import Path
import shutil
import subprocess
import tempfile
import httpx
from . import config


@dataclass
class SpeechResult:
    text: str
    provider: str = "gnani-prisma-v2.5"


class ProviderNotConfigured(RuntimeError):
    pass


def normalize_asr_audio(audio_bytes: bytes, filename: str) -> tuple[bytes, str]:
    """Convert browser WebM/Opus recordings to Gnani's supported WAV format."""
    extension = Path(filename or "").suffix.lower().lstrip(".")
    if extension in {"ogg", "wav", "m4a", "flac", "aac", "mp3"}:
        return audio_bytes, filename
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise ValueError(
            "This browser recorded WebM audio, which Gnani does not accept. Install FFmpeg on the backend to convert browser recordings."
        )
    with tempfile.TemporaryDirectory(prefix="primecapital-asr-") as directory:
        source = Path(directory) / f"recording.{extension or 'webm'}"
        target = Path(directory) / "recording.wav"
        source.write_bytes(audio_bytes)
        completed = subprocess.run(
            [ffmpeg, "-y", "-v", "error", "-i", str(source), "-ac", "1", "-ar", "16000", str(target)],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        if completed.returncode or not target.exists() or not target.stat().st_size:
            raise ValueError("Could not convert the recorded audio to WAV for transcription.")
        return target.read_bytes(), "recording.wav"


def _api_key_headers():
    if not config.GNANI_API_KEY:
        raise ProviderNotConfigured(
            "Gnani API key is missing. Set GNANI_API_KEY in your .env file."
        )
    # Current Gnani Speech APIs document X-API-Key-ID (not Bearer auth).
    return {config.GNANI_API_KEY_HEADER or "X-API-Key-ID": config.GNANI_API_KEY}


def _asr_language_code(language: str) -> str:
    """Return a BCP-47 locale accepted by the Prisma REST endpoint.

    Prisma supports Hinglish/code-switching, but the REST API's
    language_code field uses a locale such as hi-IN or en-IN.
    Use Hindi as the anchor locale for Hinglish utterances; the model
    handles English words through its code-switching capability.
    """
    return {
        "en": "en-IN",
        "hi": "hi-IN",
        "hinglish": "hi-IN",
        "hi-en": "hi-IN",
        "en-IN": "en-IN",
        "hi-IN": "hi-IN",
    }.get(language, "hi-IN" if language == "hinglish" else "en-IN")


def _tts_language_code(language: str) -> str:
    """Keep TTS language selection independent from Prisma ASR locales."""
    return {
        "en": "en-IN",
        "hi": "hi-IN",
        "hinglish": "hi-en",
        "en-IN": "en-IN",
        "hi-IN": "hi-IN",
        "hi-en": "hi-en",
    }.get(language, "en-IN")


class GnaniSpeechProvider:
    """Prisma v2.5 speech-to-text and Timbre v2.5 text-to-speech adapter."""

    def __init__(self):
        self.asr_url = config.GNANI_ASR_URL
        self.tts_url = config.GNANI_TTS_URL
        self.timeout = config.GNANI_HTTP_TIMEOUT_SECONDS

    def transcribe(
        self, audio_bytes: bytes, language: str = "en",
        filename: str = "utterance.wav"
    ) -> SpeechResult:
        if not self.asr_url:
            raise ProviderNotConfigured("Prisma ASR is not configured. Set GNANI_ASR_URL in .env.")
        if not audio_bytes:
            raise ValueError("Audio payload is empty.")

        # Gnani documents audio_file + language_code as multipart fields.
        file_field = config.GNANI_ASR_FILE_FIELD or "audio_file"
        language_field = config.GNANI_ASR_LANGUAGE_FIELD or "language_code"
        asr_locale = _asr_language_code(language)

        files = {
            file_field: (
                filename, audio_bytes, "audio/wav"
            )
        }
        # These fields follow Gnani's published Prisma REST example.
        # preferred_language anchors code-switched Hinglish recognition.
        data = {
            language_field: asr_locale,
            "preferred_language": asr_locale,
            "format": "transcribe",
            "itn_native_numerals": "true",
        }
        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                self.asr_url,
                headers=_api_key_headers(),
                files=files,
                data=data,
            )
            if response.is_error:
                detail = response.text[:500]
                raise RuntimeError(f"Gnani ASR HTTP {response.status_code}: {detail}")

        try:
            payload = response.json()
        except ValueError:
            payload = None
        if isinstance(payload, dict):
            if payload.get("success") is False:
                error = payload.get("error", {})
                if isinstance(error, dict):
                    message = error.get("message", "Gnani ASR reported an error.")
                    error_type = error.get("type", "API_ERROR")
                    raise ValueError(f"Gnani ASR {error_type}: {message}")
                raise ValueError("Gnani ASR reported an error.")
            transcript = payload.get("transcript") or payload.get("text")
            if isinstance(transcript, str) and transcript.strip():
                return SpeechResult(text=transcript.strip())
            raise ValueError("Gnani ASR response did not contain a transcript.")
        transcript = response.text.strip()
        if not transcript:
            raise ValueError("ASR returned an empty transcript.")
        return SpeechResult(text=transcript)

    def synthesize(self, text: str, language: str = "en") -> bytes:
        if not self.tts_url:
            raise ProviderNotConfigured("Timbre TTS is not configured. Set GNANI_TTS_URL in .env.")
        if not text.strip():
            raise ValueError("Text to synthesize is empty.")

        # Gnani TTS REST returns raw audio bytes (WAV with this audio_config).
        payload = {
            "text": text,
            "model": config.GNANI_TTS_MODEL or "timbre-v2.5",
            "voice": config.GNANI_TTS_VOICE or "Kaveri",
            "language": _tts_language_code(language),
            "speed": 1.0,
            "audio_config": {
                "encoding": "linear_pcm",
                "container": "wav",
                "num_channels": 1,
                "sample_rate": config.GNANI_TTS_SAMPLE_RATE,
                "sample_width": 2,
            },
        }
        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                self.tts_url,
                headers={**_api_key_headers(), "Content-Type": "application/json"},
                json=payload,
            )
            response.raise_for_status()
        content_type = response.headers.get("content-type", "").lower()
        if content_type.startswith("audio/") or "octet-stream" in content_type:
            if not response.content:
                raise ValueError("Gnani TTS returned an empty audio response.")
            return response.content
        raise ValueError(
            f"Gnani TTS returned unexpected content type '{content_type or 'unknown'}'; expected audio/wav."
        )


class SpeechProvider:
    """Compatibility interface used by the application."""

    def __init__(self):
        self._provider = GnaniSpeechProvider()

    def transcribe(self, audio_bytes: bytes, language: str = "en", filename: str = "utterance.wav"):
        return self._provider.transcribe(audio_bytes, language, filename)

    def synthesize(self, text: str, language: str = "en"):
        return self._provider.synthesize(text, language)


class TextFallback:
    def transcribe(self, audio_bytes: bytes, language: str = "en"):
        raise ProviderNotConfigured("Speech is not configured. Use text input or configure Gnani Prisma.")

    def synthesize(self, text: str, language: str = "en"):
        raise ProviderNotConfigured("Speech is not configured. Use transcript output or configure Gnani Timbre.")
