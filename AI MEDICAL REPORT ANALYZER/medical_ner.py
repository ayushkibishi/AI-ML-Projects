import spacy

nlp = spacy.load("en_core_web_sm")

MEDICAL_KEYWORDS = [
    "blood pressure", "cholesterol", "glucose",
    "heart rate", "diabetes", "tumor",
    "infection", "fracture", "cancer"
]

def extract_entities(text):
    doc = nlp(text)
    entities = set()

    for ent in doc.ents:
        entities.add((ent.text, ent.label_))

    for word in MEDICAL_KEYWORDS:
        if word.lower() in text.lower():
            entities.add((word, "MEDICAL_TERM"))

    return list(entities)
