import pytest
from app.calculator import calculate_emi
def test_schedule_closes(): 
 r=calculate_emi("WC-FLEX-01",200000,24);assert len(r["schedule"])==24;assert r["schedule"][-1]["balance"]=="0.00"
def test_amount_limit():
 with pytest.raises(ValueError):calculate_emi("WC-FLEX-01",1000,24)
def test_tenure_limit():
 with pytest.raises(ValueError):calculate_emi("EQ-TERM-01",200000,6)
def test_unknown_product():
 with pytest.raises(ValueError):calculate_emi("nope",200000,24)
