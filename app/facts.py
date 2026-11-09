import json
from datetime import date
from .config import DATA_DIR
def all_products():
 rows=json.loads((DATA_DIR/"products.json").read_text(encoding="utf-8"))
 return [p for p in rows if p["status"]=="approved" and p["effective_date"]<=date.today().isoformat()]
def get_product(q):
 if not q:return None
 q=q.lower().strip(); ps=all_products()
 exact=[p for p in ps if q in (p["id"].lower(),p["name"].lower())]
 if exact:return exact[0]
 found=[p for p in ps if q in p["name"].lower() or p["name"].lower() in q or p["category"] in q]
 return found[0] if len(found)==1 else None
def public_product(p):
 keys=["id","name","category","currency","min_amount","max_amount","annual_interest_rate","repayment_method","min_tenure_months","max_tenure_months","processing_fee_percent","other_fees_inr","documents","source_id","source_title","source_version","effective_date","description"]
 return {k:p[k] for k in keys if k in p}
