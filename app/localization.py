"""Reviewed deterministic English/Hindi localization for Telegram replies.

Product names, identifiers and financial values are preserved. No customer
conversation is sent to an external translation service.
"""
from __future__ import annotations
import re


def normalize_language(language: str | None) -> str:
    return "hi" if str(language or "en").strip().lower() in {"hi", "hi-in", "hindi"} else "en"


_EXACT_HI = {
    "Please type your question.": "कृपया अपना सवाल लिखें या बोलकर भेजें।",
    "I couldn't understand your message. Please try again.": "मैं आपका संदेश समझ नहीं पाया। कृपया दोबारा कोशिश करें।",
    "Sorry, I couldn't process your message.": "माफ़ कीजिए, मैं आपका संदेश प्रोसेस नहीं कर पाया।",
    "Sorry, I couldn't generate a response.": "माफ़ कीजिए, मैं जवाब तैयार नहीं कर पाया।",
    "I encountered a problem processing your question. Please try again.": "आपका सवाल प्रोसेस करते समय समस्या आई। कृपया दोबारा कोशिश करें।",
    "Your text response is ready, but I couldn't generate the voice reply this time.": "आपका टेक्स्ट जवाब तैयार है, लेकिन इस बार मैं वॉइस जवाब नहीं बना पाया।",
    "Your text response is ready, but Telegram couldn't deliver the voice message.": "आपका टेक्स्ट जवाब तैयार है, लेकिन Telegram वॉइस संदेश नहीं भेज पाया।",
    "Please interact with PrimeCapital through a private chat.": "कृपया PrimeCapital से निजी चैट में ही बात करें।",
    "Please provide your consent first using /consent.": "कृपया पहले /consent कमांड से अपनी सहमति दें।",
    "Please use /consent first.": "कृपया पहले /consent कमांड का उपयोग करें।",
    "You want to submit a document for verification. Before uploading, please review and accept our document-processing notice using /docconsent.": "आप दस्तावेज़ जांच के लिए जमा करना चाहते हैं। अपलोड करने से पहले /docconsent कमांड से दस्तावेज़ प्रोसेसिंग की सूचना पढ़ें और सहमति दें।",
    "Certainly! Please upload a clear photo of your PAN card or GST certificate here.\n\nOur system will extract the document information and forward it to our team for human verification.": "ज़रूर! कृपया अपने PAN कार्ड या GST प्रमाणपत्र की साफ़ तस्वीर यहाँ अपलोड करें।\n\nहमारा सिस्टम दस्तावेज़ की जानकारी निकालेगा और उसे मानवीय जांच के लिए हमारी टीम को भेजेगा।",
    "No supported audio file was found.": "कोई समर्थित ऑडियो फ़ाइल नहीं मिली।",
    "I couldn't download your voice message. Please try again.": "मैं आपका वॉइस संदेश डाउनलोड नहीं कर पाया। कृपया दोबारा कोशिश करें।",
    "I received your voice message, but couldn't convert its audio format. Please try recording again.": "आपका वॉइस संदेश मिल गया, लेकिन उसका ऑडियो फ़ॉर्मेट बदला नहीं जा सका। कृपया दोबारा रिकॉर्ड करें।",
    "Listening to your voice message... 🎧": "आपका वॉइस संदेश सुन रहा हूँ... 🎧",
    "I received your voice message, but couldn't understand it. Please try speaking again or send your question as text.": "आपका वॉइस संदेश मिला, लेकिन मैं उसे समझ नहीं पाया। कृपया दोबारा बोलें या अपना सवाल टेक्स्ट में भेजें।",
    "I couldn't process or securely save that document. Please try again later or contact our team.": "मैं उस दस्तावेज़ को प्रोसेस या सुरक्षित रूप से सेव नहीं कर पाया। कृपया बाद में कोशिश करें या हमारी टीम से संपर्क करें।",
    "Document uploads are disabled for this chat.": "इस चैट के लिए दस्तावेज़ अपलोड बंद कर दिए गए हैं।",
    "Before uploading identity documents, use /docconsent to review and accept the document-processing notice.": "पहचान से जुड़े दस्तावेज़ अपलोड करने से पहले /docconsent कमांड से दस्तावेज़ प्रोसेसिंग की सूचना पढ़ें और सहमति दें।",
    "Please request document submission first, then upload the requested PAN or GST photo.": "कृपया पहले दस्तावेज़ जमा करने का अनुरोध करें। उसके बाद मांगे गए PAN या GST दस्तावेज़ की फोटो अपलोड करें।",
    "This image is too large. Please send a clear image under 8 MB.": "यह तस्वीर बहुत बड़ी है। कृपया 8 MB से छोटी और साफ़ तस्वीर भेजें।",
    "Image exceeds the 8 MB upload limit.": "तस्वीर 8 MB की अपलोड सीमा से बड़ी है।",
    "Could not create or retrieve the lead record.": "ग्राहक अनुरोध का रिकॉर्ड बनाया या प्राप्त नहीं किया जा सका।",
    "Invalid language selection. Please use /language.": "भाषा का विकल्प सही नहीं है। कृपया /language कमांड का उपयोग करें।",
    "I’ll pass this to the staff team. A handoff record has been created; no lending decision has been made.": "मैं आपका अनुरोध हमारी टीम तक पहुँचा दूँगा। टीम के लिए एक अनुरोध दर्ज कर दिया गया है। अभी कोई ऋण संबंधी निर्णय नहीं लिया गया है।",
    "No calculation made. Correct the amount, tenure, or product and try again.": "कोई EMI गणना नहीं की गई है। कृपया राशि, अवधि या लोन प्रोडक्ट सही करके दोबारा कोशिश करें।",
    "Reply `confirm` if correct, or `cancel` and enter the values again.": "यदि जानकारी सही है तो `confirm` लिखें। बदलाव करना हो तो `cancel` लिखकर सही जानकारी दोबारा भेजें।",
    "I couldn’t match that product in the synthetic demo database. Please try Working Capital Flex, MSME Term Loan, Equipment Growth Loan, or Merchant Overdraft.": "यह प्रोडक्ट डेमो डेटाबेस में नहीं मिला। कृपया Working Capital Flex, MSME Term Loan, Equipment Growth Loan या Merchant Overdraft में से कोई विकल्प बताएं।",
    "No document checklist was found in the synthetic database. Please confirm requirements with staff.": "डेमो डेटाबेस में दस्तावेज़ों की सूची नहीं मिली। कृपया आवश्यक दस्तावेज़ों की पुष्टि हमारी टीम से करें।",
    "No eligibility rules were found in the synthetic database. Please confirm requirements with staff.": "डेमो डेटाबेस में पात्रता के नियम नहीं मिले। कृपया हमारी टीम से जानकारी की पुष्टि करें।",
    "No approved demo loan products are currently available. Please request staff assistance.": "फिलहाल कोई स्वीकृत डेमो लोन प्रोडक्ट उपलब्ध नहीं है। कृपया हमारी टीम से सहायता लें।",
    "I can’t access the synthetic product records right now, so I won’t guess the details. Please try again or request staff assistance.": "अभी मैं डेमो प्रोडक्ट की जानकारी प्राप्त नहीं कर पा रहा हूँ, इसलिए अनुमान से जवाब नहीं दूँगा। कृपया दोबारा कोशिश करें या हमारी टीम से सहायता लें।",
    "I couldn’t find enough approved evidence to answer safely. I’ve created a staff review item. You can ask another question or request a human.": "इस सवाल का सुरक्षित और प्रमाणित जवाब देने के लिए पर्याप्त जानकारी नहीं मिली। मैंने इसे हमारी टीम की समीक्षा के लिए भेज दिया है। आप कोई दूसरा सवाल पूछ सकते हैं या हमारी टीम से बात करने का अनुरोध कर सकते हैं।",
    "I can’t safely provide that answer from available evidence. I’ll route this to staff.": "उपलब्ध प्रमाणों के आधार पर मैं इस सवाल का सुरक्षित जवाब नहीं दे सकता। मैं इसे हमारी टीम के पास भेज रहा हूँ।",
    "Include amount in rupees and tenure in months/years, e.g. Calculate EMI for ₹200000 over 24 months for Working Capital Flex.": "कृपया राशि रुपये में और अवधि महीने या साल में बताएं। उदाहरण: Working Capital Flex के लिए ₹200000 की राशि और 24 महीने की अवधि पर EMI की गणना करें।",
    "A processing fee is a charge for processing a loan enquiry or application. Demo fees are listed on each approved product record. Confirm final charges with lender staff.": "प्रोसेसिंग फीस, लोन की पूछताछ या आवेदन को प्रोसेस करने के लिए लिया जाने वाला शुल्क है। डेमो फीस हर स्वीकृत प्रोडक्ट रिकॉर्ड में दी गई है। अंतिम शुल्क की पुष्टि बैंक की टीम से करें।",
    "No. Product information and calculator outputs are illustrative only and are not an approval, offer, or guarantee of eligibility. A lender representative must confirm final terms.": "नहीं। प्रोडक्ट की जानकारी और कैलकुलेटर के नतीजे केवल उदाहरण के लिए हैं। ये मंज़ूरी, ऑफर या पात्रता की गारंटी नहीं हैं। अंतिम शर्तों की पुष्टि बैंक प्रतिनिधि को करनी होगी।",
    "For a reducing-balance illustration, monthly interest is based on outstanding principal. The estimate is illustrative and not an offer.": "रिड्यूसिंग-बैलेंस उदाहरण में हर महीने का ब्याज बची हुई मूल राशि पर आधारित होता है। यह केवल अनुमान है, लोन ऑफर नहीं।",
    "A staff member can review the enquiry summary, clarify questions, and explain next steps. An enquiry is not a lending decision.": "हमारी टीम पूछताछ का सारांश देख सकती है, आपके सवाल स्पष्ट कर सकती है और आगे की प्रक्रिया बता सकती है। पूछताछ दर्ज होना लोन संबंधी निर्णय नहीं है।",
    "Thank you, your documents have been sent for human verification.\n\nOur team will review the uploaded document. The automated check only reads the document and checks its format; it does not confirm authenticity or approval.": "धन्यवाद, आपके दस्तावेज़ हमारी टीम द्वारा जांच के लिए भेज दिए गए हैं।\n\nहमारी टीम अपलोड किए गए दस्तावेज़ की समीक्षा करेगी। स्वचालित जांच केवल दस्तावेज़ पढ़ती है और उसका फ़ॉर्मेट देखती है; यह दस्तावेज़ की असलियत या मंज़ूरी की पुष्टि नहीं करती।",
    "Document upload consent received. You may now send a clear photo of your PAN card or GST certificate.\n\nYour original image will be stored in a private Supabase bucket for staff review. OCR runs locally and extracts only the document category and a masked identifier. Automated checks do not verify authenticity. Please upload only documents you are authorised to share. Use /stopdoc to disable document uploads.": "दस्तावेज़ अपलोड करने की सहमति मिल गई है। अब आप अपने PAN कार्ड या GST प्रमाणपत्र की साफ़ तस्वीर भेज सकते हैं।\n\nआपकी मूल तस्वीर कर्मचारियों की समीक्षा के लिए निजी Supabase स्टोरेज में रखी जाएगी। OCR स्थानीय रूप से चलता है और केवल दस्तावेज़ का प्रकार तथा छिपी हुई पहचान संख्या निकालता है। स्वचालित जांच दस्तावेज़ की असलियत सत्यापित नहीं करती। केवल वही दस्तावेज़ अपलोड करें जिन्हें साझा करने का अधिकार आपके पास है। दस्तावेज़ अपलोड बंद करने के लिए /stopdoc का उपयोग करें。",
}


def _localize_document_names(value: str) -> str:
    replacements = {
        "PAN of proprietor/directors": "मालिक/निदेशकों का PAN",
        "Business registration proof": "व्यवसाय पंजीकरण का प्रमाण",
        "Last 6 months business bank statements": "पिछले 6 महीनों के व्यवसाय बैंक स्टेटमेंट",
        "Last 12 months business bank statements": "पिछले 12 महीनों के व्यवसाय बैंक स्टेटमेंट",
        "Equipment quotation": "उपकरण का कोटेशन",
        "Address proof": "पते का प्रमाण",
    }
    for english, hindi in replacements.items():
        value = value.replace(english, hindi)
    return value


def localize_text(text: str, language: str = "en") -> str:
    if normalize_language(language) == "en" or not isinstance(text, str):
        return text
    # The orchestrator can return a reviewed Hindi knowledge-base field.
    if re.search(r"[\u0900-\u097F]", text):
        return text
    if text in _EXACT_HI:
        return _EXACT_HI[text]

    patterns = [
        (r"Illustrative estimate for (.*?): monthly EMI ₹([\d,.]+); annual interest rate ([\d.]+%); total interest ₹([\d,.]+); listed fees ₹([\d,.]+); illustrative total outflow ₹([\d,.]+)\. This is not an offer or lending decision\.",
         lambda m: f"{m[1]} के लिए अनुमानित गणना: हर महीने की EMI ₹{m[2]}; वार्षिक ब्याज दर {m[3]}; कुल ब्याज ₹{m[4]}; सूचीबद्ध शुल्क ₹{m[5]}; अनुमानित कुल भुगतान ₹{m[6]}। यह कोई लोन ऑफर या ऋण संबंधी निर्णय नहीं है।"),
        (r"The synthetic demo catalogue contains: (.*)\. These are fictional training records, not official SBI products or offers\.",
         lambda m: f"डेमो कैटलॉग में ये विकल्प शामिल हैं: {m[1]}। ये केवल प्रशिक्षण के लिए बनाए गए काल्पनिक रिकॉर्ड हैं, SBI के आधिकारिक प्रोडक्ट या ऑफर नहीं।"),
        (r"I found these synthetic demo products: (.*)\. Which one would you like to know about\? These are not official SBI offers\.",
         lambda m: f"मुझे ये डेमो प्रोडक्ट मिले: {m[1]}। आप इनमें से किस प्रोडक्ट के बारे में जानना चाहेंगे? ये SBI के आधिकारिक ऑफर नहीं हैं।"),
        (r"The approved PrimeCapital demo catalogue currently includes: (.*)\. These are synthetic demonstration records, not official bank products, offers, or lending decisions\. I can explain any one of these options if you tell me its name\.",
         lambda m: f"PrimeCapital के डेमो कैटलॉग में फिलहाल ये विकल्प हैं: {m[1]}। ये केवल प्रदर्शन के लिए बनाए गए रिकॉर्ड हैं, किसी बैंक के आधिकारिक प्रोडक्ट, ऑफर या ऋण निर्णय नहीं। आप किसी एक विकल्प का नाम बताएं, मैं उसके बारे में जानकारी दे सकता हूँ।"),
        (r"Please confirm: (.*?), amount ₹([\d,]+), tenure (\d+) months\. Rate and repayment method come from the approved product record\. Reply `confirm` or `cancel`\.",
         lambda m: f"कृपया पुष्टि करें: {m[1]}, लोन राशि ₹{m[2]}, अवधि {m[3]} महीने। ब्याज दर और भुगतान का तरीका स्वीकृत प्रोडक्ट रिकॉर्ड के अनुसार है। सही होने पर `confirm`, बदलाव के लिए `cancel` लिखें।"),
        (r"Document checklist for (.*?): (.*)\. Confirm current requirements with staff; this is not a lending decision\.",
         lambda m: f"{m[1]} के लिए आवश्यक दस्तावेज़: {_localize_document_names(m[2])}। कृपया मौजूदा आवश्यकताओं की पुष्टि हमारी टीम से करें। यह कोई ऋण निर्णय नहीं है।"),
        (r"Published preliminary criteria for (.*?): business vintage of at least (\d+) months and business bank statements required\. These criteria do not determine eligibility; staff must review\.",
         lambda m: f"{m[1]} के लिए शुरुआती मानदंड: व्यवसाय कम-से-कम {m[2]} महीने पुराना होना चाहिए और व्यवसाय के बैंक स्टेटमेंट आवश्यक हैं। ये मानदंड पात्रता या मंज़ूरी तय नहीं करते; हमारी टीम को समीक्षा करनी होगी।"),
        (r"Which product: (.*)\?", lambda m: f"कृपया प्रोडक्ट चुनें: {m[1]}।"),
        (r"Which product checklist do you need\? Name (.*)\.", lambda m: f"आपको किस प्रोडक्ट की दस्तावेज़ सूची चाहिए? इनमें से नाम बताएं: {m[1]}।"),
        (r"Synthetic document checklist for (.*?): (.*)\. These figures are synthetic training data, not official SBI terms or an offer; confirm real terms with the bank\.",
         lambda m: f"{m[1]} के लिए डेमो दस्तावेज़ सूची: {m[2]}। यह जानकारी केवल प्रशिक्षण के लिए बनाई गई है, SBI की आधिकारिक शर्त या ऑफर नहीं। वास्तविक शर्तों की पुष्टि बैंक से करें।"),
        (r"Synthetic preliminary criteria for (.*?): (.*) These criteria do not determine eligibility or guarantee approval\. These figures are synthetic training data, not official SBI terms or an offer; confirm real terms with the bank\.",
         lambda m: f"{m[1]} के लिए शुरुआती डेमो मानदंड: {m[2]}। ये मानदंड पात्रता तय नहीं करते और मंज़ूरी की गारंटी नहीं देते। यह जानकारी केवल प्रशिक्षण के लिए है, SBI की आधिकारिक शर्त या ऑफर नहीं।"),
        (r"Synthetic fee details for (.*?): (.*)\. These figures are synthetic training data, not official SBI terms or an offer; confirm real terms with the bank\.",
         lambda m: f"{m[1]} के लिए डेमो शुल्क की जानकारी: {m[2]}। यह जानकारी केवल प्रशिक्षण के लिए है, SBI की आधिकारिक शर्त या ऑफर नहीं। वास्तविक शुल्क बैंक से पुष्टि करें।"),
        (r"I couldn’t find fee details for (.*?) in the synthetic database\. Please confirm with staff\. These figures are synthetic training data, not official SBI terms or an offer; confirm real terms with the bank\.",
         lambda m: f"डेमो डेटाबेस में {m[1]} के शुल्क की जानकारी नहीं मिली। कृपया हमारी टीम से पुष्टि करें। ये आंकड़े आधिकारिक बैंक शर्तें या ऑफर नहीं हैं।"),
        (r"(.*?) has an illustrative annual interest rate of ([\d.]+)% using (.*?) repayment\. Amount range: ₹(.*?)–₹(.*?); tenure: (.*?)–(.*?) months; processing fee: (.*?)% plus ₹(.*?) other listed fee\. All figures are synthetic demo data; confirm final terms with staff\.",
         lambda m: f"{m[1]} की उदाहरणात्मक वार्षिक ब्याज दर {m[2]}% है। भुगतान का तरीका {('घटती शेष राशि के आधार पर' if m[3].strip() == 'reducing balance' else m[3])} है। लोन राशि की सीमा ₹{m[4]} से ₹{m[5]}; अवधि {m[6]} से {m[7]} महीने; प्रोसेसिंग फीस {m[8]}% और अन्य सूचीबद्ध शुल्क ₹{m[9]} है। सभी आंकड़े केवल डेमो डेटा हैं। अंतिम शर्तों की पुष्टि हमारी टीम से करें।"),
        (r"(.*?): indicative annual rate ([\d.]+%); amount range ₹(.*?); tenure (.*?)\. (.*) These figures are synthetic training data, not official SBI terms or an offer; confirm real terms with the bank\.",
         lambda m: f"{m[1]}: अनुमानित वार्षिक ब्याज दर {m[2]}; लोन राशि की सीमा ₹{m[3]}; अवधि {m[4]}। {m[5]} ये आंकड़े केवल प्रशिक्षण के लिए हैं, SBI की आधिकारिक शर्तें या ऑफर नहीं। वास्तविक शर्तों की पुष्टि बैंक से करें।"),
    ]
    for pattern, render in patterns:
        match = re.fullmatch(pattern, text, flags=re.S)
        if match:
            return render(match)

    # Never leak an English answer into a Hindi conversation or attempt an
    # unreviewed translation of a financial statement.
    return ("इस सवाल के लिए स्वीकृत जानकारी का हिंदी संस्करण अभी उपलब्ध नहीं है। "
            "गलत अनुवाद देने के बजाय मैं इसे अंग्रेज़ी में उपलब्ध करा सकता हूँ। "
            "भाषा बदलने के लिए /language लिखें या हमारी टीम से सहायता लें।")
