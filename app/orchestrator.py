import re
from .facts import all_products,get_product
from .retrieval import search
from .calculator import calculate_emi
from .guardrails import check_response
from .store import create_enquiry
from .audit import write_event
from . import config
from . import supabase_data
_sessions={}
def sess(sid):return _sessions.setdefault(sid,{"state":"DISCOVERY","pending":None,"turns":0})
def detect_product(msg):
 q=msg.lower(); matches=[p for p in all_products() if p["name"].lower() in q or p["id"].lower() in q]
 if len(matches)==1:return matches[0]
 if len(matches)>1:return None
 for alias,pid in [("working capital","WC-FLEX-01"),("equipment","EQ-TERM-01"),("overdraft","MER-OD-01"),("merchant","MER-OD-01")]:
  if alias in q:return get_product(pid)
 return None
def respond(sid,message,language="en"):
 s=sess(sid);s["turns"]+=1; raw=message.strip(); low=raw.lower()
 if not raw:return {"text":"Please type your question.","state":s["state"],"sources":[]}
 if any(x in low for x in ["talk to a person","human","agent","call me","complaint","dispute","fraud","scam"]):
  e=create_enquiry(raw,"handoff",language=language);s["state"]="HANDOFF";s["pending"]=None
  write_event("handoff_created",session_id=sid,enquiry_id=e["id"],reason="user_or_risk_trigger")
  return {"text":"I’ll pass this to the staff team. A handoff record has been created; no lending decision has been made.","state":"HANDOFF","sources":[],"enquiry_id":e["id"]}
 if s["pending"]:
  if low in {"confirm","yes","correct","haan","हाँ"}:
   pending=s["pending"];s["pending"]=None
   try:
    r=calculate_emi(pending["product_id"],pending["amount"],pending["months"]);s["state"]="CALCULATE"
    text=f"Illustrative estimate for {r['product_name']}: monthly EMI ₹{r['monthly_emi_inr']}; annual interest rate {r['annual_interest_rate']*100:.2f}%; total interest ₹{r['total_interest_inr']}; listed fees ₹{r['processing_and_other_fees_inr']}; illustrative total outflow ₹{r['illustrative_total_outflow_inr']}. This is not an offer or lending decision."
    write_event("calculation_completed",session_id=sid,result={k:v for k,v in r.items() if k!="schedule"})
    return {"text":text,"state":s["state"],"sources":[{"source_id":r["source_id"],"version":r["source_version"],"type":"structured_product_fact"}],"calculation":{k:v for k,v in r.items() if k!="schedule"}}
   except ValueError as ex:return {"text":str(ex),"state":"CLARIFY","sources":[]}
  if low in {"cancel","no","wrong","nahi","नहीं"}:s["pending"]=None;s["state"]="CLARIFY";return {"text":"No calculation made. Correct the amount, tenure, or product and try again.","state":s["state"],"sources":[]}
  return {"text":"Reply `confirm` if correct, or `cancel` and enter the values again.","state":"CLARIFY","sources":[]}
 # When configured, the synthetic SBI database is the source of truth for bank-specific facts.
 if config.SUPABASE_ENABLED:
  db_intent = None
  if any(k in low for k in ["document", "paperwork", "required file", "checklist"]): db_intent = "documents"
  elif any(k in low for k in ["eligib", "qualify", "eligible", "criteria", "turnover", "business vintage", "age requirement"]): db_intent = "eligibility"
  elif any(k in low for k in ["fee", "charge", "processing"]): db_intent = "fees"
  elif any(k in low for k in ["rate", "interest", "limit", "amount", "product", "loan", "business loans", "types of loans", "what loans", "working capital", "equipment", "overdraft", "term loan", "merchant", "msme"]): db_intent = "product"
  if db_intent:
   try:
    aliases = [("working capital", ["working capital", "working-capital", "wc"]),
               ("equipment", ["equipment", "machinery", "equipment finance"]),
               ("overdraft", ["overdraft", "merchant overdraft", "od"]),
               ("term loan", ["term loan", "msme loan", "business term"])]
    search_term = None
    for term, words in aliases:
     if any(w in low for w in words): search_term = term; break
    # Fetch the complete, small synthetic catalogue first. Filtering in Python
    # avoids false negatives when Postgres RPC text matching differs from aliases.
    all_db_rows = supabase_data.lookup_products(None)
    def norm(value):
     return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()
    aliases = {
     "working capital": ("working capital", "working-capital", "wc flex", "wc"),
     "equipment": ("equipment", "machinery", "equipment finance", "equipment growth"),
     "overdraft": ("overdraft", "merchant overdraft", "merchant", " od "),
     "term loan": ("term loan", "msme loan", "business term", "msme term"),
    }
    if search_term:
     terms = aliases.get(search_term, (search_term,))
     db_rows = [r for r in all_db_rows if any(norm(term) in norm(r.get("product_name")) or norm(term) in norm(r.get("product_category")) or (term == "working capital" and "wc" in norm(r.get("product_code"))) for term in terms)]
    else:
     db_rows = all_db_rows
    # If the user asked for the catalogue, list it instead of asking for one product.
    is_catalogue_question = any(k in low for k in ["what type", "what types", "types of", "which loans", "what loans", "loan options", "loan option", "options available", "available loans", "available loan", "all products", "list products", "business loans available"])
    if not db_rows:
     return {"text":"I couldn’t match that product in the synthetic demo database. Please try Working Capital Flex, MSME Term Loan, Equipment Growth Loan, or Merchant Overdraft.","state":"CLARIFY","sources":[]}
    if is_catalogue_question and len(db_rows) > 1:
     names = "; ".join(f"{r.get('product_name')} (code {r.get('product_code')})" for r in db_rows)
     return {"text":f"The synthetic demo catalogue contains: {names}. These are fictional training records, not official SBI products or offers.","state":"FACT_ANSWER","sources":[{"source_id":r.get("source_code"),"type":"synthetic_database_record","product_code":r.get("product_code"),"data_label":"synthetic_demo"} for r in db_rows]}
    if len(db_rows) > 1 and search_term is None:
     names = "; ".join(r.get("product_name", "Demo product") for r in db_rows)
     return {"text":f"I found these synthetic demo products: {names}. Which one would you like to know about? These are not official SBI offers.","state":"CLARIFY","sources":[{"source_id":r.get("source_code"),"type":"synthetic_database_record"} for r in db_rows]}
    row = db_rows[0]
    code = row.get("product_code", "")
    source = [{"source_id":row.get("source_code"),"type":"synthetic_database_record","product_code":code,"data_label":"synthetic_demo"}]
    name = row.get("product_name", "Synthetic demo product")
    disclaimer = " These figures are synthetic training data, not official SBI terms or an offer; confirm real terms with the bank."
    if db_intent == "documents":
     docs = supabase_data.list_documents(code)
     if not docs: return {"text":"No document checklist was found in the synthetic database. Please confirm requirements with staff.","state":"ESCALATE","sources":source}
     doc_text = "; ".join(d["document_name"] + (" ("+d["required_status"]+")" if d.get("required_status") else "") for d in docs)
     return {"text":f"Synthetic document checklist for {name}: {doc_text}.{disclaimer}","state":"DOCUMENTS","sources":source}
    if db_intent == "eligibility":
     rules = supabase_data.list_eligibility_rules(code)
     if not rules: return {"text":"No eligibility rules were found in the synthetic database. Please confirm requirements with staff.","state":"ESCALATE","sources":source}
     rule_text = "; ".join(r.get("explanation", r.get("rule_name", "Rule")) for r in rules)
     return {"text":f"Synthetic preliminary criteria for {name}: {rule_text} These criteria do not determine eligibility or guarantee approval.{disclaimer}","state":"FACT_ANSWER","sources":source}
    if db_intent == "fees":
     fees = supabase_data.list_fees(code)
     if not fees: return {"text":f"I couldn’t find fee details for {name} in the synthetic database. Please confirm with staff.{disclaimer}","state":"ESCALATE","sources":source}
     fee_text = "; ".join(f"{f.get('fee_name')}: {f.get('conditions')}" for f in fees)
     return {"text":f"Synthetic fee details for {name}: {fee_text}.{disclaimer}","state":"FACT_ANSWER","sources":source}
    rate = row.get("indicative_annual_rate_pct")
    rate_text = f"indicative annual rate {float(rate):.2f}%" if rate is not None else "no indicative annual rate listed"
    amount_text = f"amount range ₹{float(row.get('min_amount_inr') or 0):,.0f}–₹{float(row.get('max_amount_inr') or 0):,.0f}"
    tenure_text = "tenure not listed" if row.get("min_tenure_months") is None else f"tenure {row.get('min_tenure_months')}–{row.get('max_tenure_months')} months"
    return {"text":f"{name}: {rate_text}; {amount_text}; {tenure_text}. {row.get('description','')}{disclaimer}","state":"FACT_ANSWER","sources":source}
   except Exception as ex:
    write_event("supabase_retrieval_error", session_id=sid, error_type=type(ex).__name__)
    return {"text":"I can’t access the synthetic product records right now, so I won’t guess the details. Please try again or request staff assistance.","state":"ESCALATE","sources":[]}

 # Answer general loan-catalogue questions from approved local product records.
 # These records are synthetic demo data, not official lender offers.
 is_local_catalogue_question = any(
  phrase in low for phrase in [
   "loan options", "loan option", "what loans", "which loans",
   "types of loan", "types of loans", "available loans",
   "available loan", "what are the loan", "business loan options",
   "list loans", "list products"
  ]
 )
 if is_local_catalogue_question:
  products = all_products()
  if not products:
   return {"text":"No approved demo loan products are currently available. Please request staff assistance.","state":"ESCALATE","sources":[]}
  product_names = "; ".join(p["name"] for p in products)
  return {
   "text": (
    f"The approved PrimeCapital demo catalogue currently includes: {product_names}. "
    "These are synthetic demonstration records, not official bank products, offers, "
    "or lending decisions. I can explain any one of these options if you tell me its name."
   ),
   "state":"FACT_ANSWER",
   "sources":[
    {"source_id":p["source_id"],"version":p["source_version"],"type":"structured_product_fact","product_id":p["id"]}
    for p in products
   ]
  }

 p=detect_product(raw)
 if any(k in low for k in ["emi","calculate","monthly payment","repayment estimate"]):
  if not p:return {"text":"Which product: Working Capital Flex, Equipment Growth Loan, or Merchant Overdraft?","state":"CLARIFY","sources":[]}
  am=re.search(r"(?:₹|rs\.?\s*)?([\d,]{4,})",raw,re.I); mm=re.search(r"\b(\d{1,2})\s*(?:months?|mos?)\b",low); yy=re.search(r"\b(\d{1,2})\s*(?:years?|yrs?)\b",low)
  amount=int(am.group(1).replace(",","")) if am else None; months=int(mm.group(1)) if mm else (int(yy.group(1))*12 if yy else None)
  if amount is None or months is None:return {"text":"Include amount in rupees and tenure in months/years, e.g. Calculate EMI for ₹200000 over 24 months for Working Capital Flex.","state":"CLARIFY","sources":[]}
  s["pending"]={"product_id":p["id"],"amount":amount,"months":months};s["state"]="CLARIFY"
  return {"text":f"Please confirm: {p['name']}, amount ₹{amount:,}, tenure {months} months. Rate and repayment method come from the approved product record. Reply `confirm` or `cancel`.","state":"CLARIFY","sources":[{"source_id":p["source_id"],"version":p["source_version"],"type":"structured_product_fact"}]}
 if any(k in low for k in ["document","paperwork","required file","checklist"]):
  if not p:return {"text":"Which product checklist do you need? Name Working Capital Flex, Equipment Growth Loan, or Merchant Overdraft.","state":"CLARIFY","sources":[]}
  return {"text":f"Document checklist for {p['name']}: {'; '.join(p['documents'])}. Confirm current requirements with staff; this is not a lending decision.","state":"DOCUMENTS","sources":[{"source_id":p["source_id"],"version":p["source_version"],"type":"structured_product_fact"}]}
 if any(k in low for k in ["eligib","qualify","eligible"]):
  if not p:return {"text":"Name the demo product. I can explain documented preliminary criteria but cannot decide or guarantee eligibility.","state":"CLARIFY","sources":[]}
  r=p["eligibility_rules"];return {"text":f"Published preliminary criteria for {p['name']}: business vintage of at least {r['min_business_vintage_months']} months and business bank statements required. These criteria do not determine eligibility; staff must review.","state":"FACT_ANSWER","sources":[{"source_id":p["source_id"],"version":p["source_version"],"type":"structured_product_fact"}]}
 if p and any(k in low for k in ["fee","rate","interest","limit","amount","product","working capital","equipment","overdraft"]):
  text=f"{p['name']} has an illustrative annual interest rate of {p['annual_interest_rate']*100:.2f}% using {p['repayment_method'].replace('_',' ')} repayment. Amount range: ₹{p['min_amount']:,}–₹{p['max_amount']:,}; tenure: {p['min_tenure_months']}–{p['max_tenure_months']} months; processing fee: {p['processing_fee_percent']}% plus ₹{p['other_fees_inr']:,} other listed fee. All figures are synthetic demo data; confirm final terms with staff."
  return {"text":text,"state":"FACT_ANSWER","sources":[{"source_id":p["source_id"],"version":p["source_version"],"type":"structured_product_fact"}]}
 hits=search(raw)
 if hits:
  knowledge_text = hits[0].get("text_hi") if language == "hi" else hits[0]["text"]
  return {"text":knowledge_text or hits[0]["text"],"state":"FACT_ANSWER","sources":[{"source_id":hits[0]["source_id"],"version":hits[0]["version"],"type":"approved_knowledge","title":hits[0].get("title_hi") if language == "hi" else hits[0]["title"]}]}
 e=create_enquiry(raw,"low_evidence",language=language);write_event("low_evidence_escalation",session_id=sid,enquiry_id=e["id"])
 return {"text":"I couldn’t find enough approved evidence to answer safely. I’ve created a staff review item. You can ask another question or request a human.","state":"ESCALATE","sources":[],"enquiry_id":e["id"]}
def safe_response(result):
 ok,reason=check_response(result["text"])
 if not ok:write_event("guardrail_block",reason=reason);result.update(text="I can’t safely provide that answer from available evidence. I’ll route this to staff.",state="ESCALATE")
 return result
