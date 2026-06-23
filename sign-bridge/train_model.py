import os
import numpy as np
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.utils import to_categorical

DATA_PATH = "processed_data"

X = []
y = []
labels = []
label_map = {}

files = os.listdir(DATA_PATH)

unique_words = list(set([f.split("_")[0] for f in files]))
unique_words = sorted(unique_words)

for idx, word in enumerate(unique_words):
    labels.append(word)
    label_map[word] = idx

for file in files:
    word = file.split("_")[0]
    idx = label_map[word]

    data = np.load(os.path.join(DATA_PATH, file))
    X.append(data)
    y.append(idx)


X = np.array(X)
y = to_categorical(y).astype(int)

print("Dataset shape:", X.shape)
print("Number of classes:", len(labels))

if len(X) < 30:
    raise ValueError(
        f"❌ Not enough data to train. Found only {len(X)} samples.\n"
        "👉 Record at least 30–50 samples per word."
    )


X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = Sequential()
model.add(LSTM(128, return_sequences=True, input_shape=(30, 126)))
model.add(Dropout(0.3))
model.add(LSTM(128))
model.add(Dropout(0.3))
model.add(Dense(64, activation="relu"))
model.add(Dense(len(labels), activation="softmax"))

model.compile(
    optimizer="adam",
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)




model.fit(
    X_train,
    y_train,
    epochs=80,
    validation_data=(X_test, y_test),
    
)



model.save("word_model_10.h5")

print("🔥 Model training completed and saved!")
