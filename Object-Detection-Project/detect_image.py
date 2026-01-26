from ultralytics import YOLO
import cv2

model = YOLO("runs/detect/train/weights/best.pt")

image_path = "test.jpg"

img = cv2.imread(image_path)

results = model(img)

annotated = results[0].plot()

cv2.imshow("Object Detection", annotated)
cv2.waitKey(0)
cv2.destroyAllWindows()
