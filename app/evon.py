"""Evon v3.3 adapter.

Default backend loads gnani/gnani-evon-v3.3-30B-A3B through Hugging Face
Transformers, matching the user's supplied sample. Set EVON_BACKEND=api to use
an optional OpenAI-compatible inference endpoint instead.
"""
import json
import re
from threading import Lock
import httpx
from . import config

class EvonNotConfigured(RuntimeError):
    pass

SYSTEM_PROMPT = (
    "You are an intent and slot extractor for a small-business loan enquiry assistant. "
    "Do not answer financial questions and do not make lending decisions. "
    "Return ONLY a valid JSON object with keys: intent, product, amount_inr, "
    "tenure_months, language, confidence. "
    "intent must be one of product_facts, documents, eligibility_info, "
    "emi_calculation, human_handoff, unknown. Use null for missing slots. "
    "Never infer approval, rejection, eligibility, or creditworthiness."
)
_ALLOWED = {"product_facts", "documents", "eligibility_info", "emi_calculation", "human_handoff", "unknown"}
_model_lock = Lock()
_pipeline = None
_tokenizer = None
_model = None

def _parse_json(text: str) -> dict:
    text = text.strip()
    # Strip a markdown fence if the model emits one despite the instruction.
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.I).strip()
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.S)
        if not match:
            raise ValueError("Evon output did not contain a JSON object.")
        obj = json.loads(match.group(0))
    if not isinstance(obj, dict) or obj.get("intent") not in _ALLOWED:
        raise ValueError("Evon returned an invalid intent/schema.")
    obj.setdefault("product", None)
    obj.setdefault("amount_inr", None)
    obj.setdefault("tenure_months", None)
    obj.setdefault("language", "en")
    obj["confidence"] = max(0.0, min(1.0, float(obj.get("confidence", 0.0))))
    return obj

def _load_local():
    global _pipeline, _tokenizer, _model
    if _pipeline is not None or (_tokenizer is not None and _model is not None):
        return
    with _model_lock:
        if _pipeline is not None or (_tokenizer is not None and _model is not None):
            return
        try:
            from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
        except ImportError as ex:
            raise EvonNotConfigured(
                "Local Evon dependencies are missing. Install them with "
                "`pip install -r requirements-evon.txt`."
            ) from ex
        model_id = config.EVON_HF_MODEL_ID
        # The pipeline route mirrors the provided Hugging Face example.
        # For explicit device_map control, use the AutoTokenizer/AutoModel path.
        try:
            # Match the Hugging Face chat-template interface: pipe(messages).
            # The pipeline is initialized once and reused across requests.
            _pipeline = pipeline(
                "text-generation",
                model=model_id,
                device_map="auto",
                trust_remote_code=config.EVON_TRUST_REMOTE_CODE,
            )
        except Exception as ex:
            _pipeline = None
            raise RuntimeError(
                f"Could not load {model_id}. Check Hugging Face access, model approval, "
                "available RAM/VRAM, and the installed PyTorch/Transformers versions."
            ) from ex

def _interpret_local(message: str, language: str) -> dict:
    _load_local()
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": json.dumps({"message": message, "language": language}, ensure_ascii=False)},
    ]
    with _model_lock:
        result = _pipeline(
            messages,
            max_new_tokens=config.EVON_MAX_NEW_TOKENS,
            do_sample=False,
            return_full_text=True,
        )
    # Chat-capable Transformers pipelines usually return generated_text as a
    # list of role/content messages. Some model/pipeline versions return text.
    generated = result[0].get("generated_text", result[0]) if result else None
    if isinstance(generated, list):
        assistant_messages = [
            item for item in generated
            if isinstance(item, dict) and item.get("role") == "assistant"
        ]
        content = assistant_messages[-1].get("content", "") if assistant_messages else ""
    elif isinstance(generated, str):
        # When a pipeline returns the serialized prompt plus completion, keep
        # the last JSON object; _parse_json safely validates its schema.
        content = generated
    elif isinstance(generated, dict):
        content = generated.get("content", "")
    else:
        content = ""
    return _parse_json(content)

def _interpret_api(message: str, language: str) -> dict:
    url = config.EVON_CHAT_COMPLETIONS_URL
    if not url or not config.EVON_API_KEY:
        raise EvonNotConfigured("API backend requires EVON_CHAT_COMPLETIONS_URL and EVON_API_KEY.")
    body = {
        "model": config.EVON_MODEL_NAME,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps({"message": message, "language": language}, ensure_ascii=False)}
        ],
        "response_format": {"type": "json_object"}
    }
    headers = {"Authorization": f"Bearer {config.EVON_API_KEY}", "Content-Type": "application/json"}
    with httpx.Client(timeout=config.EVON_HTTP_TIMEOUT_SECONDS) as client:
        response = client.post(url, headers=headers, json=body)
        response.raise_for_status()
    return _parse_json(response.json()["choices"][0]["message"]["content"])

def interpret(message: str, language: str = "en") -> dict:
    if not isinstance(message, str) or not message.strip():
        raise ValueError("Message cannot be empty.")
    if config.EVON_BACKEND == "local":
        return _interpret_local(message.strip(), language)
    if config.EVON_BACKEND == "api":
        return _interpret_api(message.strip(), language)
    raise EvonNotConfigured("EVON_BACKEND must be 'local' or 'api'.")
