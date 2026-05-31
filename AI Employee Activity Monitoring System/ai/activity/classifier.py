import numpy as np

class ActivityClassifier:
    def __init__(self):
        # We can keep track of historical movements to detect prolonged inactivity
        self.tracker_centroids = {} # id -> list of (x,y)
        self.inactivity_threshold = 15.0 # movement pixels over 100 frames

    def classify(self, tracked_people, skeletons, detections):
        """
        Classifies activity for each tracked person.
        tracked_people: list of dicts from Tracker [{'id': id, 'box': [x1,y1,x2,y2], ...}]
        skeletons: list of lists of landmarks
        detections: list of all raw detections from YOLO
        Returns:
            list of dicts containing activity mappings:
            {'track_id': int, 'activity': str, 'inactivity_score': float, 'is_meeting': bool}
        """
        activities = []
        
        # Build index of cell phone bounding boxes
        phone_boxes = [d['box'] for d in detections if d['class_name'] == 'cell phone']
        
        # Check meetings: if people are close to each other
        meeting_ids = self._detect_meetings(tracked_people)
        
        for idx, person in enumerate(tracked_people):
            track_id = person['id']
            box = person['box']
            x1, y1, x2, y2 = box
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            
            # 1. Update centroid history for inactivity tracking
            if track_id not in self.tracker_centroids:
                self.tracker_centroids[track_id] = []
            self.tracker_centroids[track_id].append((cx, cy))
            if len(self.tracker_centroids[track_id]) > 100:
                self.tracker_centroids[track_id].pop(0)
                
            # Calculate inactivity (distance traveled in history)
            inactivity_score = 0.0
            if len(self.tracker_centroids[track_id]) >= 30:
                history = self.tracker_centroids[track_id]
                first = history[0]
                last = history[-1]
                distance = np.sqrt((first[0] - last[0])**2 + (first[1] - last[1])**2)
                # Inactivity score: 1.0 means no movement, 0.0 means active
                inactivity_score = max(0.0, 1.0 - (distance / self.inactivity_threshold))
                
            # 2. Heuristic check if there's a custom state in simulation
            sim_meta = person.get('sim_meta')
            if sim_meta and 'state' in sim_meta:
                sim_state = sim_meta['state']
                
                # Check phone usage overlay manually for mock
                has_phone = False
                for p_box in phone_boxes:
                    # Phone inside person bounding box
                    if p_box[0] >= x1 and p_box[2] <= x2 and p_box[1] >= y1 and p_box[3] <= y2:
                        has_phone = True
                        break
                        
                activity = "phone usage" if has_phone else sim_state
                
                activities.append({
                    "track_id": track_id,
                    "activity": activity,
                    "inactivity_score": float(inactivity_score),
                    "is_meeting": track_id in meeting_ids
                })
                continue
                
            # 3. MediaPipe skeleton-based classification
            # Fetch the skeleton that overlaps most with the person box
            skeleton = self._find_matching_skeleton(box, skeletons)
            
            activity = "idle posture"
            if skeleton:
                # Get key landmarks
                # Nose(0), ShoulderL(11), ShoulderR(12), HipL(23), HipR(24), KneeL(25), KneeR(26), AnkleL(27), AnkleR(28)
                try:
                    nose = skeleton[0]
                    sh_l, sh_r = skeleton[11], skeleton[12]
                    hip_l, hip_r = skeleton[23], skeleton[24]
                    knee_l, knee_r = skeleton[25], skeleton[26]
                    ankle_l, ankle_r = skeleton[27], skeleton[28]
                    
                    # Calculate vertical spans
                    sh_y = (sh_l['y'] + sh_r['y']) / 2
                    hip_y = (hip_l['y'] + hip_r['y']) / 2
                    knee_y = (knee_l['y'] + knee_r['y']) / 2
                    ankle_y = (ankle_l['y'] + ankle_r['y']) / 2
                    
                    # Ratios of joint spans
                    body_height = ankle_y - sh_y
                    torso_len = hip_y - sh_y
                    leg_len = ankle_y - hip_y
                    
                    # Check sleeping (low height, horizontal skeleton)
                    is_horizontal = abs(sh_l['x'] - hip_l['x']) > abs(sh_l['y'] - hip_l['y']) * 1.5
                    if is_horizontal or (y2 - y1) < (x2 - x1) * 0.8:
                        activity = "sleeping"
                    # Check standing vs sitting
                    elif torso_len > 0 and leg_len > 0:
                        ratio = leg_len / torso_len
                        # In standing pose, legs are straight, so hip-to-ankle distance is large relative to torso
                        # In sitting, hip-to-knee horizontal distance is large but vertical is compressed
                        if ratio < 1.1:
                            activity = "sitting"
                        else:
                            # Verify if walking by tracking centroid speed
                            if inactivity_score < 0.3:
                                activity = "walking"
                            else:
                                activity = "standing"
                except Exception:
                    pass
            else:
                # Fallback to bounding box aspect ratio
                aspect_ratio = (y2 - y1) / (x2 - x1) if (x2 - x1) > 0 else 1
                if aspect_ratio < 0.9:
                    activity = "sleeping"
                elif aspect_ratio < 1.8:
                    activity = "sitting"
                else:
                    # Centroid movement check
                    activity = "walking" if inactivity_score < 0.3 else "standing"
                    
            # 4. Phone usage check
            has_phone = False
            for p_box in phone_boxes:
                # Check intersection of cell phone with person's top half (where hands and face are)
                px1, py1, px2, py2 = p_box
                # If phone is inside the person bounding box
                if px1 >= x1 - 10 and px2 <= x2 + 10 and py1 >= y1 and py2 <= y2:
                    # Phone is near the top half (torso and head)
                    if py1 < y1 + (y2 - y1) * 0.7:
                        has_phone = True
                        break
                        
            if has_phone:
                activity = "phone usage"
                
            activities.append({
                "track_id": track_id,
                "activity": activity,
                "inactivity_score": float(inactivity_score),
                "is_meeting": track_id in meeting_ids
            })
            
        return activities

    def _find_matching_skeleton(self, box, skeletons):
        if not skeletons:
            return None
        x1, y1, x2, y2 = box
        
        best_skeleton = None
        best_match_count = 0
        
        for sk in skeletons:
            # Count how many skeleton points fall inside the box
            match_count = sum(1 for pt in sk if x1 <= pt['x'] <= x2 and y1 <= pt['y'] <= y2)
            if match_count > best_match_count:
                best_match_count = match_count
                best_skeleton = sk
                
        # Return skeleton if at least 5 joints reside inside the box
        return best_skeleton if best_match_count >= 5 else None

    def _detect_meetings(self, tracked_people):
        """Returns track IDs of people who are participating in a group meeting/cluster."""
        meeting_ids = set()
        n = len(tracked_people)
        if n < 2:
            return meeting_ids
            
        # Compare distances between bounding box centers
        for i in range(n):
            for j in range(i+1, n):
                p1, p2 = tracked_people[i], tracked_people[j]
                b1, b2 = p1['box'], p2['box']
                c1 = ((b1[0] + b1[2]) / 2, (b1[1] + b1[3]) / 2)
                c2 = ((b2[0] + b2[2]) / 2, (b2[1] + b2[3]) / 2)
                dist = np.sqrt((c1[0] - c2[0])**2 + (c1[1] - c2[1])**2)
                
                # Check proximity threshold (e.g. within 200 pixels)
                if dist < 220:
                    meeting_ids.add(p1['id'])
                    meeting_ids.add(p2['id'])
                    
        return meeting_ids
