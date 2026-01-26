import streamlit as st
import joblib
from medical_ner import extract_entities
from utils import simple_summary

st.set_page_config(page_title="AI Medical Report Analyzer")

model = joblib.load("models/classifier.pkl")

st.title("🏥 AI Medical Report Analyzer")
st.warning("⚠ This tool is NOT for medical diagnosis.")

text = st.text_area("Paste medical report text")

if st.button("Analyze Report"):

    prediction = model.predict([text])[0]

    entities = extract_entities(text)
    summary = simple_summary(text)

    st.subheader("📌 Report Type")
    st.success(prediction)

    st.subheader("🧬 Extracted Medical Terms")
    for e in entities:
        st.write("•", e)

    st.subheader("📝 Patient Friendly Summary")
    st.info(summary)
