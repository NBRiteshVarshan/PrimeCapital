import re
from .facts import all_products,get_product
from .retrieval import search
from .calculator import calculate_emi
from .guardrails import check_response
from .store import create_enquiry
from .audit import write_event
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
 if hits:return {"text":hits[0]["text"],"state":"FACT_ANSWER","sources":[{"source_id":hits[0]["source_id"],"version":hits[0]["version"],"type":"approved_knowledge","title":hits[0]["title"]}]}
 e=create_enquiry(raw,"low_evidence",language=language);write_event("low_evidence_escalation",session_id=sid,enquiry_id=e["id"])
 return {"text":"I couldn’t find enough approved evidence to answer safely. I’ve created a staff review item. You can ask another question or request a human.","state":"ESCALATE","sources":[],"enquiry_id":e["id"]}
def safe_response(result):
 ok,reason=check_response(result["text"])
 if not ok:write_event("guardrail_block",reason=reason);result.update(text="I can’t safely provide that answer from available evidence. I’ll route this to staff.",state="ESCALATE")
 return result
