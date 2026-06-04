import os
import cv2
import numpy as np
import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger("Vision")

# Try to import optional packages needed for screen capture and YOLO
try:
    import mss
    import pyautogui
    from ultralytics import YOLO
    HAS_VISION_DEPS = True
except ImportError:
    HAS_VISION_DEPS = False
    logger.warning("Vision dependencies (mss, pyautogui, ultralytics) are missing. Running in mock vision mode.")

class YOLODetector:
    def __init__(self, model_path: str = "datasets/weights/yolov8n.pt", window_title: str = "Minecraft"):
        self.model_path = model_path
        self.window_title = window_title
        self.model = None
        self.sct = None
        
        if HAS_VISION_DEPS:
            # Create directories if they do not exist
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            
            if os.path.exists(self.model_path):
                try:
                    self.model = YOLO(self.model_path)
                    self.sct = mss.mss()
                    logger.info(f"YOLO detector successfully initialized with model {self.model_path}")
                except Exception as e:
                    logger.error(f"Error loading YOLO model: {e}. Falling back to Mock Vision.")
            else:
                logger.warning(f"YOLO model not found at {self.model_path}. Run download_datasets.py first or use Mock vision.")
        else:
            logger.warning("YOLO detector initialized in MOCK mode due to missing packages.")

    def capture_minecraft_window(self) -> Tuple[np.ndarray, Dict[str, int]]:
        """
        Locates the Minecraft window and captures its screen area.
        If the window cannot be found, it captures the primary monitor region.
        """
        if not HAS_VISION_DEPS or not self.sct:
            return None, {}

        # Search for window title
        import pygetwindow as gw
        try:
            windows = gw.getWindowsWithTitle(self.window_title)
            if windows:
                win = windows[0]
                # Check if minimized
                if not win.isMinimized:
                    # win32 window dimensions
                    region = {
                        "top": win.top,
                        "left": win.left,
                        "width": win.width,
                        "height": win.height
                    }
                    img = np.array(self.sct.grab(region))
                    # Convert BGRA to BGR
                    img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
                    return img, region
            
            # Fallback to full screen if window not active/found
            monitor = self.sct.monitors[1] # Primary screen
            img = np.array(self.sct.grab(monitor))
            img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
            return img, monitor
            
        except Exception as e:
            logger.error(f"Screen capture failure: {e}")
            return None, {}

    def detect_entities(self, bot_entities: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Runs YOLO object detection on the captured screen.
        If YOLO is offline, uses bot_entities coordinates to mock vision detection.
        """
        # If YOLO model is not loaded, we mock the vision detections based on bot radar coordinates
        if not HAS_VISION_DEPS or self.model is None:
            return self._generate_mock_detections(bot_entities)
            
        try:
            img, region = self.capture_minecraft_window()
            if img is None:
                return self._generate_mock_detections(bot_entities)
                
            results = self.model(img, verbose=False)
            detections = []
            
            # Map YOLO output classes to Minecraft entities
            # Custom class list (if using custom weights, otherwise coco mapping)
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    cls_id = int(box.cls[0])
                    label = self.model.names[cls_id]
                    confidence = float(box.conf[0])
                    
                    # Convert bounding boxes relative to window screen
                    coords = box.xyxy[0].tolist() # [x1, y1, x2, y2]
                    
                    detections.append({
                        "label": label,
                        "confidence": confidence,
                        "box": [
                            int(coords[0] + region.get("left", 0)),
                            int(coords[1] + region.get("top", 0)),
                            int(coords[2] + region.get("left", 0)),
                            int(coords[3] + region.get("top", 0))
                        ],
                        "source": "yolo"
                    })
            return detections
            
        except Exception as e:
            logger.error(f"YOLO detection exception: {e}")
            return self._generate_mock_detections(bot_entities)

    def _generate_mock_detections(self, bot_entities: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Simulates vision detections using internal Mineflayer entities coordinates.
        This provides a seamless integration even without a local GPU or open window.
        """
        detections = []
        if not bot_entities:
            # Static mock detections if no bot entities are supplied
            return [
                {"label": "oak_tree", "confidence": 0.95, "box": [100, 150, 250, 400], "source": "simulated"},
                {"label": "sheep", "confidence": 0.88, "box": [300, 280, 380, 350], "source": "simulated"}
            ]
            
        for ent in bot_entities:
            # Map internal Minecraft names to friendly visual labels
            name = ent.get("name", "unknown")
            if name in ["zombie", "skeleton", "creeper", "spider", "pig", "sheep", "cow", "chicken"]:
                detections.append({
                    "label": name,
                    "confidence": 0.99,
                    # Mock bounding box dimensions based on position
                    "box": [200, 200, 300, 350],
                    "source": "radar",
                    "position": ent.get("position")
                })
        return detections
