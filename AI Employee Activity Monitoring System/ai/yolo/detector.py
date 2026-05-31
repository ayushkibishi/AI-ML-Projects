import os
import cv2
import numpy as np

# Try to import ultralytics, fall back to simulated mode if it fails
try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False

class YOLODetector:
    def __init__(self, model_name="yolov8n.pt"):
        self.model_name = model_name
        self.model = None
        self.is_fallback = not ULTRALYTICS_AVAILABLE
        
        if not self.is_fallback:
            try:
                # Initialize YOLO model (will download automatically to current dir if not present)
                self.model = YOLO(model_name)
                print(f"[YOLODetector] Loaded YOLOv8 model: {model_name}")
            except Exception as e:
                print(f"[YOLODetector] Error loading YOLOv8: {e}. Falling back to simulation mode.")
                self.is_fallback = True
        else:
            print("[YOLODetector] ultralytics not installed. Running in simulation mode.")
            
        # Simulating moving entities if in fallback mode
        self.simulated_entities = [
            {"id": 1, "x": 150, "y": 200, "w": 80, "h": 220, "dx": 2, "dy": 1, "state": "sitting", "name": "Aayush Sharma"},
            {"id": 2, "x": 400, "y": 180, "w": 90, "h": 250, "dx": -1, "dy": 2, "state": "standing", "name": "Jessica Chen"},
            {"id": 3, "x": 700, "y": 300, "w": 100, "h": 150, "dx": 0, "dy": 0, "state": "sleeping", "name": "Michael Brown"}
        ]

    def detect(self, frame):
        """
        Runs object detection on the frame.
        Returns:
            list of dicts containing:
                'box': [x1, y1, x2, y2]
                'confidence': float
                'class_id': int
                'class_name': str
        """
        if self.is_fallback:
            return self._simulate_detections(frame)
            
        try:
            results = self.model(frame, verbose=False)
            detections = []
            
            if len(results) > 0:
                result = results[0]
                boxes = result.boxes
                for box in boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    name = self.model.names[cls]
                    
                    # We primarily care about persons (0) and cell phones (67)
                    if cls in [0, 67]:
                        detections.append({
                            "box": [x1, y1, x2, y2],
                            "confidence": conf,
                            "class_id": cls,
                            "class_name": name
                        })
            return detections
        except Exception as e:
            print(f"[YOLODetector] Detection error: {e}")
            return self._simulate_detections(frame)

    def _simulate_detections(self, frame):
        """Generates realistic simulated detections when YOLOv8 is not available."""
        h, w, _ = frame.shape
        detections = []
        
        # Update simulation coordinates to create movement
        for entity in self.simulated_entities:
            entity["x"] += entity["dx"]
            entity["y"] += entity["dy"]
            
            # Bounce off boundary box limits (roughly keeping inside office frames)
            if entity["x"] < 50 or entity["x"] + entity["w"] > w - 50:
                entity["dx"] *= -1
            if entity["y"] < 50 or entity["y"] + entity["h"] > h - 50:
                entity["dy"] *= -1
                
            x1, y1 = int(entity["x"]), int(entity["y"])
            x2, y2 = x1 + entity["w"], y1 + entity["h"]
            
            # Person detection
            detections.append({
                "box": [x1, y1, x2, y2],
                "confidence": 0.92,
                "class_id": 0,
                "class_name": "person",
                "sim_meta": entity
            })
            
            # Simulate a cell phone for employee 1 sometimes
            if entity["id"] == 1 and np.random.rand() > 0.6:
                detections.append({
                    "box": [x1 + 10, y1 + 50, x1 + 35, y1 + 80],
                    "confidence": 0.84,
                    "class_id": 67,
                    "class_name": "cell phone"
                })
                
        return detections
