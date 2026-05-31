import cv2
import numpy as np
import time
import uuid
from datetime import datetime
from ai.yolo.detector import YOLODetector
from ai.pose.pose_estimator import PoseEstimator
from ai.face.recognizer import FaceRecognizer
from ai.tracking.tracker import Tracker
from ai.activity.classifier import ActivityClassifier
from backend.firebase.config import db_client

class AIRunner:
    def __init__(self):
        self.yolo = YOLODetector()
        self.pose = PoseEstimator()
        self.face = FaceRecognizer()
        self.tracker = Tracker()
        self.activity = ActivityClassifier()
        
        # Performance metrics
        self.prev_time = 0
        self.fps = 0
        
        # Track active alert states to prevent flooding
        self.active_alerts = {} # alert_type_track_id -> timestamp
        
    def process_frame(self, frame, settings: dict):
        """
        Runs the full AI pipeline on the input frame.
        settings: dict containing boolean flags: 'yolo_enabled', 'face_enabled', 'pose_enabled', 'activity_enabled', 'alert_sensitivity'
        Returns:
            processed_frame: numpy array with drawings
            metadata: dict containing telemetry stats, active people list, new alerts
        """
        # Calculate FPS
        current_time = time.time()
        if self.prev_time > 0:
            self.fps = int(1.0 / (current_time - self.prev_time))
        self.prev_time = current_time

        h, w, _ = frame.shape
        metadata = {
            "fps": self.fps,
            "occupancy": 0,
            "active_people": [],
            "alerts": []
        }

        # 1. Run YOLO Object Detection (Persons & Phones)
        raw_detections = []
        if settings.get("yolo_enabled", True):
            raw_detections = self.yolo.detect(frame)
            
        person_detections = [d for d in raw_detections if d["class_name"] == "person"]
        
        # 2. Run Person Multi-Object Tracking (DeepSORT-like IoU)
        tracked_people = self.tracker.update(person_detections)
        metadata["occupancy"] = len(tracked_people)
        
        # 3. Estimate Skeletons using MediaPipe
        skeletons = []
        if settings.get("pose_enabled", True) and len(tracked_people) > 0:
            skeletons = self.pose.estimate(frame, tracked_people)
            
        # 4. Face Recognition
        identities = []
        if settings.get("face_enabled", True) and len(tracked_people) > 0:
            identities = self.face.recognize(frame, tracked_people)
        else:
            # Default empty identities
            identities = [{"name": "Scanning...", "department": "System", "confidence": 0.0}] * len(tracked_people)
            
        # 5. Activity & Posture Classification
        activities = []
        if settings.get("activity_enabled", True) and len(tracked_people) > 0:
            activities = self.activity.classify(tracked_people, skeletons, raw_detections)
        else:
            activities = [{"track_id": p["id"], "activity": "active", "inactivity_score": 0.0, "is_meeting": False} for p in tracked_people]

        # Combine results & draw overlays
        activity_map = {act["track_id"]: act for act in activities}
        identity_map = {tracked_people[i]["id"]: identities[i] for i in range(len(tracked_people))}
        
        # Create visual overlays in BGR format
        # Cyberpunk colors: Neon Cyan (255, 255, 0), Neon Pink/Magenta (255, 0, 255), Glowing Red (0, 0, 255)
        CYAN = (255, 243, 0)
        MAGENTA = (235, 0, 255)
        RED = (0, 0, 255)
        GREEN = (0, 255, 128)
        YELLOW = (0, 255, 255)
        
        # Draw skeletons first (underneath boxes)
        if settings.get("pose_enabled", True):
            for sk in skeletons:
                # Draw lines between key joints (shoulders, torso, limbs)
                # Left Arm
                self._draw_bone(frame, sk, 11, 13, CYAN)
                self._draw_bone(frame, sk, 13, 15, CYAN)
                # Right Arm
                self._draw_bone(frame, sk, 12, 14, CYAN)
                self._draw_bone(frame, sk, 14, 16, CYAN)
                # Torso
                self._draw_bone(frame, sk, 11, 12, CYAN)
                self._draw_bone(frame, sk, 11, 23, CYAN)
                self._draw_bone(frame, sk, 12, 24, CYAN)
                self._draw_bone(frame, sk, 23, 24, CYAN)
                # Left Leg
                self._draw_bone(frame, sk, 23, 25, CYAN)
                self._draw_bone(frame, sk, 25, 27, CYAN)
                # Right Leg
                self._draw_bone(frame, sk, 24, 26, CYAN)
                self._draw_bone(frame, sk, 26, 28, CYAN)
                
                # Draw joints
                for pt in sk:
                    if pt["visibility"] > 0.5:
                        cv2.circle(frame, (pt["x"], pt["y"]), 3, MAGENTA, -1)

        # Draw Person details
        for i, person in enumerate(tracked_people):
            track_id = person["id"]
            x1, y1, x2, y2 = person["box"]
            
            # Fetch derived metadata
            act_info = activity_map.get(track_id, {"activity": "active", "inactivity_score": 0.0, "is_meeting": False})
            ident_info = identity_map.get(track_id, {"name": "Scanning...", "department": "System", "confidence": 0.0})
            
            current_activity = act_info["activity"]
            is_meeting = act_info["is_meeting"]
            employee_name = ident_info["name"]
            dept = ident_info["department"]
            
            # Append to active list
            metadata["active_people"].append({
                "track_id": track_id,
                "name": employee_name,
                "department": dept,
                "activity": current_activity,
                "inactivity_score": act_info["inactivity_score"],
                "is_meeting": is_meeting,
                "confidence": ident_info["confidence"]
            })
            
            # Determine color based on alerts
            box_color = CYAN
            if employee_name == "Unknown Person":
                box_color = RED
                self._trigger_alert("Unauthorized Entry", f"Unrecognized person detected in surveilled zone", "High", metadata)
            elif current_activity == "sleeping":
                box_color = RED
                self._trigger_alert("Sleeping Detected", f"{employee_name} sleeping at desk", "Medium", metadata)
            elif act_info["inactivity_score"] > 0.8:
                box_color = YELLOW
                self._trigger_alert("Prolonged Inactivity", f"{employee_name} inactive for too long", "Low", metadata)
            elif current_activity == "phone usage":
                box_color = MAGENTA
                
            # Draw cyberpunk bounding box (thick corners)
            self._draw_cyberpunk_box(frame, x1, y1, x2, y2, box_color)
            
            # Draw employee info card above bounding box
            card_y = max(10, y1 - 10)
            text_name = f"ID:{track_id} | {employee_name}"
            text_meta = f"{dept} | {current_activity.upper()}"
            
            # Card background
            card_w = max(150, (x2 - x1))
            cv2.rectangle(frame, (x1, max(0, y1 - 40)), (x1 + card_w, y1), (0, 0, 0), -1)
            cv2.rectangle(frame, (x1, max(0, y1 - 40)), (x1 + card_w, y1), box_color, 1)
            
            # Print text
            cv2.putText(frame, text_name, (x1 + 5, max(0, y1 - 25)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
            cv2.putText(frame, text_meta, (x1 + 5, max(0, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.35, box_color, 1, cv2.LINE_AA)

        # Draw Cell Phones
        for d in raw_detections:
            if d["class_name"] == "cell phone":
                px1, py1, px2, py2 = d["box"]
                cv2.rectangle(frame, (px1, py1), (px2, py2), MAGENTA, 1)
                cv2.putText(frame, "PHONE DETECTED", (px1, max(0, py1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.3, MAGENTA, 1, cv2.LINE_AA)

        # Render Live Status overlays in corners
        # Top-left telemetry
        cv2.rectangle(frame, (10, 10), (180, 75), (0, 0, 0), -1)
        cv2.rectangle(frame, (10, 10), (180, 75), CYAN, 1)
        cv2.putText(frame, "VISIONTRACK AI OS v1.0", (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(frame, f"FPS: {self.fps} | OCCUPANCY: {len(tracked_people)}", (15, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.35, CYAN, 1, cv2.LINE_AA)
        cv2.putText(frame, f"SYSTEM STATE: OPERATIONAL", (15, 62), cv2.FONT_HERSHEY_SIMPLEX, 0.3, GREEN, 1, cv2.LINE_AA)
        
        # Visual pulsing scan line
        scan_y = int((time.time() * 100) % h)
        cv2.line(frame, (0, scan_y), (w, scan_y), MAGENTA, 1)
        # Transparent overlay for laser scan (simulated by drawing dotted elements)
        for d_dot in range(0, w, 20):
            cv2.circle(frame, (d_dot, scan_y), 2, MAGENTA, -1)

        return frame, metadata

    def _draw_bone(self, frame, skeleton, joint1, joint2, color):
        if joint1 < len(skeleton) and joint2 < len(skeleton):
            j1 = skeleton[joint1]
            j2 = skeleton[joint2]
            if j1["visibility"] > 0.5 and j2["visibility"] > 0.5:
                cv2.line(frame, (j1["x"], j1["y"]), (j2["x"], j2["y"]), color, 1)

    def _draw_cyberpunk_box(self, frame, x1, y1, x2, y2, color):
        # Draw transparent bounding box outline
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1)
        
        # Corner lengths
        corner_len = min(20, int((x2 - x1) * 0.25))
        
        # Top-Left corner
        cv2.line(frame, (x1, y1), (x1 + corner_len, y1), color, 3)
        cv2.line(frame, (x1, y1), (x1, y1 + corner_len), color, 3)
        
        # Top-Right corner
        cv2.line(frame, (x2, y1), (x2 - corner_len, y1), color, 3)
        cv2.line(frame, (x2, y1), (x2, y1 + corner_len), color, 3)
        
        # Bottom-Left corner
        cv2.line(frame, (x1, y2), (x1 + corner_len, y2), color, 3)
        cv2.line(frame, (x1, y2), (x1, y2 - corner_len), color, 3)
        
        # Bottom-Right corner
        cv2.line(frame, (x2, y2), (x2 - corner_len, y2), color, 3)
        cv2.line(frame, (x2, y2), (x2, y2 - corner_len), color, 3)

    def _trigger_alert(self, alert_type, details, severity, metadata):
        # Alert cooldown to prevent logging same alert every frame (e.g. once every 1 minute)
        alert_key = f"{alert_type}_{details}"
        now = time.time()
        
        if alert_key not in self.active_alerts or (now - self.active_alerts[alert_key]) > 60:
            self.active_alerts[alert_key] = now
            alert_id = f"alt_{str(uuid.uuid4())[:8]}"
            alert_time = datetime.now().strftime("%H:%M:%S")
            alert_data = {
                "id": alert_id,
                "timestamp": alert_time,
                "type": alert_type.lower(),
                "details": details,
                "severity": severity,
                "resolved": False
            }
            # Save to database (transparent fallback to mock db)
            db_client.add_alert(alert_id, alert_data)
            
            # Save timeline action as well
            db_client.add_log({
                "timestamp": datetime.now().strftime("%I:%M %p"),
                "employee_name": "Security System" if severity == "High" else details.split(" ")[0],
                "department": "Security" if severity == "High" else "Staff",
                "activity": alert_type,
                "confidence": 0.99,
                "status": "Inactive" if severity == "Medium" else "Present"
            })
            
            metadata["alerts"].append(alert_data)
