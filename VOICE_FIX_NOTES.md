<<<<<<< HEAD
# PrimeCapital Telegram voice and reply-language update

## Reply-language behavior

- After `/consent`, a new Telegram user is asked to choose English or Hindi.
- The selection is stored in Supabase table `telegram_language_preferences`, keyed by Telegram chat ID, so it survives bot restarts.
- `/language` lets the user change the selection later.
- The selected language controls both the text answer and the Gnani Timbre v2.5 voice locale (`en-IN` or `hi-IN`).
- No speech-language detection is performed; the user explicitly chooses the reply language.
- The Prisma ASR input setting remains controlled by `TELEGRAM_ASR_LANGUAGE` in `.env`.

## Speech adapter

`app/speech.py` keeps ASR and TTS locale mapping separate. Hinglish input continues to use Hindi as its ASR anchor locale, while TTS receives the selected `en` or `hi` language.

## Setup

1. Keep real credentials in your local `.env`; this archive does not include it.
2. Run `supabase/telegram_language_preferences.sql` in the Supabase SQL Editor once.
3. Install dependencies with `pip install -r requirements.txt`.
4. Install FFmpeg and ensure it is on PATH.
5. Start the bot with `python -m app.telegram_bot`.

## Hindi content

The bot uses reviewed Hindi templates for its built-in loan responses and Hindi text for the current approved local FAQ records. Financial values and product names remain unchanged. If new knowledge-base records are added, provide a reviewed `text_hi` field; otherwise the bot says in Hindi that a reviewed Hindi version is unavailable rather than returning an English answer or machine-translating financial content.

## Validation

- Python compilation passed.
- The full pytest suite passed in the packaging environment.
=======
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
>>>>>>> 9317841237f1c00d8b574b38f9885ecfb7b97caa
