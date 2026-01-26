from ultralytics import YOLO

def train_model():
    model = YOLO("yolov8n.pt")

    model.train(
        data="data.yaml",
        epochs=30,
        imgsz=640,
        batch=8,
        device="cpu"
    )

if __name__ == "__main__":
    train_model()
