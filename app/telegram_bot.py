"""
PrimeCapital Telegram Bot

Features:
- /start, /consent and /help
- Normal text message handling
- Telegram voice message handling
- Telegram audio attachment handling
- Gnani Prisma v2.5 speech-to-text
- Gnani Timbre v2.5 text-to-speech
- User-selected English/Hindi voice replies
- Text + voice responses for both input methods
- Detailed diagnostic logging
"""

import asyncio
import os
import io
import logging
import subprocess

from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    CallbackQueryHandler,
    filters,
)

from . import config
from .orchestrator import respond, safe_response
from .speech import SpeechProvider
from .audit import write_event
from . import supabase_data
from .document_ocr import extract_document
from .localization import localize_text, normalize_language


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
document_consented_users = set()

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

def generate_voice_reply(text: str, language: str = "en") -> bytes:
    """
    Generate speech in the user's selected language using Gnani Timbre v2.5.
    Convert WAV output into Telegram-compatible OGG/Opus.
    """

    if not text or not text.strip():
        raise ValueError("Cannot synthesize empty text.")

    logger.info("TTS: Sending response to Gnani Timbre.")

    wav_audio = SpeechProvider().synthesize(
        text=text,
        language=normalize_language(language),
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
# REPLY LANGUAGE PREFERENCE
# ==================================================

def language_keyboard():
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("English 🇬🇧", callback_data="reply_language:en"),
        InlineKeyboardButton("हिन्दी 🇮🇳", callback_data="reply_language:hi"),
    ]])


async def ask_reply_language(message):
    await message.reply_text(
        "Which language would you prefer for PrimeCapital's replies?\n"
        "आप PrimeCapital के जवाब किस भाषा में चाहते हैं?\n\n"
        "Choose one option below. You can change it anytime using /language.",
        reply_markup=language_keyboard(),
    )


async def get_reply_language(chat_id: int):
    try:
        return await asyncio.to_thread(supabase_data.get_telegram_language, chat_id)
    except Exception:
        logger.exception("Could not load Telegram reply-language preference.")
        return None


async def set_reply_language_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    chat = update.effective_chat
    user = update.effective_user
    if not query or not chat or not user:
        return
    await query.answer()
    language = (query.data or "").split(":", 1)[-1].strip().lower()
    if language not in {"en", "hi"}:
        await query.edit_message_text("Invalid language selection. Please use /language.")
        return
    try:
        await asyncio.to_thread(supabase_data.save_telegram_language, chat.id, language)
    except Exception:
        logger.exception("Could not save Telegram reply-language preference.")
        await query.edit_message_text(
            "I couldn't save your language preference. Please try again in a moment.\n"
            "आपकी भाषा की पसंद सेव नहीं हो पाई। कृपया थोड़ी देर बाद फिर कोशिश करें।"
        )
        return
    context.user_data["reply_language"] = language
    confirmation = (
        "Language set to English. All future replies will be in English."
        if language == "en" else
        "भाषा हिन्दी चुन ली गई है। अब से मेरे सभी जवाब हिन्दी में होंगे।"
    )
    await query.edit_message_text(confirmation)
    write_event("telegram_reply_language_selected", telegram_user_id=user.id, language=language)


async def language_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message:
        return
    await ask_reply_language(update.message)


# ==================================================
# SHARED RESPONSE PROCESSOR
# ==================================================

def is_document_upload_intent(text: str) -> bool:
    """
    Detect a user's intention to submit a PAN card or GST document.

    This runs before the normal evidence-gated orchestrator and therefore
    handles both typed messages and voice transcripts.
    """
    low = (text or "").lower()

    document_terms = (
        "pan", "gst", "gstin", "document", "paperwork", "certificate"
    )
    action_terms = (
        "upload", "submit", "send", "share", "attach",
        "verify", "verification", "provide"
    )

    return (
        any(term in low for term in document_terms)
        and any(term in low for term in action_terms)
    )


async def process_user_message(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    user_text: str,
):
    """
    Process either a normal text message or an ASR transcript.

    Both input types use the same orchestrator and use the saved reply language.
    """

    message = update.message
    user = update.effective_user
    chat = update.effective_chat

    if not message or not user or not chat:
        return

    reply_language = await get_reply_language(chat.id) or "en"
    if user.id not in consented_users:
        await message.reply_text(localize_text("Please provide your consent first using /consent.", reply_language))
        return

    reply_language = await get_reply_language(chat.id)
    if not reply_language:
        await ask_reply_language(message)
        return
    context.user_data["reply_language"] = reply_language

    user_text = (user_text or "").strip()

    if not user_text:
        await message.reply_text(localize_text(
            "I couldn't understand your message. Please try again.", reply_language
        ))
        return

    # --------------------------------------------------
    # DOCUMENT UPLOAD INTENT ROUTING
    # Run before the normal AI orchestrator. Voice transcripts
    # also enter this function, so both input methods are covered.
    # --------------------------------------------------

    if is_document_upload_intent(user_text):
        if user.id not in document_consented_users:
            await message.reply_text(localize_text(
                "You want to submit a document for verification. Before uploading, please review and accept our document-processing notice using /docconsent.", reply_language
            ))
            return

        context.user_data["awaiting_document"] = True

        await message.reply_text(localize_text(
            "Certainly! Please upload a clear photo of your PAN card or GST certificate here.\n\nOur system will extract the document information and forward it to our team for human verification.", reply_language
        ))
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
                    reply_language,
                )
            )
        )

        answer = result.get(
            "text",
            localize_text("Sorry, I couldn't process your message.", reply_language),
        )

        if not isinstance(answer, str) or not answer.strip():
            answer = localize_text("Sorry, I couldn't generate a response.", reply_language)
        answer = localize_text(answer, reply_language)

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

        await message.reply_text(localize_text(
            "I encountered a problem processing your question. Please try again.", reply_language
        ))
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
        logger.info("TTS: Generating %s voice response.", reply_language)

        await context.bot.send_chat_action(
            chat_id=chat.id,
            action=ChatAction.RECORD_VOICE,
        )

        voice_audio = await asyncio.to_thread(
            generate_voice_reply,
            answer,
            reply_language,
        )

        logger.info("TTS: Voice generation successful.")

    except Exception:
        logger.exception(
            "TTS ERROR: Could not generate voice response."
        )

        await message.reply_text(localize_text(
            "Your text response is ready, but I couldn't generate the voice reply this time.", reply_language
        ))
        return

    # --------------------------------------------------
    # 4. Send voice response
    # --------------------------------------------------

    try:
        voice_file = io.BytesIO(voice_audio)
        voice_file.name = "primecapital_reply.ogg"

        await message.reply_voice(
            voice=voice_file,
            caption=("PrimeCapital | English Voice Reply" if reply_language == "en" else "PrimeCapital | Hindi Voice Reply"),
        )

        logger.info("TELEGRAM: Voice response sent successfully.")

        write_event(
            "telegram_voice_reply_sent",
            telegram_user_id=user.id,
            session_id=session_id,
            language=reply_language,
            provider="gnani-timbre-v2.5",
        )

    except Exception:
        logger.exception(
            "TELEGRAM VOICE ERROR: Could not send voice response."
        )

        await message.reply_text(localize_text(
            "Your text response is ready, but Telegram couldn't deliver the voice message.", reply_language
        ))


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
        await message.reply_text(localize_text("Please interact with PrimeCapital through a private chat.", await get_reply_language(chat.id) or "en"))
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
        await message.reply_text(localize_text("Please interact with PrimeCapital through a private chat.", await get_reply_language(chat.id) or "en"))
        return

    reply_language = await get_reply_language(chat.id) or "en"
    if user.id not in consented_users:
        await message.reply_text(localize_text("Please provide your consent first using /consent.", reply_language))
        return

    reply_language = await get_reply_language(chat.id)
    if not reply_language:
        await ask_reply_language(message)
        return
    context.user_data["reply_language"] = reply_language

    # Determine whether this is a voice note or audio attachment.
    if message.voice:
        file_id = message.voice.file_id
        file_name = "telegram_voice.ogg"

    elif message.audio:
        file_id = message.audio.file_id
        file_name = message.audio.file_name or "telegram_audio"

    else:
        await message.reply_text(localize_text("No supported audio file was found.", reply_language))
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

        await message.reply_text(localize_text("I couldn't download your voice message. Please try again.", reply_language))
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

        await message.reply_text(localize_text("I received your voice message, but couldn't convert its audio format. Please try recording again.", reply_language))
        return

    # --------------------------------------------------
    # 3. Transcribe using Gnani Prisma v2.5
    # --------------------------------------------------

    try:
        logger.info(
            "ASR DEBUG: Sending WAV audio to Gnani Prisma v2.5."
        )

        await message.reply_text(localize_text("Listening to your voice message... 🎧", reply_language))

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

        await message.reply_text(localize_text("I received your voice message, but couldn't understand it. Please try speaking again or send your question as text.", reply_language))
        return

    # --------------------------------------------------
    # 4. Show transcription
    # --------------------------------------------------

    try:
        transcript_label = "🎤 I heard:" if reply_language == "en" else "🎤 मैंने यह सुना:"
        await message.reply_text(f"{transcript_label}\n{recognized_text}")

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
# DOCUMENT PHOTO / OCR HANDLER
# ==================================================

async def handle_document_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """OCR a PAN/GST image locally, store original in a private bucket, queue human review."""
    message, user, chat = update.message, update.effective_user, update.effective_chat
    if not message or not user or not chat:
        return
    if chat.type != "private":
        await message.reply_text(localize_text("Please interact with PrimeCapital through a private chat.", await get_reply_language(chat.id) or "en"))
        return
    if user.id not in consented_users or user.id not in document_consented_users:
        await message.reply_text(localize_text("Before uploading identity documents, use /docconsent to review and accept the document-processing notice.", await get_reply_language(chat.id) or "en"))
        return
    if not context.user_data.get("awaiting_document"):
        await message.reply_text(localize_text("Please request document submission first, then upload the requested PAN or GST photo.", await get_reply_language(chat.id) or "en"))
        return
    if not message.photo:
        return
    photo = message.photo[-1]
    if photo.file_size and photo.file_size > config.TELEGRAM_DOCUMENT_MAX_BYTES:
        await message.reply_text(localize_text("This image is too large. Please send a clear image under 8 MB.", await get_reply_language(chat.id) or "en"))
        return
    try:
        await context.bot.send_chat_action(chat_id=chat.id, action=ChatAction.TYPING)
        tg_file = await context.bot.get_file(photo.file_id)
        image_bytes = bytes(await tg_file.download_as_bytearray())
        if len(image_bytes) > config.TELEGRAM_DOCUMENT_MAX_BYTES:
            raise ValueError("Image exceeds the 8 MB upload limit.")
        extracted = await asyncio.to_thread(extract_document, image_bytes)
        lead = await asyncio.to_thread(
            lambda: supabase_data.ensure_telegram_lead(chat.id, user.id, user.username)
        )
        if not lead or not lead.get("id"):
            raise RuntimeError("Could not create or retrieve the lead record.")
        saved = await asyncio.to_thread(
            lambda: supabase_data.save_telegram_document(
                lead["id"], chat.id, image_bytes, "telegram_document.jpg", extracted
            )
        )
        context.user_data.pop("awaiting_document", None)

        write_event("telegram_document_received", lead_id=lead["id"], document_id=(saved or {}).get("id"),
                    document_type=extracted["document_type"], format_check=extracted["format_check"],
                    review_status="pending_human_review")
        reply_language = await get_reply_language(chat.id) or "en"
        reply = localize_text(
            "Thank you, your documents have been sent for human verification.\n\nOur team will review the uploaded document. The automated check only reads the document and checks its format; it does not confirm authenticity or approval.",
            reply_language,
        )
        await message.reply_text(reply)
        try:
            audio = await asyncio.to_thread(generate_voice_reply, reply, reply_language)
            voice = io.BytesIO(audio); voice.name = "primecapital_document_update.ogg"
            await message.reply_voice(voice=voice, caption=("PrimeCapital | Document review update" if reply_language == "en" else "PrimeCapital | दस्तावेज़ अपडेट"))
        except Exception:
            logger.exception("Could not synthesize document acknowledgement voice reply.")
    except ValueError as exc:
        await message.reply_text(localize_text(str(exc), await get_reply_language(chat.id) or "en"))
    except Exception:
        logger.exception("DOCUMENT OCR / STORAGE ERROR")
        await message.reply_text(localize_text("I couldn't process or securely save that document. Please try again later or contact our team.", await get_reply_language(chat.id) or "en"))


# ==================================================
# TELEGRAM COMMANDS
# ==================================================

async def start(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
):
    if not update.message:
        return

    saved_language = await get_reply_language(update.effective_chat.id) if update.effective_chat else None
    if saved_language == "hi":
        welcome = ("PrimeCapital में आपका स्वागत है! 👋\n\n"
            "मैं आपका बिज़नेस लोन सहायक हूँ। आप टेक्स्ट या वॉइस संदेश भेज सकते हैं।\n\n"
            "मैं बिज़नेस लोन की जानकारी, शुरुआती पात्रता, EMI अनुमान, आवश्यक दस्तावेज़ और लोन प्रोडक्ट की जानकारी दे सकता हूँ।\n\n"
            "बॉट का उपयोग करने के लिए /consent दें। भाषा बदलने के लिए /language लिखें।\n"
            "PAN/GST दस्तावेज़ अपलोड करने से पहले /docconsent की सूचना पढ़ें।")
    else:
        welcome = (
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
            "Please provide your consent using /consent. After consent, choose English or Hindi for all replies.\n"
            "Use /language anytime to change your reply language.\n"
            "For optional PAN/GST document upload, review the notice with /docconsent."
        )
    await update.message.reply_text(welcome)


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

    saved_language = await get_reply_language(update.effective_chat.id) if update.effective_chat else None
    if saved_language:
        context.user_data["reply_language"] = saved_language
        confirmation = (
            "Consent received successfully! You can now send text or voice messages. Your saved reply language is English. Use /language to change it."
            if saved_language == "en" else
            "आपकी सहमति मिल गई है। अब आप टेक्स्ट या वॉइस संदेश भेज सकते हैं। आपकी जवाब की भाषा हिन्दी है। इसे बदलने के लिए /language लिखें।"
        )
        await update.message.reply_text(confirmation)
    else:
        await update.message.reply_text(
            "Consent received successfully! ✅\n\n"
            "You can now send text or voice messages.\n\n"
            "Before we begin, please choose the language in which you want to receive all replies."
        )
        await ask_reply_language(update.message)


async def document_consent(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not update.message or not user:
        return
    if user.id not in consented_users:
        await update.message.reply_text("Please use /consent first.")
        return
    document_consented_users.add(user.id)
    # Consent follows an explicit document-upload request in the normal flow.
    # Mark the chat ready so the next photo is not rejected as unexpected.
    context.user_data["awaiting_document"] = True
    write_event("telegram_document_consent", telegram_user_id=user.id)
    reply_language = await get_reply_language(update.effective_chat.id) or "en"
    doc_notice = ("Document upload consent received. You may now send a clear photo of your PAN card or GST certificate.\n\nYour original image will be stored in a private Supabase bucket for staff review. OCR runs locally and extracts only the document category and a masked identifier. Automated checks do not verify authenticity. Please upload only documents you are authorised to share. Use /stopdoc to disable document uploads.")
    await update.message.reply_text(localize_text(doc_notice, reply_language))

async def stop_document_consent(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if user:
        document_consented_users.discard(user.id)
    if update.message:
        reply_language = await get_reply_language(update.effective_chat.id) or "en"
        await update.message.reply_text(localize_text("Document uploads are disabled for this chat.", reply_language))


async def help_command(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
):
    if not update.message:
        return

    reply_language = await get_reply_language(update.effective_chat.id) or "en"
    help_text = (
        "PrimeCapital Help\n\n"
        "/start - Start the bot\n"
        "/consent - Provide general bot consent\n"
        "/docconsent - Opt in to PAN/GST document processing\n"
        "/stopdoc - Disable document uploads\n"
        "/language - Change reply language (English/Hindi)\n"
        "/help - Show help\n\n"
        "Supported input:\n"
        "• Text messages\n"
        "• Telegram voice notes\n"
        "• Audio attachments\n"
        "• PAN/GST document photos (after /docconsent)\n\n"
        "All successful queries receive text and voice responses in your selected language."
    )
    if reply_language == "hi":
        help_text = ("PrimeCapital सहायता\n\n"
            "/start - बॉट शुरू करें\n/consent - सामान्य सहमति दें\n"
            "/docconsent - PAN/GST दस्तावेज़ प्रोसेसिंग की अनुमति दें\n"
            "/stopdoc - दस्तावेज़ अपलोड बंद करें\n/language - जवाब की भाषा बदलें\n"
            "/help - सहायता दिखाएं\n\n"
            "आप टेक्स्ट, वॉइस नोट, ऑडियो और सहमति के बाद PAN/GST दस्तावेज़ की फोटो भेज सकते हैं।\n"
            "सभी जवाब आपकी चुनी हुई भाषा में टेक्स्ट और आवाज़ के रूप में मिलेंगे।")
    await update.message.reply_text(help_text)


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
    application.add_handler(CommandHandler("language", language_command))
    application.add_handler(CallbackQueryHandler(set_reply_language_callback, pattern=r"^reply_language:(en|hi)$"))
    application.add_handler(CommandHandler("docconsent", document_consent))
    application.add_handler(CommandHandler("stopdoc", stop_document_consent))

    # Text messages.
    application.add_handler(
        MessageHandler(
            filters.TEXT & ~filters.COMMAND,
            handle_message,
        )
    )

    # Document photos.
    application.add_handler(MessageHandler(filters.PHOTO, handle_document_photo))

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
    logger.info("User-selected English/Hindi replies: ENABLED")
    logger.info("=" * 55)

    application.run_polling()


if __name__ == "__main__":
    main()
