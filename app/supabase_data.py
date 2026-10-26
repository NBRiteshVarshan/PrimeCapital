"""Narrow, backend-only Supabase access for synthetic SBI demo data."""
from __future__ import annotations
import httpx
from . import config
class SupabaseNotConfigured(RuntimeError): pass
class SupabaseDataError(RuntimeError): pass
def is_enabled(): return bool(config.SUPABASE_ENABLED)
def _headers():
    if not is_enabled(): raise SupabaseNotConfigured("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the backend environment.")
    key=config.SUPABASE_SERVICE_ROLE_KEY
    return {"apikey":key,"Authorization":f"Bearer {key}","Content-Type":"application/json"}
def _get(path, params=None):
    try:
        with httpx.Client(timeout=config.SUPABASE_HTTP_TIMEOUT_SECONDS) as c:
            r=c.get(f"{config.SUPABASE_URL}/rest/v1/{path.lstrip('/')}",headers=_headers(),params=params or {})
            r.raise_for_status(); return r.json()
    except SupabaseNotConfigured: raise
    except Exception as ex: raise SupabaseDataError("Supabase read failed; verify URL, backend key, schema, and database permissions.") from ex
def lookup_products(query=None):
    payload={"p_query":query.strip() if isinstance(query,str) and query.strip() else None}
    try:
        with httpx.Client(timeout=config.SUPABASE_HTTP_TIMEOUT_SECONDS) as c:
            r=c.post(f"{config.SUPABASE_URL}/rest/v1/rpc/lookup_demo_products",headers=_headers(),json=payload)
            r.raise_for_status(); rows=r.json()
            if not isinstance(rows,list): raise SupabaseDataError("Unexpected response from lookup_demo_products.")
            return rows
    except SupabaseNotConfigured: raise
    except SupabaseDataError: raise
    except Exception as ex: raise SupabaseDataError("Supabase product lookup failed. Check lookup_demo_products permissions and backend configuration.") from ex
def _product_id(product_code):
    rows=_get("loan_products",{"select":"id,product_code","product_code":f"eq.{product_code}","limit":"1"})
    return rows[0]["id"] if rows else None
def list_fees(product_code):
    pid=_product_id(product_code)
    return [] if not pid else _get("loan_fees",{"select":"fee_code,fee_name,fee_type,fee_value,min_fee_inr,max_fee_inr,tax_applicability,conditions,source_id","product_id":f"eq.{pid}","order":"fee_name.asc"})
def list_eligibility_rules(product_code):
    pid=_product_id(product_code)
    return [] if not pid else _get("eligibility_rules",{"select":"rule_name,field_name,operator,value_json,explanation,source_id","product_id":f"eq.{pid}","order":"rule_name.asc"})
def list_documents(product_code):
    pid=_product_id(product_code)
    return [] if not pid else _get("required_documents",{"select":"document_name,required_status,condition_text,explanation,source_id","product_id":f"eq.{pid}","order":"document_name.asc"})
def health_check():
    rows=lookup_products(None)
    return {"configured":True,"reachable":True,"products_returned":len(rows),"data_label":"synthetic_demo"}
