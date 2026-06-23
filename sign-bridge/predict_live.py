import cv2
import numpy as np
import mediapipe as mp
from tensorflow.keras.models import load_model
import os

# Load model
model = load_model("word_model_100.h5")

# Load label map
labels = os.listdir("processed_data")

mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(static_image_mode=False, max_num_hands=2)

SEQUENCE_LENGTH = 30
sequence = []

def extract_keypoints(results):
    keypoints = np.zeros(126)
    if results.multi_hand_landmarks:
        for i, hand_landmarks in enumerate(results.multi_hand_landmarks):
            for j, lm in enumerate(hand_landmarks.landmark):
                keypoints[j*3:(j*3)+3] = [lm.x, lm.y, lm.z]
    return keypoints

cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(image)

    keypoints = extract_keypoints(results)
    sequence.append(keypoints)

    if len(sequence) > SEQUENCE_LENGTH:
        sequence = sequence[-SEQUENCE_LENGTH:]

    if len(sequence) == SEQUENCE_LENGTH:
        input_data = np.expand_dims(sequence, axis=0)
        prediction = model.predict(input_data)[0]
        predicted_label = labels[np.argmax(prediction)]

        cv2.putText(frame, predicted_label,
                    (20, 50),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 255, 0),
                    2)

    cv2.imshow("SignBridge Live Prediction", frame)

    if cv2.waitKey(10) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
