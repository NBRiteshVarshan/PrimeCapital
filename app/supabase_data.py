
"""Narrow, backend-only Supabase access for synthetic SBI demo data."""
from __future__ import annotations

import httpx
from datetime import datetime, timezone
from . import config


class SupabaseNotConfigured(RuntimeError):
    pass


class SupabaseDataError(RuntimeError):
    pass


def is_enabled():
    return bool(config.SUPABASE_ENABLED)


def _headers():
    if not is_enabled():
        raise SupabaseNotConfigured(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
            "in the backend environment."
        )

    key = config.SUPABASE_SERVICE_ROLE_KEY

    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }


def _get(path, params=None):
    try:
        with httpx.Client(
            timeout=config.SUPABASE_HTTP_TIMEOUT_SECONDS
        ) as c:
            r = c.get(
                f"{config.SUPABASE_URL}/rest/v1/{path.lstrip('/')}",
                headers=_headers(),
                params=params or {}
            )

            r.raise_for_status()
            return r.json()

    except SupabaseNotConfigured:
        raise

    except Exception as ex:
        raise SupabaseDataError(
            "Supabase read failed; verify URL, backend key, "
            "schema, and database permissions."
        ) from ex


def lookup_products(query=None):
    payload = {
        "p_query": query.strip()
        if isinstance(query, str) and query.strip()
        else None
    }

    try:
        with httpx.Client(
            timeout=config.SUPABASE_HTTP_TIMEOUT_SECONDS
        ) as c:
            r = c.post(
                f"{config.SUPABASE_URL}/rest/v1/rpc/lookup_demo_products",
                headers=_headers(),
                json=payload
            )

            r.raise_for_status()
            rows = r.json()

            if not isinstance(rows, list):
                raise SupabaseDataError(
                    "Unexpected response from lookup_demo_products."
                )

            return rows

    except SupabaseNotConfigured:
        raise

    except SupabaseDataError:
        raise

    except Exception as ex:
        raise SupabaseDataError(
            "Supabase product lookup failed. Check "
            "lookup_demo_products permissions and backend configuration."
        ) from ex


def _product_id(product_code):
    rows = _get(
        "loan_products",
        {
            "select": "id,product_code",
            "product_code": f"eq.{product_code}",
            "limit": "1"
        }
    )

    return rows[0]["id"] if rows else None


def list_fees(product_code):
    pid = _product_id(product_code)

    return [] if not pid else _get(
        "loan_fees",
        {
            "select": (
                "fee_code,fee_name,fee_type,fee_value,"
                "min_fee_inr,max_fee_inr,tax_applicability,"
                "conditions,source_id"
            ),
            "product_id": f"eq.{pid}",
            "order": "fee_name.asc"
        }
    )


def list_eligibility_rules(product_code):
    pid = _product_id(product_code)

    return [] if not pid else _get(
        "eligibility_rules",
        {
            "select": (
                "rule_name,field_name,operator,value_json,"
                "explanation,source_id"
            ),
            "product_id": f"eq.{pid}",
            "order": "rule_name.asc"
        }
    )


def list_documents(product_code):
    pid = _product_id(product_code)

    return [] if not pid else _get(
        "required_documents",
        {
            "select": (
                "document_name,required_status,condition_text,"
                "explanation,source_id"
            ),
            "product_id": f"eq.{pid}",
            "order": "document_name.asc"
        }
    )


def health_check():
    rows = lookup_products(None)

    return {
        "configured": True,
        "reachable": True,
        "products_returned": len(rows),
        "data_label": "synthetic_demo"
    }


def _post(path, payload, params=None, prefer="return=representation"):
    try:
        headers = _headers()
        headers["Prefer"] = prefer

        with httpx.Client(
            timeout=config.SUPABASE_HTTP_TIMEOUT_SECONDS
        ) as c:
            r = c.post(
                f"{config.SUPABASE_URL}/rest/v1/{path.lstrip('/')}",
                headers=headers,
                params=params or {},
                json=payload
            )

            r.raise_for_status()
            return r.json() if r.content else []

    except SupabaseNotConfigured:
        raise

    except Exception as ex:
        raise SupabaseDataError(
            "Supabase write failed; verify the lead/document "
            "schema and backend permissions."
        ) from ex


def ensure_telegram_lead(
    chat_id: int,
    telegram_user_id: int,
    username: str | None = None
):
    rows = _post(
        "primecapital_leads",
        {
            "channel": "telegram",
            "telegram_chat_id": str(chat_id),
            "telegram_user_id": str(telegram_user_id),
            "telegram_username": username,
            "status": "new"
        },
        params={"on_conflict": "telegram_chat_id"},
        prefer="resolution=merge-duplicates,return=representation"
    )

    return rows[0] if rows else None


def save_telegram_document(
    lead_id: str,
    chat_id: int,
    image_bytes: bytes,
    filename: str,
    extracted: dict
):
    if not is_enabled():
        raise SupabaseNotConfigured(
            "Supabase is required to save uploaded documents."
        )

    import uuid
    import mimetypes

    safe_name = (
        filename.rsplit("/", 1)[-1]
        .rsplit("\\", 1)[-1][:80]
    )

    ext = (
        safe_name.rsplit(".", 1)[-1].lower()
        if "." in safe_name
        else "jpg"
    )

    if ext not in {"jpg", "jpeg", "png", "webp"}:
        ext = "jpg"

    object_path = (
        f"telegram/{lead_id}/{uuid.uuid4().hex}.{ext}"
    )

    content_type = (
        mimetypes.guess_type("x." + ext)[0]
        or "image/jpeg"
    )

    try:
        with httpx.Client(
            timeout=config.SUPABASE_HTTP_TIMEOUT_SECONDS
        ) as c:
            r = c.post(
                f"{config.SUPABASE_URL}/storage/v1/object/"
                f"{config.SUPABASE_DOCUMENT_BUCKET}/{object_path}",
                headers={
                    **_headers(),
                    "Content-Type": content_type,
                    "x-upsert": "false"
                },
                content=image_bytes
            )

            r.raise_for_status()

    except Exception as ex:
        raise SupabaseDataError(
            "Private document upload failed. Check that the "
            "private Storage bucket exists."
        ) from ex

    rows = _post(
        "primecapital_documents",
        {
            "lead_id": lead_id,
            "channel": "telegram",
            "storage_path": object_path,
            "original_filename": safe_name,
            "document_type": extracted["document_type"],
            "masked_identifier": extracted.get("masked_identifier"),
            "format_check": extracted["format_check"],
            "review_status": "pending_human_review",
            "telegram_chat_id": str(chat_id)
        }
    )

    return rows[0] if rows else None


def list_leads_with_documents():
    return _get(
        "primecapital_leads",
        {
            "select": (
                "id,name,phone,loan_interest,conversation_summary,"
                "channel,status,created_at,telegram_username,"
                "primecapital_documents("
                "id,document_type,masked_identifier,format_check,"
                "review_status,storage_path,created_at,rejection_reason,reviewed_at,reviewed_by)"
            ),
            "order": "created_at.desc",
            "limit": "200"
        }
    )


def create_document_signed_url(
    storage_path: str,
    expires_in: int = 300
):
    try:
        with httpx.Client(
            timeout=config.SUPABASE_HTTP_TIMEOUT_SECONDS
        ) as c:
            r = c.post(
                f"{config.SUPABASE_URL}/storage/v1/object/sign/"
                f"{config.SUPABASE_DOCUMENT_BUCKET}/"
                f"{storage_path.lstrip('/')}",
                headers=_headers(),
                json={"expiresIn": expires_in}
            )

            r.raise_for_status()
            data = r.json()

            signed = (
                data.get("signedURL")
                or data.get("signedUrl")
            )

            if not signed:
                raise ValueError("No signed URL returned")

            if signed.startswith("http"):
                return signed

            return f"{config.SUPABASE_URL}/storage/v1{signed}"

    except Exception as ex:
        raise SupabaseDataError(
            "Could not create a temporary document link."
        ) from ex


def update_lead_status(lead_id: str, status: str):
    if status not in {"new", "contacted", "closed"}:
        raise ValueError(
            "Status must be new, contacted, or closed."
        )

    try:
        with httpx.Client(
            timeout=config.SUPABASE_HTTP_TIMEOUT_SECONDS
        ) as c:
            r = c.patch(
                f"{config.SUPABASE_URL}/rest/v1/primecapital_leads",
                headers={
                    **_headers(),
                    "Prefer": "return=representation"
                },
                params={"id": f"eq.{lead_id}"},
                json={"status": status}
            )

            r.raise_for_status()
            rows = r.json()

            return rows[0] if rows else None

    except Exception as ex:
        raise SupabaseDataError(
            "Could not update lead status."
        ) from ex


def review_telegram_document(
    document_id: str,
    decision: str,
    rejection_reason: str | None = None,
):
    """Persist a staff decision, delete the uploaded file, and retain review metadata."""
    if decision not in {"accepted", "rejected"}:
        raise ValueError("Decision must be accepted or rejected.")

    reason = (rejection_reason or "").strip()
    if decision == "rejected" and not reason:
        raise ValueError("A rejection reason is required.")
    if len(reason) > 250:
        raise ValueError("Rejection reason must be 250 characters or fewer.")
    if decision == "accepted":
        reason = ""

    rows = _get(
        "primecapital_documents",
        {
            "select": "id,storage_path,review_status,telegram_chat_id,document_type",
            "id": f"eq.{document_id}",
            "limit": "1",
        },
    )
    if not rows:
        raise ValueError("Document not found.")

    row = rows[0]
    if row.get("review_status") != "pending_human_review":
        raise ValueError("This document has already been reviewed.")

    storage_path = row.get("storage_path")
    if not storage_path:
        raise SupabaseDataError("The document has no storage path. Cannot confirm file deletion.")

    # Delete the private file, but retain its metadata as a minimal review record.
    try:
        with httpx.Client(timeout=config.SUPABASE_HTTP_TIMEOUT_SECONDS) as c:
            response = c.request(
                "DELETE",
                f"{config.SUPABASE_URL}/storage/v1/object/{config.SUPABASE_DOCUMENT_BUCKET}",
                headers=_headers(),
                json={"prefixes": [storage_path.lstrip("/")]},
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as ex:
        raise SupabaseDataError(
            "Supabase Storage deletion failed. "
            f"HTTP {ex.response.status_code}: {ex.response.text[:500]}"
        ) from ex
    except Exception as ex:
        raise SupabaseDataError(f"Could not delete the original document: {str(ex)}") from ex

    # SQL schema permits 'approved' and 'rejected'; 'accepted' is the customer-facing wording.
    db_status = "approved" if decision == "accepted" else "rejected"
    from datetime import datetime, timezone
    try:
        with httpx.Client(timeout=config.SUPABASE_HTTP_TIMEOUT_SECONDS) as c:
            response = c.patch(
                f"{config.SUPABASE_URL}/rest/v1/primecapital_documents",
                headers={**_headers(), "Prefer": "return=representation"},
                params={
                    "id": f"eq.{document_id}",
                    "review_status": "eq.pending_human_review",
                },
                json={
                    "review_status": db_status,
                    "rejection_reason": reason or None,
                    "reviewed_at": datetime.now(timezone.utc).isoformat(),
                    "reviewed_by": "staff_dashboard",
                },
            )
            response.raise_for_status()
            updated_rows = response.json()
            if not updated_rows:
                raise RuntimeError("Review metadata was not updated; the document may have been reviewed concurrently.")
    except Exception as ex:
        raise SupabaseDataError(
            "The uploaded file was deleted, but the review record could not be updated. "
            "Check the document row in Supabase before retrying."
        ) from ex

    return {
        "document_id": document_id,
        "decision": decision,
        "file_deleted": True,
        "record_retained": True,
        "rejection_reason": reason or None,
        "document_type": row.get("document_type") or "document",
        "_telegram_chat_id": row.get("telegram_chat_id"),
        "message": "Document reviewed; uploaded file deleted and review metadata retained.",
    }


def send_telegram_review_feedback(
    chat_id: str | int | None,
    decision: str,
    document_type: str = "document",
    rejection_reason: str | None = None,
):
    """Send the review outcome to the Telegram chat. Returns (sent, error)."""
    if not chat_id:
        return False, "No Telegram chat ID is stored for this submission."
    token = getattr(config, "TELEGRAM_BOT_TOKEN", "")
    if not token:
        return False, "TELEGRAM_BOT_TOKEN is not configured on the backend."

    language = get_telegram_language(chat_id) or "en"
    if decision == "accepted":
        if language == "hi":
            message = (
                f"अच्छी खबर! आपकी ओर से भेजा गया {document_type} हमारी टीम ने स्वीकार कर लिया है। "
                "अपलोड की गई फ़ाइल को अस्थायी दस्तावेज़ स्टोरेज से हटा दिया गया है।"
            )
        else:
            message = (
                f"Good news! Your {document_type} has been accepted by our staff. "
                "The uploaded file has now been removed from our temporary document storage."
            )
    else:
        if language == "hi":
            message = (
                f"समीक्षा के बाद आपका {document_type} स्वीकार नहीं किया जा सका।\n"
                f"कारण: {rejection_reason}\n\n"
                "सही दस्तावेज़ दोबारा जमा करने के लिए /docconsent भेजें और फिर इसी चैट में दस्तावेज़ अपलोड करें।"
            )
        else:
            message = (
                f"Your {document_type} could not be accepted after staff review.\n"
                f"Reason: {rejection_reason}\n\n"
                "To submit a corrected copy, send /docconsent and then upload it in this chat."
            )

    try:
        with httpx.Client(timeout=10) as c:
            response = c.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": str(chat_id), "text": message},
            )
            response.raise_for_status()
            payload = response.json()
            if not payload.get("ok"):
                return False, str(payload.get("description") or "Telegram rejected the message.")
        return True, None
    except Exception as ex:
        return False, str(ex)


def get_telegram_language(chat_id: int | str):
    """Return a saved Telegram reply language ('en'/'hi'), or None."""
    rows = _get(
        "telegram_language_preferences",
        {"select": "preferred_language", "chat_id": f"eq.{chat_id}", "limit": "1"},
    )
    if not rows:
        return None
    language = str(rows[0].get("preferred_language", "")).lower()
    return language if language in {"en", "hi"} else None


def save_telegram_language(chat_id: int | str, language: str):
    """Persist a user's selected reply language in Supabase."""
    language = str(language or "").strip().lower()
    if language not in {"en", "hi"}:
        raise ValueError("Language must be 'en' or 'hi'.")
    rows = _post(
        "telegram_language_preferences",
        {
            "chat_id": str(chat_id),
            "preferred_language": language,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        params={"on_conflict": "chat_id"},
        prefer="resolution=merge-duplicates,return=representation",
    )
    return rows[0] if rows else None
