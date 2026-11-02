# PrimeCapital Telegram Voice Fix

## Root cause addressed

The previous speech adapter used one language-code mapper for both ASR and TTS. It sent `hi-en` as the Prisma REST `language_code` for Hinglish. Gnani's published Prisma REST example uses BCP-47 locale values such as `hi-IN` and includes `preferred_language`. The adapter now maps Hinglish ASR to `hi-IN` (the Hindi anchor locale, with code-switching handled by Prisma), sends `preferred_language`, and keeps the TTS mapping separate so existing Hinglish voice output is unchanged.

The ASR upload now uses the configured multipart field names and the `audio/wav` MIME type. The request also includes `itn_native_numerals=true` as shown in Gnani's published REST example.

## Files changed

- `app/speech.py`: separate ASR/TTS locale mapping; corrected Prisma REST multipart request.
- `requirements.txt`: declares `python-telegram-bot` as a project dependency.
- `app/telegram_bot.py`: retained the project's diagnostic voice-input handler.

## Setup

1. Keep your real credentials in a local `.env` file. This repair archive intentionally does not contain `.env` or runtime audit logs.
2. Copy `.env.example` to `.env` and fill in your own credentials.
3. Install dependencies with `pip install -r requirements.txt`.
4. Install FFmpeg (macOS: `brew install ffmpeg`).
5. Start the bot with `python -m app.telegram_bot`.

## Validation

- Python compilation passed.
- A mocked ASR contract test passed, confirming Hinglish is sent as `hi-IN`, `preferred_language` is included, and the audio field is `audio_file` with `audio/wav` MIME type.
- The full existing pytest suite has 3 failures related to Supabase product lookup in this test environment; 9 tests passed. These are separate from the Telegram ASR patch.
