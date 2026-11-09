from .orchestrator import respond,safe_response
from .calculator import calculate_emi
def main():
 cases=[("fees","What are the fees for Working Capital Flex",["processing fee","synthetic demo data"]),("documents","What documents do I need for Equipment Growth Loan",["Equipment quotation","Document checklist"]),("unknown","Can you tell me tomorrow's stock price",["couldn’t find enough approved evidence"])]
 passed=0
 for n,q,expected in cases:
  r=safe_response(respond("eval-"+n,q));ok=all(x.lower() in r["text"].lower() for x in expected);print(n, "PASS" if ok else "FAIL",r["state"]);passed+=ok
 c=calculate_emi("WC-FLEX-01",200000,24);assert len(c["schedule"])==24 and c["schedule"][-1]["balance"]=="0.00";print("calculator schedule PASS; EMI ₹"+c["monthly_emi_inr"]);print(f"Response scenarios: {passed}/3")
if __name__=="__main__":main()
