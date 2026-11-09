from decimal import Decimal, ROUND_HALF_UP
from .facts import get_product
CENT=Decimal("0.01")
def money(x): return Decimal(str(x)).quantize(CENT,rounding=ROUND_HALF_UP)
def calculate_emi(product_id,principal,months):
 p=get_product(product_id)
 if not p: raise ValueError("Choose one unambiguous approved product.")
 amount=Decimal(str(principal))
 if amount<p["min_amount"] or amount>p["max_amount"]: raise ValueError(f"Amount must be between ₹{p['min_amount']:,} and ₹{p['max_amount']:,} for {p['name']}.")
 if months<p["min_tenure_months"] or months>p["max_tenure_months"]: raise ValueError(f"Tenure must be between {p['min_tenure_months']} and {p['max_tenure_months']} months.")
 if p["repayment_method"]!="reducing_balance": raise ValueError("Unsupported repayment method.")
 r=Decimal(str(p["annual_interest_rate"]))/Decimal(12); n=Decimal(months)
 emi=money(amount/n if r==0 else amount*r*(Decimal(1)+r)**months/((Decimal(1)+r)**months-1))
 balance=amount; total_interest=Decimal("0"); schedule=[]
 for i in range(1,months+1):
  interest=money(balance*r); principal_paid=emi-interest
  if i==months or principal_paid>balance: principal_paid=balance; payment=money(principal_paid+interest)
  else: payment=emi
  balance=money(balance-principal_paid); total_interest+=interest
  schedule.append({"month":i,"payment":str(payment),"principal":str(money(principal_paid)),"interest":str(interest),"balance":str(balance)})
 fee=money(amount*Decimal(str(p["processing_fee_percent"]))/Decimal(100)+Decimal(str(p["other_fees_inr"])))
 return {"product_id":p["id"],"product_name":p["name"],"principal_inr":str(money(amount)),"months":months,"annual_interest_rate":p["annual_interest_rate"],"repayment_method":p["repayment_method"],"monthly_emi_inr":str(emi),"total_interest_inr":str(money(total_interest)),"processing_and_other_fees_inr":str(fee),"illustrative_total_outflow_inr":str(money(amount+total_interest+fee)),"schedule":schedule,"source_id":p["source_id"],"source_version":p["source_version"],"disclaimer":"Illustrative estimate only; excludes taxes and charges not listed. Not an offer or lending decision."}
