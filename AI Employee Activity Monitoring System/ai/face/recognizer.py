import os
import cv2
import numpy as np

# Try to import face_recognition, fall back to simulated recognition
try:
    import face_recognition
    FACE_REC_AVAILABLE = True
except ImportError:
    FACE_REC_AVAILABLE = False

class FaceRecognizer:
    def __init__(self, registered_dir="recordings/faces"):
        self.registered_dir = registered_dir
        self.is_fallback = not FACE_REC_AVAILABLE
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_departments = []
        
        # Ensure registration directory exists
        os.makedirs(self.registered_dir, exist_ok=True)
        
        if not self.is_fallback:
            try:
                self.load_registered_faces()
                print(f"[FaceRecognizer] Loaded {len(self.known_face_names)} registered faces.")
            except Exception as e:
                print(f"[FaceRecognizer] Error loading registered faces: {e}. Falling back.")
                self.is_fallback = True
        else:
            print("[FaceRecognizer] face_recognition library not available. Running in simulation mode.")
            # Set up mock employees for demo
            self.mock_employees = [
                {"name": "Aayush Sharma", "department": "AI Research", "confidence": 0.94},
                {"name": "Jessica Chen", "department": "Product Design", "confidence": 0.88},
                {"name": "Michael Brown", "department": "Operations", "confidence": 0.91}
            ]

    def load_registered_faces(self):
        """Loads images from registered directory and computes their facial encodings."""
        if self.is_fallback:
            return
            
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_departments = []
        
        for file in os.listdir(self.registered_dir):
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                path = os.path.join(self.registered_dir, file)
                try:
                    # File name structure: Name_Department.ext
                    filename_without_ext = os.path.splitext(file)[0]
                    parts = filename_without_ext.split('_')
                    name = parts[0].replace('-', ' ')
                    dept = parts[1].replace('-', ' ') if len(parts) > 1 else "General"
                    
                    image = face_recognition.load_image_file(path)
                    encodings = face_recognition.face_encodings(image)
                    
                    if len(encodings) > 0:
                        self.known_face_encodings.append(encodings[0])
                        self.known_face_names.append(name)
                        self.known_face_departments.append(dept)
                        print(f"[FaceRecognizer] Enrolled employee: {name} ({dept})")
                    else:
                        print(f"[FaceRecognizer] Warning: No face found in {file}")
                except Exception as e:
                    print(f"[FaceRecognizer] Failed to load {file}: {e}")

    def register_new_face(self, name, department, image_bytes):
        """Registers a new face by saving the image and re-encoding it."""
        # Clean names for filename safety
        safe_name = name.replace(' ', '-')
        safe_dept = department.replace(' ', '-')
        filename = f"{safe_name}_{safe_dept}.jpg"
        filepath = os.path.join(self.registered_dir, filename)
        
        # Save image file
        with open(filepath, "wb") as f:
            f.write(image_bytes)
            
        print(f"[FaceRecognizer] Saved registration image to {filepath}")
        
        # Reload registered faces
        if not self.is_fallback:
            self.load_registered_faces()
            return True
        else:
            # If in mock mode, add to mock employee list
            self.mock_employees.append({
                "name": name,
                "department": department,
                "confidence": 0.95
            })
            return True

    def recognize(self, frame, person_boxes):
        """
        Matches faces in the person boxes against the database.
        Returns:
            list of dicts containing recognized names, departments, and confidence scores matching person_boxes length.
        """
        identities = []
        
        if self.is_fallback:
            # Simulated recognition
            for idx, box in enumerate(person_boxes):
                # Grab names based on index or metadata if available
                sim_meta = box.get("sim_meta", {})
                sim_name = sim_meta.get("name")
                
                if sim_name:
                    matching_mock = next((emp for emp in self.mock_employees if emp["name"] == sim_name), None)
                    if matching_mock:
                        identities.append({
                            "name": matching_mock["name"],
                            "department": matching_mock["department"],
                            "confidence": matching_mock["confidence"]
                        })
                        continue
                
                # Default mock mapping
                mock_idx = idx % len(self.mock_employees)
                emp = self.mock_employees[mock_idx]
                identities.append({
                    "name": emp["name"],
                    "department": emp["department"],
                    "confidence": emp["confidence"]
                })
            return identities

        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            for box_data in person_boxes:
                x1, y1, x2, y2 = box_data["box"]
                h, w, _ = frame.shape
                
                # Crop face area roughly (top 35% of the person's bounding box)
                face_h = int((y2 - y1) * 0.35)
                face_box = [max(0, y1), min(w, x2), min(h, y1 + face_h), max(0, x1)] # top, right, bottom, left in face_recognition format
                
                # Check face encodings in this bounding box
                # Convert our box format (x1, y1, x2, y2) to face_recognition box (top, right, bottom, left)
                fr_box = [(max(0, y1), min(w, x2), min(h, y2), max(0, x1))]
                
                encodings = face_recognition.face_encodings(rgb_frame, fr_box)
                
                if len(encodings) > 0 and len(self.known_face_encodings) > 0:
                    encoding = encodings[0]
                    # Compare
                    matches = face_recognition.compare_faces(self.known_face_encodings, encoding, tolerance=0.6)
                    face_distances = face_recognition.face_distance(self.known_face_encodings, encoding)
                    
                    best_match_idx = np.argmin(face_distances) if len(face_distances) > 0 else -1
                    
                    if best_match_idx != -1 and matches[best_match_idx]:
                        name = self.known_face_names[best_match_idx]
                        dept = self.known_face_departments[best_match_idx]
                        # Confidence score formula derived from distance
                        conf = float(1.0 - face_distances[best_match_idx])
                        identities.append({
                            "name": name,
                            "department": dept,
                            "confidence": max(0.5, min(0.99, conf))
                        })
                    else:
                        identities.append({
                            "name": "Unknown Person",
                            "department": "Security Risk",
                            "confidence": 0.0
                        })
                else:
                    # Check if we can assign a simulated name if encoding fails
                    identities.append({
                        "name": "Unknown",
                        "department": "Scanning...",
                        "confidence": 0.5
                    })
            return identities
        except Exception as e:
            print(f"[FaceRecognizer] Face recognition execution error: {e}")
            return [{"name": "Unknown", "department": "System Error", "confidence": 0.0}] * len(person_boxes)
