from fastapi.testclient import TestClient
from app.main import app
client=TestClient(app)
def test_health_products():assert client.get("/api/health").status_code==200 and len(client.get("/api/products").json())==3
def test_consent():assert client.post("/api/chat",json={"session_id":"consent","message":"hello","language":"en","consent":False}).status_code==403
def test_readback_confirm():
 sid="calc-test";r=client.post("/api/chat",json={"session_id":sid,"message":"Calculate EMI for ₹200000 over 24 months for Working Capital Flex","language":"en","consent":True});assert "Please confirm" in r.json()["text"]
 r=client.post("/api/confirm",json={"session_id":sid,"confirmed":True});assert "monthly EMI" in r.json()["text"] and r.json()["calculation"]["months"]==24
def test_handoff():
 r=client.post("/api/chat",json={"session_id":"handoff-test","message":"talk to a person","language":"en","consent":True});assert r.json().get("enquiry_id")

def test_health_reports_model_configuration():
    data=client.get("/api/health").json()
    assert data["speech"]["asr_model"] == "Prisma v2.5"
    assert data["speech"]["tts_model"] == "Timbre v2.5"
    assert data["reasoning_model"]["name"] == "Evon v3.3"

def test_evon_endpoint_requires_configuration():
    r=client.post("/api/ai/interpret",json={"message":"What are the fees?","language":"en"})
    assert r.status_code in (200,503)


def test_supabase_status_is_safe_when_unconfigured():
    from app import config
    if not config.SUPABASE_ENABLED:
        r = client.get("/api/supabase/status")
        assert r.status_code == 200
        assert r.json()["configured"] is False

def test_products_endpoint_shape():
    r = client.get("/api/products")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 1
