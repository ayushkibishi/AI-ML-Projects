from flask import Flask, render_template, redirect, url_for, request, session, jsonify
import os
import cv2
import numpy as np
import mediapipe as mp
from tensorflow.keras.models import load_model
import base64
import pyttsx3

app = Flask(__name__)
app.secret_key = "signbridge_secret"

# -------------------------
# LOAD MODEL
# -------------------------

print("Loading model...")
model = load_model("word_model_10.h5")
print("Model loaded successfully!")
print("Model input shape:", model.input_shape)

labels = sorted([label.replace(".npy", "") for label in os.listdir("processed_data")])
print("Total Labels:", len(labels))

print("Model input shape:", model.input_shape)
print("Model output shape:", model.output_shape)


# -------------------------
# TEXT TO SPEECH ENGINE
# -------------------------

engine = pyttsx3.init()
engine.setProperty('rate', 150)

# -------------------------
# MEDIAPIPE SETUP
# -------------------------

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# -------------------------
# SEQUENCE & SENTENCE
# -------------------------

SEQUENCE_LENGTH = 30
sequence = []
prediction_buffer = []
sentence = []

# -------------------------
# KEYPOINT EXTRACTION
# -------------------------

def extract_keypoints(results):
    keypoints = []

    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            for lm in hand_landmarks.landmark:
                keypoints.extend([lm.x, lm.y, lm.z])

    while len(keypoints) < 126:
        keypoints.extend([0, 0, 0])

    return np.array(keypoints)

# -------------------------
# ROUTES
# -------------------------

@app.route("/")
def home():
    if "user" in session:
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))
@app.route("/reset", methods=["POST"])
def reset():
    global sentence, prediction_buffer, sequence
    sentence = []
    prediction_buffer = []
    sequence = []
    return jsonify({"status": "reset"})


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        if request.form["username"] == "admin" and request.form["password"] == "1234":
            session["user"] = "admin"
            return redirect(url_for("dashboard"))
    return render_template("login.html")

@app.route("/dashboard")
def dashboard():
    if "user" not in session:
        return redirect(url_for("login"))
    return render_template("dashboard.html")

@app.route("/live")
def live():
    if "user" not in session:
        return redirect(url_for("login"))
    return render_template("live.html")

@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))

# -------------------------
# PREDICTION ROUTE
# -------------------------

@app.route("/predict", methods=["POST"])
def predict():
    global sequence, prediction_buffer, sentence

    try:
        data = request.json.get("image")
        if not data:
            return jsonify({"prediction": " ".join(sentence)})

        encoded_data = data.split(",")[1]
        img_bytes = base64.b64decode(encoded_data)

        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({"prediction": " ".join(sentence)})

        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(image)

        # If no hand detected, just return current sentence
        if results.multi_hand_landmarks is None:
            return jsonify({"prediction": " ".join(sentence)})

        keypoints = extract_keypoints(results)
        sequence.append(keypoints)

        if len(sequence) > SEQUENCE_LENGTH:
            sequence = sequence[-SEQUENCE_LENGTH:]

        if len(sequence) >= SEQUENCE_LENGTH:
            input_data = np.expand_dims(sequence[-SEQUENCE_LENGTH:], axis=0)

            result = model.predict(input_data, verbose=0)[0]
            predicted_index = np.argmax(result)
            predicted_word = labels[predicted_index]
            confidence = np.max(result)

            print("Predicted:", predicted_word, "| Confidence:", confidence)

            # Stability buffer (5 consecutive predictions)
            prediction_buffer.append(predicted_word)

            if len(prediction_buffer) > 5:
                prediction_buffer.pop(0)

            if prediction_buffer.count(predicted_word) == 5 and confidence > 0.4:
                if len(sentence) == 0 or sentence[-1] != predicted_word:
                    sentence.append(predicted_word)

                    # Speak word
                    engine.say(predicted_word)
                    engine.runAndWait()
                    print("Sequence length:", len(sequence))
                    print("Sentence:", sentence)

                    print("Predicted:", predicted_word)
                    print("Confidence:", confidence)



        return jsonify({"prediction": " ".join(sentence)})

    except Exception as e:
        print("Prediction error:", e)
        return jsonify({"prediction": " ".join(sentence)})

# -------------------------
# RUN SERVER
# -------------------------

if __name__ == "__main__":
    app.run(debug=False)
