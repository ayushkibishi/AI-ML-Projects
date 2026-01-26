import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split

df = pd.read_csv("data/medical_transcriptions.csv")

df = df.dropna()

X = df["transcription"]
y = df["medical_specialty"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = Pipeline([
    ("tfidf", TfidfVectorizer(stop_words="english", max_features=5000)),
    ("clf", MultinomialNB())
])

model.fit(X_train, y_train)

joblib.dump(model, "models/classifier.pkl")

print("✅ Model trained and saved")
