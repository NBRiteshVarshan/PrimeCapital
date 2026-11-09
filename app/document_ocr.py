"""Local OCR and format-only checks for Telegram document images.

This module never declares a PAN/GST certificate authentic. OCR output is
minimised: only document type, masked identifier and a review flag are kept.
"""
from __future__ import annotations
import io, re
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
import pytesseract

PAN_RE = re.compile(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", re.I)
GSTIN_RE = re.compile(r"\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b", re.I)

def _mask(value: str) -> str:
    return "*" * max(0, len(value) - 4) + value[-4:]

def extract_document(image_bytes: bytes) -> dict:
    if not image_bytes or len(image_bytes) > 8 * 1024 * 1024:
        raise ValueError("Image must be non-empty and no larger than 8 MB.")
    try:
        image = Image.open(io.BytesIO(image_bytes))
        if image.format not in {"JPEG", "PNG", "WEBP"}:
            raise ValueError("Send a JPG, PNG or WEBP image.")
        image = ImageOps.exif_transpose(image).convert("L")
        if image.width * image.height > 24_000_000:
            raise ValueError("Image dimensions are too large.")
        image.thumbnail((2200, 2200))
        image = ImageEnhance.Contrast(image).enhance(1.7).filter(ImageFilter.SHARPEN)
    except (OSError, Image.DecompressionBombError) as exc:
        raise ValueError("The uploaded image could not be opened safely.") from exc
    try:
        text = pytesseract.image_to_string(image, config="--psm 6")
    except pytesseract.TesseractNotFoundError as exc:
        raise RuntimeError("Tesseract OCR is not installed. Install the Tesseract system package.") from exc
    cleaned = re.sub(r"[^A-Z0-9\n ]", " ", text.upper())
    pan = PAN_RE.search(cleaned.replace(" ", ""))
    gst = GSTIN_RE.search(cleaned.replace(" ", ""))
    if gst:
        value, kind = gst.group(1).upper(), "GST_CERTIFICATE"
    elif pan:
        value, kind = pan.group(1).upper(), "PAN_CARD"
    else:
        value, kind = None, "UNCLASSIFIED"
    return {
        "document_type": kind,
        "masked_identifier": _mask(value) if value else None,
        "format_check": "passed" if value else "not_detected",
        "review_status": "pending_human_review",
    }
