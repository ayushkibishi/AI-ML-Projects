import os
import shutil
import json

DATASET_PATH = "wlasl-processed/videos"
JSON_PATH = "wlasl-processed/nslt_100.json"
OUTPUT_PATH = "dataset"

TARGET_WORDS = [
    "hello",
    "help",
    "thank_you",
    "yes",
    "no",
    "please",
    "stop",
    "good",
    "bad",
    "sorry"
]

os.makedirs(OUTPUT_PATH, exist_ok=True)

with open(JSON_PATH, "r") as f:
    data = json.load(f)

print("Total videos in JSON:", len(data))

copied_count = 0

for video_id, info in data.items():
    action_id = info["action"][0]

    # Find word name from action id
    word = info.get("gloss", "").lower()

    if word in TARGET_WORDS:
        src = os.path.join(DATASET_PATH, f"{video_id}.mp4")
        if os.path.exists(src):
            word_folder = os.path.join(OUTPUT_PATH, word)
            os.makedirs(word_folder, exist_ok=True)
            shutil.copy(src, word_folder)
            copied_count += 1

print("Videos copied:", copied_count)
