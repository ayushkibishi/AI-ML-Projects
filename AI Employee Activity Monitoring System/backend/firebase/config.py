import os
import json
from dotenv import load_dotenv

load_dotenv()

# We try to import firebase_admin, if not available we use mock
try:
    import firebase_admin
    from firebase_admin import credentials, firestore, auth
    FIREBASE_ADMIN_INSTALLED = True
except ImportError:
    FIREBASE_ADMIN_INSTALLED = False

db = None
firebase_app = None
FIREBASE_READY = False

# Firebase Service Account JSON credentials can be put in a file called firebase_key.json
# or defined directly in .env under FIREBASE_SERVICE_ACCOUNT_JSON
service_account_path = os.getenv("FIREBASE_KEY_PATH", "backend/firebase_key.json")

# In-memory mock databases for local evaluation
mock_db = {
    "employees": {
        "emp1": {"name": "Aayush Sharma", "department": "AI Research", "attendance_status": "Present", "confidence": 0.94, "last_seen": "20:38:02", "photo_url": "/faces/aayush.jpg"},
        "emp2": {"name": "Jessica Chen", "department": "Product Design", "attendance_status": "Present", "confidence": 0.88, "last_seen": "20:30:11", "photo_url": "/faces/jessica.jpg"},
        "emp3": {"name": "Michael Brown", "department": "Operations", "attendance_status": "Absent", "confidence": 0.0, "last_seen": "Yesterday", "photo_url": "/faces/michael.jpg"}
    },
    "logs": [
        {"timestamp": "09:00 AM", "employee_name": "Aayush Sharma", "department": "AI Research", "activity": "Entered Office", "confidence": 0.95, "status": "Present"},
        {"timestamp": "09:15 AM", "employee_name": "Jessica Chen", "department": "Product Design", "activity": "Entered Office", "confidence": 0.91, "status": "Present"},
        {"timestamp": "11:10 AM", "employee_name": "Aayush Sharma", "department": "AI Research", "activity": "Meeting detected", "confidence": 0.89, "status": "Present"},
        {"timestamp": "01:00 PM", "employee_name": "Jessica Chen", "department": "Product Design", "activity": "Lunch break", "confidence": 0.88, "status": "On Break"},
        {"timestamp": "04:30 PM", "employee_name": "Michael Brown", "department": "Operations", "activity": "Long inactivity detected", "confidence": 0.92, "status": "Absent"}
    ],
    "alerts": [
        {"id": "alt_1", "timestamp": "20:38:02", "type": "unauthorized person", "details": "Unknown face detected in Restricted Area-3", "severity": "High", "resolved": False},
        {"id": "alt_2", "timestamp": "16:30:00", "type": "sleeping employee", "details": "Michael Brown sleeping at workspace Desk 4", "severity": "Medium", "resolved": True}
    ]
}

if FIREBASE_ADMIN_INSTALLED:
    try:
        # Check if Firebase key path exists
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_app = firebase_admin.initialize_app(cred)
            db = firestore.client()
            FIREBASE_READY = True
            print(f"[Firebase Config] Successfully initialized Firebase using credential file: {service_account_path}")
        elif os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON"):
            cred_dict = json.loads(os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON"))
            cred = credentials.Certificate(cred_dict)
            firebase_app = firebase_admin.initialize_app(cred)
            db = firestore.client()
            FIREBASE_READY = True
            print("[Firebase Config] Successfully initialized Firebase using credentials from env JSON.")
        else:
            print("[Firebase Config] Firebase credentials not found. Defaulting to local Demo Mode database.")
    except Exception as e:
        print(f"[Firebase Config] Error initializing Firebase: {e}. Defaulting to local Demo Mode database.")
else:
    print("[Firebase Config] firebase-admin package is not installed. Defaulting to local Demo Mode database.")

# Firestore wrapper helpers to support transparent fallback
class DatabaseClient:
    def get_employees(self) -> list:
        if FIREBASE_READY:
            try:
                docs = db.collection("employees").stream()
                return [{"id": doc.id, **doc.to_dict()} for doc in docs]
            except Exception as e:
                print(f"[DatabaseClient] Error reading Firestore: {e}")
        return [{"id": k, **v} for k, v in mock_db["employees"].items()]

    def add_employee(self, employee_id: str, data: dict) -> bool:
        if FIREBASE_READY:
            try:
                db.collection("employees").document(employee_id).set(data)
                return True
            except Exception as e:
                print(f"[DatabaseClient] Error writing Firestore: {e}")
        mock_db["employees"][employee_id] = data
        return True

    def get_logs(self) -> list:
        if FIREBASE_READY:
            try:
                docs = db.collection("logs").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(100).stream()
                return [doc.to_dict() for doc in docs]
            except Exception as e:
                print(f"[DatabaseClient] Error reading Firestore logs: {e}")
        return mock_db["logs"]

    def add_log(self, data: dict) -> bool:
        if FIREBASE_READY:
            try:
                db.collection("logs").add(data)
                return True
            except Exception as e:
                print(f"[DatabaseClient] Error adding Firestore log: {e}")
        mock_db["logs"].insert(0, data)
        # Cap local log size
        if len(mock_db["logs"]) > 200:
            mock_db["logs"].pop()
        return True

    def get_alerts(self) -> list:
        if FIREBASE_READY:
            try:
                docs = db.collection("alerts").order_by("timestamp", direction=firestore.Query.DESCENDING).stream()
                return [{"id": doc.id, **doc.to_dict()} for doc in docs]
            except Exception as e:
                print(f"[DatabaseClient] Error reading Firestore alerts: {e}")
        return mock_db["alerts"]

    def add_alert(self, alert_id: str, data: dict) -> bool:
        if FIREBASE_READY:
            try:
                db.collection("alerts").document(alert_id).set(data)
                return True
            except Exception as e:
                print(f"[DatabaseClient] Error adding Firestore alert: {e}")
        data["id"] = alert_id
        mock_db["alerts"].insert(0, data)
        return True

    def resolve_alert(self, alert_id: str) -> bool:
        if FIREBASE_READY:
            try:
                db.collection("alerts").document(alert_id).update({"resolved": True})
                return True
            except Exception as e:
                print(f"[DatabaseClient] Error updating Firestore alert: {e}")
        for item in mock_db["alerts"]:
            if item["id"] == alert_id:
                item["resolved"] = True
                return True
        return False

db_client = DatabaseClient()
