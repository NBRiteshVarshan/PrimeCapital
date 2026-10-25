import json
from datetime import datetime,timezone
from .config import AUDIT_PATH
def write_event(event_type,**fields):
 AUDIT_PATH.parent.mkdir(parents=True,exist_ok=True); event={"timestamp":datetime.now(timezone.utc).isoformat(),"event_type":event_type,**fields}
 with AUDIT_PATH.open("a",encoding="utf-8") as f:f.write(json.dumps(event,ensure_ascii=False,default=str)+"\\n")
 return event
def read_events(limit=100):
 if not AUDIT_PATH.exists():return []
 out=[]
 for line in AUDIT_PATH.read_text(encoding="utf-8").splitlines()[-limit:]:
  try:out.append(json.loads(line))
  except json.JSONDecodeError:pass
 return list(reversed(out))
