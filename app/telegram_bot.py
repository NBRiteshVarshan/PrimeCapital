"""
PrimeCapital Telegram Bot

Features:
- /start, /consent and /help
- Normal text message handling
- Telegram voice message handling
- Telegram audio attachment handling
- Gnani Prisma v2.5 speech-to-text
- Gnani Timbre v2.5 text-to-speech
- Hinglish voice replies
- Text + voice responses for both input methods
- Detailed diagnostic logging
"""

import asyncio
import io
import logging
import subprocess

from dotenv import load_dotenv
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from . import config
from .orchestrator import respond, safe_response
from .speech import SpeechProvider
from .audit import write_event


# ==================================================
# CONFIGURATION
# ==================================================

load_dotenv()

BOT_TOKEN = config.TELEGRAM_BOT_TOKEN if hasattr(
    config, "TELEGRAM_BOT_TOKEN"
) else ""

# Fall back to environment if token is not in config.py.
if not BOT_TOKEN:
    import os
    BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()

# Speech input language: en (default), hi, or hinglish.
# English is the default so English speech is transcribed in Latin script.
TELEGRAM_ASR_LANGUAGE = os.getenv("TELEGRAM_ASR_LANGUAGE", "en").strip().lower()
if TELEGRAM_ASR_LANGUAGE not in {"en", "hi", "hinglish"}:
    TELEGRAM_ASR_LANGUAGE = "en"

# In-memory consent tracking.
# Consent resets when the bot restarts.
consented_users = set()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger("PrimeCapitalTelegram")


# ==================================================
# AUDIO CONVERSION
# ==================================================

def convert_telegram_audio_to_wav(audio_bytes: bytes) -> bytes:
    """
    Convert Telegram OGG/Opus audio into WAV.

    Output:
    - Mono
    - 16 kHz
    - 16-bit PCM
    """

    if not audio_bytes:
        raise ValueError("Telegram returned empty audio data.")

    logger.info(
        "AUDIO CONVERSION: Starting. Input size: %d bytes",
        len(audio_bytes),
    )

    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel", "error",
                "-i", "pipe:0",
                "-vn",
                "-ac", "1",
                "-ar", "16000",
                "-c:a", "pcm_s16le",
                "-f", "wav",
                "pipe:1",
            ],
            input=audio_bytes,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            timeout=120,
        )

    except FileNotFoundError as exc:
        raise RuntimeError(
            "FFmpeg was not found. Install it using: brew install ffmpeg"
        ) from exc

    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(
            "FFmpeg audio conversion timed out."
        ) from exc

    except subprocess.CalledProcessError as exc:
        error = exc.stderr.decode(
            "utf-8", errors="replace"
        )[:1000]

        raise RuntimeError(
            f"FFmpeg conversion failed: {error}"
        ) from exc

    if not result.stdout:
        raise RuntimeError(
            "FFmpeg produced an empty WAV file."
        )

    logger.info(
        "AUDIO CONVERSION: Successful. Output size: %d bytes",
        len(result.stdout),
    )

    return result.stdout


# ==================================================
# TEXT-TO-SPEECH
# ==================================================

def generate_voice_reply(text: str) -> bytes:
    """
    Generate Hinglish speech using Gnani Timbre v2.5.
    Convert WAV output into Telegram-compatible OGG/Opus.
    """

    if not text or not text.strip():
        raise ValueError("Cannot synthesize empty text.")

    logger.info("TTS: Sending response to Gnani Timbre.")

    wav_audio = SpeechProvider().synthesize(
        text=text,
        language="hinglish",
    )

    if not wav_audio:
        raise RuntimeError("Gnani TTS returned empty audio.")

    logger.info(
        "TTS: Gnani generated WAV audio (%d bytes).",
        len(wav_audio),
    )

    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel", "error",
                "-i", "pipe:0",
                "-vn",
                "-c:a", "libopus",
                "-b:a", "32k",
                "-ar", "48000",
                "-ac", "1",
                "-f", "ogg",
                "pipe:1",
            ],
            input=wav_audio,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            timeout=120,
        )

    except FileNotFoundError as exc:
        raise RuntimeError("FFmpeg was not found.") from exc

    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("TTS audio conversion timed out.") from exc

    except subprocess.CalledProcessError as exc:
        error = exc.stderr.decode(
            "utf-8", errors="replace"
        )[:1000]

        raise RuntimeError(
            f"TTS audio conversion failed: {error}"
        ) from exc

    if not result.stdout:
        raise RuntimeError("TTS conversion produced empty audio.")

    logger.info(
        "TTS: OGG/Opus conversion successful (%d bytes).",
        len(result.stdout),
    )

    return result.stdout


# ==================================================
# SHARED RESPONSE PROCESSOR
# ==================================================

async def process_user_message(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    user_text: str,
):
    """
    Process either a normal text message or an ASR transcript.

    Both input types use the same orchestrator and receive
    text and Hinglish voice responses.
    """

    message = update.message
    user = update.effective_user
    chat = update.effective_chat

    if not message or not user or not chat:
        return

    if user.id not in consented_users:
        await message.reply_text(
            "Please provide your consent first using /consent."
        )
        return

    user_text = (user_text or "").strip()

    if not user_text:
        await message.reply_text(
            "I couldn't understand your message. Please try again."
        )
        return

    session_id = f"telegram:{chat.id}"

    # --------------------------------------------------
    # 1. Generate text response
    # --------------------------------------------------

    try:
        logger.info("ORCHESTRATOR: Processing user message.")

        await context.bot.send_chat_action(
            chat_id=chat.id,
            action=ChatAction.TYPING,
        )

        result = await asyncio.to_thread(
            lambda: safe_response(
                respond(
                    session_id,
                    user_text,
                    "en",
                )
            )
        )

        answer = result.get(
            "text",
            "Sorry, I couldn't process your message.",
        )

        if not isinstance(answer, str) or not answer.strip():
            answer = "Sorry, I couldn't generate a response."

        logger.info("ORCHESTRATOR: Response generated successfully.")

        write_event(
            "telegram_chat_turn",
            telegram_user_id=user.id,
            session_id=session_id,
            state=result.get("state"),
        )

    except Exception:
        logger.exception(
            "ORCHESTRATOR ERROR: Failed to generate response."
        )

        await message.reply_text(
            "I encountered a problem processing your question. "
            "Please try again."
        )
        return

    # --------------------------------------------------
    # 2. Send text response
    # --------------------------------------------------

    try:
        logger.info("TELEGRAM: Sending text response.")

        for start_index in range(0, len(answer), 4000):
            await message.reply_text(
                answer[start_index:start_index + 4000]
            )

        logger.info("TELEGRAM: Text response sent.")

    except Exception:
        logger.exception(
            "TELEGRAM TEXT ERROR: Could not send text response."
        )
        return

    # --------------------------------------------------
    # 3. Generate voice response
    # --------------------------------------------------

    try:
        logger.info("TTS: Generating Hinglish voice response.")

        await context.bot.send_chat_action(
            chat_id=chat.id,
            action=ChatAction.RECORD_VOICE,
        )

        voice_audio = await asyncio.to_thread(
            generate_voice_reply,
            answer,
        )

        logger.info("TTS: Voice generation successful.")

    except Exception:
        logger.exception(
            "TTS ERROR: Could not generate voice response."
        )

        await message.reply_text(
            "Your text response is ready, but I couldn't "
            "generate the voice reply this time."
        )
        return

    # --------------------------------------------------
    # 4. Send voice response
    # --------------------------------------------------

    try:
        voice_file = io.BytesIO(voice_audio)
        voice_file.name = "primecapital_reply.ogg"

        await message.reply_voice(
            voice=voice_file,
            caption="PrimeCapital | Hinglish Voice Reply",
        )

        logger.info("TELEGRAM: Voice response sent successfully.")

        write_event(
            "telegram_voice_reply_sent",
            telegram_user_id=user.id,
            session_id=session_id,
            language="hinglish",
            provider="gnani-timbre-v2.5",
        )

    except Exception:
        logger.exception(
            "TELEGRAM VOICE ERROR: Could not send voice response."
        )

        await message.reply_text(
            "Your text response is ready, but Telegram "
            "couldn't deliver the voice message."
        )


# ==================================================
# TEXT MESSAGE HANDLER
# ==================================================

async def handle_message(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
):
    """Handle normal Telegram text messages."""

    message = update.message
    chat = update.effective_chat

    if not message or not chat:
        return

    if chat.type != "private":
        await message.reply_text(
            "Please interact with PrimeCapital through a private chat."
        )
        return

    text = (message.text or "").strip()

    if text:
        logger.info("INPUT: Received text message.")

        await process_user_message(
            update,
            context,
            text,
        )


# ==================================================
# VOICE MESSAGE HANDLER
# ==================================================

async def handle_voice(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
):
    """
    Receive Telegram voice/audio messages.
    Download -> Convert -> Transcribe -> Process -> Reply.
    """

    message = update.message
    user = update.effective_user
    chat = update.effective_chat

    if not message or not user or not chat:
        return

    if chat.type != "private":
        await message.reply_text(
            "Please interact with PrimeCapital through a private chat."
        )
        return

    if user.id not in consented_users:
        await message.reply_text(
            "Please provide your consent first using /consent."
        )
        return

    # Determine whether this is a voice note or audio attachment.
    if message.voice:
        file_id = message.voice.file_id
        file_name = "telegram_voice.ogg"

    elif message.audio:
        file_id = message.audio.file_id
        file_name = message.audio.file_name or "telegram_audio"

    else:
        await message.reply_text(
            "No supported audio file was found."
        )
        return

    # --------------------------------------------------
    # 1. Download audio from Telegram
    # --------------------------------------------------

    try:
        logger.info("VOICE INPUT: Received audio message.")

        await context.bot.send_chat_action(
            chat_id=chat.id,
            action=ChatAction.TYPING,
        )

        telegram_file = await context.bot.get_file(file_id)

        audio_bytes = bytes(
            await telegram_file.download_as_bytearray()
        )

        if not audio_bytes:
            raise ValueError("Telegram audio download was empty.")

        logger.info(
            "VOICE INPUT: Download successful. Size: %d bytes.",
            len(audio_bytes),
        )

    except Exception:
        logger.exception(
            "VOICE DOWNLOAD ERROR: Could not download Telegram audio."
        )

        await message.reply_text(
            "I couldn't download your voice message. Please try again."
        )
        return

    # --------------------------------------------------
    # 2. Convert Telegram audio into WAV
    # --------------------------------------------------

    try:
        logger.info("VOICE DEBUG: Starting audio conversion.")

        wav_audio = await asyncio.to_thread(
            convert_telegram_audio_to_wav,
            audio_bytes,
        )

        logger.info(
            "VOICE DEBUG: Audio conversion successful. "
            "WAV size: %d bytes.",
            len(wav_audio),
        )

    except Exception:
        logger.exception(
            "AUDIO CONVERSION ERROR: Could not convert Telegram audio."
        )

        await message.reply_text(
            "I received your voice message, but couldn't convert "
            "its audio format. Please try recording again."
        )
        return

    # --------------------------------------------------
    # 3. Transcribe using Gnani Prisma v2.5
    # --------------------------------------------------

    try:
        logger.info(
            "ASR DEBUG: Sending WAV audio to Gnani Prisma v2.5."
        )

        await message.reply_text(
            "Listening to your voice message... 🎧"
        )

        transcription = await asyncio.to_thread(
            lambda: SpeechProvider().transcribe(
                audio_bytes=wav_audio,
                language=TELEGRAM_ASR_LANGUAGE,
                filename="telegram_voice.wav",
            )
        )

        recognized_text = transcription.text.strip()

        if not recognized_text:
            raise ValueError(
                "Gnani Prisma returned an empty transcription."
            )

        logger.info(
            "ASR DEBUG: Transcription successful. "
            "Recognized characters: %d.",
            len(recognized_text),
        )

        write_event(
            "telegram_voice_transcribed",
            telegram_user_id=user.id,
            transcript_length=len(recognized_text),
            provider="gnani-prisma-v2.5",
        )

    except Exception:
        logger.exception(
            "ASR ERROR: Gnani Prisma transcription failed."
        )

        await message.reply_text(
            "I received your voice message, but couldn't "
            "understand it. Please try speaking again or "
            "send your question as text."
        )
        return

    # --------------------------------------------------
    # 4. Show transcription
    # --------------------------------------------------

    try:
        await message.reply_text(
            f"🎤 I heard:\n{recognized_text}"
        )

    except Exception:
        logger.exception(
            "TRANSCRIPT DELIVERY ERROR: Could not send transcript."
        )

    # --------------------------------------------------
    # 5. Process transcript like a normal text message
    # --------------------------------------------------

    logger.info(
        "VOICE INPUT: Passing transcription to PrimeCapital orchestrator."
    )

    await process_user_message(
        update,
        context,
        recognized_text,
    )


# ==================================================
# TELEGRAM COMMANDS
# ==================================================

async def start(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
):
    if not update.message:
        return

    await update.message.reply_text(
        "Welcome to PrimeCapital! 👋\n\n"
        "Your AI-powered business loan assistant.\n\n"
        "You can interact with me using:\n"
        "• Text messages\n"
        "• Voice messages\n\n"
        "I can help with:\n"
        "• Business loan information\n"
        "• Eligibility guidance\n"
        "• EMI calculations\n"
        "• Required documents\n"
        "• Loan product information\n\n"
        "Please provide your consent using /consent."
    )


async def consent(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
):
    user = update.effective_user

    if not update.message or not user:
        return

    consented_users.add(user.id)

    write_event(
        "telegram_consent",
        telegram_user_id=user.id,
    )

    await update.message.reply_text(
        "Consent received successfully! ✅\n\n"
        "You can now send text or voice messages.\n\n"
        "PrimeCapital will provide both text and Hinglish "
        "voice replies."
    )


async def help_command(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
):
    if not update.message:
        return

    await update.message.reply_text(
        "PrimeCapital Help\n\n"
        "/start - Start the bot\n"
        "/consent - Provide consent\n"
        "/help - Show help\n\n"
        "Supported input:\n"
        "• Text messages\n"
        "• Telegram voice notes\n"
        "• Audio attachments\n\n"
        "All successful queries receive text and "
        "Hinglish voice responses."
    )


# ==================================================
# APPLICATION STARTUP
# ==================================================

def main():

    if not BOT_TOKEN:
        raise RuntimeError(
            "TELEGRAM_BOT_TOKEN is missing from your .env file."
        )

    application = (
        Application.builder()
        .token(BOT_TOKEN)
        .build()
    )

    # Commands.
    application.add_handler(
        CommandHandler("start", start)
    )

    application.add_handler(
        CommandHandler("consent", consent)
    )

    application.add_handler(
        CommandHandler("help", help_command)
    )

    # Text messages.
    application.add_handler(
        MessageHandler(
            filters.TEXT & ~filters.COMMAND,
            handle_message,
        )
    )

    # Voice notes and audio attachments.
    application.add_handler(
        MessageHandler(
            filters.VOICE | filters.AUDIO,
            handle_voice,
        )
    )

    logger.info("=" * 55)
    logger.info("PRIMECAPITAL TELEGRAM BOT")
    logger.info("Text input: ENABLED")
    logger.info("Voice input: ENABLED")
    logger.info("Telegram ASR input language: %s", TELEGRAM_ASR_LANGUAGE)
    logger.info("Gnani Prisma ASR: CONFIGURED=%s", bool(config.GNANI_ASR_URL))
    logger.info("Gnani Timbre TTS: CONFIGURED=%s", bool(config.GNANI_TTS_URL))
    logger.info("Hinglish voice replies: ENABLED")
    logger.info("=" * 55)

    application.run_polling()


if __name__ == "__main__":
    main()
