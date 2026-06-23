import json
import os
import shutil

JSON_PATH = "nslt_100.json"
VIDEOS_DIR = "videos"
CLASS_LIST_PATH = "wlasl_class_list.txt"
OUTPUT_DIR = os.path.join("dataset", "words_100")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load class list properly
class_list = {}
with open(CLASS_LIST_PATH, "r") as f:
    for line in f:
        parts = line.strip().split()
        index = int(parts[0])
        word = parts[1]
        class_list[index] = word

# Load JSON
with open(JSON_PATH, "r") as f:
    data = json.load(f)

print("Total videos in JSON:", len(data))

copied_count = 0

for video_id, info in data.items():
    label_index = info["action"][0]
    word = class_list[label_index]

    word_folder = os.path.join(OUTPUT_DIR, word)
    os.makedirs(word_folder, exist_ok=True)

    filename = video_id + ".mp4"
    src = os.path.join(VIDEOS_DIR, filename)

    if os.path.exists(src):
        dst = os.path.join(word_folder, filename)
        shutil.copy(src, dst)
        copied_count += 1

print(f"✅ Extraction completed! Total videos copied: {copied_count}")
