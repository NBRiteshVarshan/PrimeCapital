import re
BANNED=[r"\bguaranteed?\s+(approval|eligible|eligibility|loan)\b",r"\b(approved|rejected|sanctioned)\s+(your|the)?\s*loan\b",r"\byou will definitely qualify\b",r"\byou should (take|avoid) (this )?loan\b"]
def check_response(text,allowed_numbers=None):
 for p in BANNED:
  if re.search(p,text,re.I):return False,"banned_claim"
 return True,"pass"
