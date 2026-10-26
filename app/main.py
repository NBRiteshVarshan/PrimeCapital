from fastapi import FastAPI,Request,HTTPException,UploadFile,File,Form
from fastapi.responses import FileResponse,JSONResponse,Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel,Field
from uuid import uuid4
from collections import defaultdict,deque
import time
from .config import STATIC_DIR
from .facts import all_products,public_product
from .orchestrator import respond,safe_response
from .store import create_enquiry,list_enquiries,update_enquiry
from .audit import write_event,read_events
from .speech import SpeechProvider, ProviderNotConfigured
from .evon import interpret as evon_interpret, EvonNotConfigured
from . import config as app_config
from . import supabase_data
app=FastAPI(title="LoanSaathi AI",version="0.1.0",description="Evidence-grounded fictional loan enquiry assistant")
app.mount("/static",StaticFiles(directory=str(STATIC_DIR)),name="static")
reqs=defaultdict(deque)
@app.middleware("http")
async def gateway(request:Request,call_next):
 rid=str(uuid4());request.state.request_id=rid;ip=request.client.host if request.client else "unknown";q=reqs[ip];now=time.time()
 while q and now-q[0]>60:q.popleft()
 if request.url.path.startswith("/api/") and len(q)>=120:return JSONResponse(status_code=429,content={"detail":"Rate limit exceeded","request_id":rid})
 q.append(now);res=await call_next(request);res.headers["X-Request-ID"]=rid;return res
class ChatIn(BaseModel):
 session_id:str=Field(min_length=1,max_length=100)
 message:str=Field(min_length=1,max_length=2000)
 language:str=Field(default="en",pattern="^(en|hi|hinglish)$")
 consent:bool
class HandoffIn(BaseModel):
 summary:str=Field(min_length=1,max_length=1200)
 language:str="en"
class StaffUpdate(BaseModel):
 status:str|None=None
 assigned_to:str|None=None
 feedback_label:str|None=None
class ConfirmIn(BaseModel):
 session_id:str
 confirmed:bool
@app.get("/")
def home():return FileResponse(STATIC_DIR/"index.html")
@app.get("/staff")
def staff():return FileResponse(STATIC_DIR/"staff.html")
@app.get("/api/health")
def health():
 from . import config
 db_status = {"configured": config.SUPABASE_ENABLED, "reachable": False, "products_returned": 0}
 if config.SUPABASE_ENABLED:
  try: db_status = supabase_data.health_check()
  except Exception: db_status = {"configured": True, "reachable": False, "products_returned": 0}
 return {"status":"ok","mode":"synthetic_demo","supabase":db_status,
         "speech":{"asr":"configured" if config.GNANI_ASR_URL else "not_configured",
                   "tts":"configured" if config.GNANI_TTS_URL else "not_configured",
                   "asr_model":"Prisma v2.5","tts_model":"Timbre v2.5"},
         "reasoning_model":{"name":"Evon v3.3","backend":config.EVON_BACKEND,"model_id":config.EVON_HF_MODEL_ID if config.EVON_BACKEND == "local" else config.EVON_MODEL_NAME,"mode":"configured" if (config.EVON_BACKEND == "local" or (config.EVON_CHAT_COMPLETIONS_URL and config.EVON_API_KEY)) else "not_configured"}}
@app.get("/api/products")
def products():
    if app_config.SUPABASE_ENABLED:
        try:
            rows = supabase_data.lookup_products(None)
            return [{
                "id": r.get("product_code"), "name": r.get("product_name"),
                "category": r.get("product_category"), "currency": "INR",
                "min_amount": r.get("min_amount_inr"), "max_amount": r.get("max_amount_inr"),
                "annual_interest_rate": float(r["indicative_annual_rate_pct"]) / 100 if r.get("indicative_annual_rate_pct") is not None else None,
                "min_tenure_months": r.get("min_tenure_months"), "max_tenure_months": r.get("max_tenure_months"),
                "collateral_required": r.get("collateral_required"), "description": r.get("description"),
                "source_id": r.get("source_code"), "source_title": "Synthetic SBI-style MSME training policy pack",
                "source_version": "v1.0", "synthetic_demo": True,
                "notice": "Synthetic training data only; not an official SBI offer."
            } for r in rows]
        except supabase_data.SupabaseDataError as ex:
            raise HTTPException(503, str(ex))
    return [public_product(p) for p in all_products()]

@app.get("/api/supabase/status")
def supabase_status():
    if not app_config.SUPABASE_ENABLED:
        return {"configured": False, "reachable": False, "message": "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the backend environment."}
    try: return supabase_data.health_check()
    except Exception: raise HTTPException(503, "Supabase is configured but the lookup failed. Verify backend credentials and RPC permissions.")
@app.post("/api/chat")
def chat(p:ChatIn,request:Request):
 if not p.consent:raise HTTPException(403,"Consent is required before collecting enquiry details.")
 result=safe_response(respond(p.session_id,p.message,p.language))
 write_event("chat_turn",request_id=request.state.request_id,session_id=p.session_id,language=p.language,user_message_redacted=p.message[:200],state=result.get("state"),sources=result.get("sources",[]))
 return result
@app.post("/api/confirm")
def confirm(p:ConfirmIn,request:Request):
 result=safe_response(respond(p.session_id,"confirm" if p.confirmed else "cancel"))
 write_event("calculation_confirmation",request_id=request.state.request_id,session_id=p.session_id,confirmed=p.confirmed);return result
@app.post("/api/ai/interpret")
def ai_interpret(payload: dict):
    message = payload.get("message")
    language = payload.get("language", "en")
    if not isinstance(message, str) or not message.strip() or len(message) > 2000:
        raise HTTPException(422, "Provide a message between 1 and 2000 characters.")
    try:
        result = evon_interpret(message, language)
        write_event("evon_nlu_interpretation", intent=result.get("intent"), confidence=result.get("confidence"), language=language)
        return {"model":"Evon v3.3","advisory_only":True,"interpretation":result,
                "notice":"This interpretation does not trigger tools or make lending decisions."}
    except EvonNotConfigured as ex:
        raise HTTPException(503, str(ex))
    except Exception as ex:
        write_event("evon_error", error_type=type(ex).__name__)
        raise HTTPException(502, "Evon inference failed. Check endpoint compatibility and model response schema.")

@app.post("/api/speech/transcribe")
async def speech_transcribe(file: UploadFile = File(...), language: str = Form("en"), consent: bool = Form(False)):
    if not consent:
        raise HTTPException(403, "Consent is required before processing audio.")
    if language not in {"en", "hi", "hinglish"}:
        raise HTTPException(422, "Unsupported demo language code.")
    audio = await file.read()
    if len(audio) > 15 * 1024 * 1024:
        raise HTTPException(413, "Audio must be 15 MB or smaller.")
    try:
        result = SpeechProvider().transcribe(audio, language, file.filename or "utterance.webm")
        write_event("speech_transcribed", provider=result.provider, language=language, audio_bytes=len(audio))
        return {"text": result.text, "provider": result.provider, "model": "Prisma v2.5"}
    except ProviderNotConfigured as ex:
        raise HTTPException(503, str(ex))
    except Exception as ex:
        write_event("speech_error", stage="asr", error_type=type(ex).__name__, error=str(ex)[:500])
        # Local demo: return the provider's actionable error rather than masking it.
        raise HTTPException(502, f"ASR request failed: {str(ex)[:500]}")

@app.post("/api/speech/synthesize")
def speech_synthesize(payload: dict):
    text = payload.get("text")
    language = payload.get("language", "en")
    if not isinstance(text, str) or not text.strip() or len(text) > 4000:
        raise HTTPException(422, "Provide text between 1 and 4000 characters.")
    if language not in {"en", "hi", "hinglish"}:
        raise HTTPException(422, "Unsupported demo language code.")
    try:
        audio = SpeechProvider().synthesize(text, language)
        write_event("speech_synthesized", provider="gnani-timbre-v2.5", language=language, text_length=len(text))
        return Response(content=audio, media_type="audio/wav")
    except ProviderNotConfigured as ex:
        raise HTTPException(503, str(ex))
    except Exception as ex:
        write_event("speech_error", stage="tts", error_type=type(ex).__name__)
        raise HTTPException(502, "TTS request failed. Verify the provider URL, credentials, payload fields and response mapping.")

@app.post("/api/handoff")
def handoff(p:HandoffIn):
 x=create_enquiry(p.summary,"handoff",language=p.language);write_event("handoff_created",enquiry_id=x["id"],reason="explicit_api_handoff");return x
@app.get("/api/staff/enquiries")
def enquiries():return list_enquiries()
@app.patch("/api/staff/enquiries/{eid}")
def patch(eid:str,p:StaffUpdate):
 try:x=update_enquiry(eid,p.status,p.assigned_to,p.feedback_label)
 except ValueError as ex:raise HTTPException(422,str(ex))
 if not x:raise HTTPException(404,"Enquiry not found")
 write_event("staff_enquiry_updated",enquiry_id=eid,status=x["status"],assigned_to=x["assigned_to"],feedback_label=x["feedback_label"]);return x
@app.get("/api/staff/audit")
def audit():return read_events()
