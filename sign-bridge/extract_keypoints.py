import os
import cv2
import numpy as np
import mediapipe as mp

DATASET_PATH = "dataset"
OUTPUT_PATH = "processed_data"

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=False, max_num_hands=2)

SEQUENCE_LENGTH = 30

os.makedirs(OUTPUT_PATH, exist_ok=True)

def extract_keypoints(results):
    keypoints = []
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            for lm in hand_landmarks.landmark:
                keypoints.extend([lm.x, lm.y, lm.z])
    while len(keypoints) < 126:
        keypoints.extend([0, 0, 0])
    return np.array(keypoints)

for word in os.listdir(DATASET_PATH):
    word_path = os.path.join(DATASET_PATH, word)
    save_path = os.path.join(OUTPUT_PATH, word)
    os.makedirs(save_path, exist_ok=True)

    for video in os.listdir(word_path):
        cap = cv2.VideoCapture(os.path.join(word_path, video))

        sequence = []

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(image)

            keypoints = extract_keypoints(results)
            sequence.append(keypoints)

        cap.release()

        # 🔥 NEW FIX: pad or trim to 30 frames
        if len(sequence) > SEQUENCE_LENGTH:
            sequence = sequence[:SEQUENCE_LENGTH]
        else:
            while len(sequence) < SEQUENCE_LENGTH:
                sequence.append(np.zeros(126))

        np.save(
            os.path.join(save_path, video.split(".")[0]),
            np.array(sequence)
        )

print("🔥 Keypoint extraction completed properly!")
