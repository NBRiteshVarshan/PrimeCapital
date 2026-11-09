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
