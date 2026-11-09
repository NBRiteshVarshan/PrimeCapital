import json,re
from datetime import date
from .config import DATA_DIR
STOP={"the","a","an","is","are","for","to","of","and","in","what","how","do","i","need","me","my","can","you","please"}
def tokens(s): return {x for x in re.findall(r"[a-z0-9]+",s.lower()) if x not in STOP}
def search(query,product_id=None,top_k=4,threshold=1):
 docs=json.loads((DATA_DIR/"knowledge.json").read_text(encoding="utf-8")); q=tokens(query); hits=[]
 for d in docs:
  if d["status"]!="approved" or d["effective_date"]>date.today().isoformat(): continue
  if d.get("product_id") and product_id and d["product_id"]!=product_id: continue
  score=len(q & tokens(d["title"]+" "+d["text"]))
  if score>=threshold:hits.append({**d,"score":score})
 return sorted(hits,key=lambda d:d["score"],reverse=True)[:top_k]
