from datetime import datetime,timezone
from uuid import uuid4
from threading import Lock
_lock=Lock(); _enquiries=[]
def create_enquiry(summary,intent="handoff",sources=None,assumptions=None,language="en"):
 x={"id":str(uuid4()),"created_at":datetime.now(timezone.utc).isoformat(),"summary":summary[:1200],"intent":intent,"sources":sources or [],"assumptions":assumptions or {},"language":language,"status":"open","assigned_to":None,"feedback_label":None,"sla_minutes":30}
 with _lock:_enquiries.insert(0,x)
 return x
def list_enquiries():
 with _lock:return [dict(x) for x in _enquiries]
def update_enquiry(i,status=None,assigned_to=None,feedback_label=None):
 with _lock:
  for x in _enquiries:
   if x["id"]==i:
    if status is not None:
     if status not in {"open","assigned","resolved","escalated"}:raise ValueError("Invalid status.")
     x["status"]=status
    if assigned_to is not None:x["assigned_to"]=assigned_to[:100]
    if feedback_label is not None:x["feedback_label"]=feedback_label[:100]
    return dict(x)
 return None
