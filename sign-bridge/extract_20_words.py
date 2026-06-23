import os
import json
import shutil

JSON_PATH = "nslt_100.json"
VIDEOS_PATH = "videos"
OUTPUT_PATH = "dataset/words_20"

TARGET_WORDS = [
    "hello", "thank_you", "yes", "no", "please",
    "sorry", "good", "bad", "eat", "drink",
    "school", "home", "help", "stop", "go",
    "come", "friend", "love", "name", "fine"
]

# Load class list
with open("wlasl_class_list.txt", "r") as f:
    class_map = {}
    for line in f:
        idx, word = line.strip().split("\t")
        class_map[int(idx)] = word

# Load JSON
with open(JSON_PATH, "r") as f:
    data = json.load(f)

os.makedirs(OUTPUT_PATH, exist_ok=True)

count = 0

for video_id, info in data.items():
    class_id = info["action"][0]
    word = class_map[class_id]

    if word in TARGET_WORDS:
        src = os.path.join(VIDEOS_PATH, video_id + ".mp4")

        if os.path.exists(src):
            word_folder = os.path.join(OUTPUT_PATH, word)
            os.makedirs(word_folder, exist_ok=True)

            dst = os.path.join(word_folder, video_id + ".mp4")
            shutil.copy(src, dst)
            count += 1

print("Total videos copied:", count)
print("Done.")
