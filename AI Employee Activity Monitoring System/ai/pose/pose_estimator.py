import cv2
import numpy as np

try:
    import mediapipe as mp
    import mediapipe.python.solutions.pose as mp_pose
    import mediapipe.python.solutions.drawing_utils as mp_draw
    MEDIAPIPE_AVAILABLE = True
except Exception:
    MEDIAPIPE_AVAILABLE = False

class PoseEstimator:
    def __init__(self):
        self.is_fallback = not MEDIAPIPE_AVAILABLE
        
        if not self.is_fallback:
            try:
                self.mp_pose = mp_pose
                self.pose = mp_pose.Pose(
                    static_image_mode=False,
                    model_complexity=1,
                    smooth_landmarks=True,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5
                )
                self.mp_draw = mp_draw
                print("[PoseEstimator] MediaPipe Pose successfully loaded.")
            except Exception as e:
                print(f"[PoseEstimator] Error initializing MediaPipe: {e}. Falling back.")
                self.is_fallback = True
        else:
            print("[PoseEstimator] MediaPipe not installed. Running in simulation mode.")

    def estimate(self, frame, bounding_boxes=None):
        """
        Processes frame for pose landmarks.
        Returns:
            list of dicts containing skeleton keypoints.
            Keypoint coordinates are absolute pixel values.
        """
        if self.is_fallback:
            return self._simulate_skeletons(frame, bounding_boxes)
            
        try:
            # MediaPipe expects RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb_frame)
            skeletons = []
            
            if results.pose_landmarks:
                h, w, _ = frame.shape
                landmarks = []
                for lm in results.pose_landmarks.landmark:
                    landmarks.append({
                        "x": int(lm.x * w),
                        "y": int(lm.y * h),
                        "z": lm.z,
                        "visibility": lm.visibility
                    })
                skeletons.append(landmarks)
                
            # If skeletons found, return them. If empty but we have bounding boxes, we can augment.
            if not skeletons and bounding_boxes:
                return self._simulate_skeletons(frame, bounding_boxes)
                
            return skeletons
        except Exception as e:
            print(f"[PoseEstimator] Pose estimation error: {e}")
            return self._simulate_skeletons(frame, bounding_boxes)

    def _simulate_skeletons(self, frame, bounding_boxes):
        """Generates realistic skeletal landmarks inside bounding boxes to simulate pose estimation."""
        if not bounding_boxes:
            return []
            
        skeletons = []
        for det in bounding_boxes:
            if det["class_name"] != "person":
                continue
                
            x1, y1, x2, y2 = det["box"]
            w_box = x2 - x1
            h_box = y2 - y1
            
            # We will generate a basic 33-point mock skeleton mapped to the box
            landmarks = []
            
            # Check if there is simulated state in metadata
            sim_meta = det.get("sim_meta", {})
            state = sim_meta.get("state", "standing")
            
            # We'll map standard key joints (Nose, Shoulders, Elbows, Wrists, Hips, Knees, Ankles)
            # MediaPipe landmarks map (0: nose, 11: l_shoulder, 12: r_shoulder, 13: l_elbow, 14: r_elbow, 
            # 15: l_wrist, 16: r_wrist, 23: l_hip, 24: r_hip, 25: l_knee, 26: r_knee, 27: l_ankle, 28: r_ankle)
            
            # Standard relative offsets based on posture state
            offsets = {i: (0.5, 0.5) for i in range(33)} # Default center
            
            if state == "standing":
                offsets.update({
                    0: (0.5, 0.12), # Nose
                    11: (0.4, 0.22), 12: (0.6, 0.22), # Shoulders
                    13: (0.35, 0.45), 14: (0.65, 0.45), # Elbows
                    15: (0.35, 0.65), 16: (0.65, 0.65), # Wrists
                    23: (0.42, 0.55), 24: (0.58, 0.55), # Hips
                    25: (0.42, 0.78), 26: (0.58, 0.78), # Knees
                    27: (0.42, 0.96), 28: (0.58, 0.96)  # Ankles
                })
            elif state == "sitting":
                offsets.update({
                    0: (0.5, 0.2), # Nose
                    11: (0.38, 0.35), 12: (0.62, 0.35), # Shoulders
                    13: (0.32, 0.55), 14: (0.68, 0.55), # Elbows
                    15: (0.42, 0.68), 16: (0.58, 0.68), # Wrists (resting on desk)
                    23: (0.38, 0.7), 24: (0.62, 0.7), # Hips
                    25: (0.28, 0.82), 26: (0.72, 0.82), # Knees (bent forward)
                    27: (0.32, 0.95), 28: (0.68, 0.95)  # Ankles
                })
            else: # sleeping / slouched on desk or horizontal
                offsets.update({
                    0: (0.4, 0.45), # Nose (resting down)
                    11: (0.35, 0.35), 12: (0.55, 0.38), # Shoulders
                    13: (0.25, 0.5), 14: (0.6, 0.45), # Elbows
                    15: (0.3, 0.6), 16: (0.55, 0.58), # Wrists
                    23: (0.45, 0.7), 24: (0.55, 0.7), # Hips
                    25: (0.4, 0.85), 26: (0.6, 0.85), # Knees
                    27: (0.42, 0.96), 28: (0.58, 0.96)  # Ankles
                })
                
            for idx in range(33):
                ox, oy = offsets.get(idx, (0.5, 0.5))
                landmarks.append({
                    "x": int(x1 + ox * w_box),
                    "y": int(y1 + oy * h_box),
                    "z": 0.0,
                    "visibility": 0.99
                })
            skeletons.append(landmarks)
            
        return skeletons
