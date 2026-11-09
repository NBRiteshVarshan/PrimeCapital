from app.localization import localize_text, normalize_language


def test_language_normalization():
    assert normalize_language("hi") == "hi"
    assert normalize_language("hi-IN") == "hi"
    assert normalize_language("en") == "en"
    assert normalize_language(None) == "en"


def test_english_is_unchanged():
    text = "Please type your question."
    assert localize_text(text, "en") == text


def test_hindi_static_template():
    assert localize_text("Please type your question.", "hi") == "कृपया अपना सवाल लिखें या बोलकर भेजें।"


def test_hindi_catalogue_template_preserves_product_names():
    text = (
        "The approved PrimeCapital demo catalogue currently includes: "
        "Working Capital Flex; Equipment Growth Loan. These are synthetic "
        "demonstration records, not official bank products, offers, or lending "
        "decisions. I can explain any one of these options if you tell me its name."
    )
    result = localize_text(text, "hi")
    assert "PrimeCapital के डेमो कैटलॉग" in result
    assert "Working Capital Flex" in result
    assert "Equipment Growth Loan" in result
    assert "आधिकारिक प्रोडक्ट" in result


def test_hindi_emi_template_preserves_amounts():
    text = (
        "Illustrative estimate for Working Capital Flex: monthly EMI ₹9,234.50; "
        "annual interest rate 18.00%; total interest ₹21,628.00; listed fees ₹4,000.00; "
        "illustrative total outflow ₹225,628.00. This is not an offer or lending decision."
    )
    result = localize_text(text, "hi")
    assert "हर महीने की EMI ₹9,234.50" in result
    assert "वार्षिक ब्याज दर 18.00%" in result
    assert "₹225,628.00" in result
    assert "लोन ऑफर" in result


def test_existing_hindi_knowledge_text_is_not_relocalized():
    text = "प्रोसेसिंग फीस एक शुल्क है।"
    assert localize_text(text, "hi") == text
