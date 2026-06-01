import os
import json
import time
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore
from app.config import settings, backend_dir

class FirebaseDatabaseClient:
    def __init__(self):
        self.use_firebase = False
        self.db = None
        self.mock_file_path = os.path.join(backend_dir, "mock_db.json")
        self._init_firebase()
        
        if not self.use_firebase:
            print("WARNING: Firebase is NOT configured. Running with local Mock JSON database.")
            self._init_mock_db()

    def _init_firebase(self):
        try:
            # Check if already initialized
            if firebase_admin._apps:
                self.db = firestore.client()
                self.use_firebase = True
                print("Firebase Admin SDK already initialized.")
                return

            # Check service account file path
            cred_path = settings.FIREBASE_SERVICE_ACCOUNT_PATH
            if not cred_path:
                default_file = os.path.join(backend_dir, "firebase-service-account.json")
                if os.path.exists(default_file):
                    cred_path = default_file

            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                self.use_firebase = True
                print(f"Firebase Admin SDK initialized successfully from file: {cred_path}")
                return

            # Check JSON contents env var
            cred_json = settings.FIREBASE_SERVICE_ACCOUNT_JSON
            if cred_json:
                cred_dict = json.loads(cred_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                self.use_firebase = True
                print("Firebase Admin SDK initialized successfully from env JSON.")
                return
                
        except Exception as e:
            print(f"Failed to initialize Firebase Admin SDK: {e}")
            self.use_firebase = False
            self.db = None

    def _init_mock_db(self):
        if not os.path.exists(self.mock_file_path):
            initial_data = {
                "users": {},
                "watchlists": {},
                "ratings": {},
                "reviews": {}
            }
            self._write_mock_db(initial_data)

    def _read_mock_db(self) -> dict:
        try:
            with open(self.mock_file_path, "r") as f:
                return json.load(f)
        except Exception:
            return {"users": {}, "watchlists": {}, "ratings": {}, "reviews": {}}

    def _write_mock_db(self, data: dict):
        try:
            with open(self.mock_file_path, "w") as f:
                json.dump(data, f, indent=4)
        except Exception as e:
            print(f"Failed to write mock database: {e}")

    # --- User operations ---
    def get_user_profile(self, user_id: str) -> dict:
        if self.use_firebase:
            doc_ref = self.db.collection("users").document(user_id)
            doc = doc_ref.get()
            return doc.to_dict() if doc.exists else None
        else:
            db_data = self._read_mock_db()
            return db_data["users"].get(user_id, None)

    def upsert_user_profile(self, user_id: str, profile_data: dict):
        profile_data["updatedAt"] = datetime.utcnow().isoformat()
        if self.use_firebase:
            doc_ref = self.db.collection("users").document(user_id)
            doc_ref.set(profile_data, merge=True)
        else:
            db_data = self._read_mock_db()
            if user_id not in db_data["users"]:
                db_data["users"][user_id] = {
                    "uid": user_id,
                    "createdAt": datetime.utcnow().isoformat()
                }
            db_data["users"][user_id].update(profile_data)
            self._write_mock_db(db_data)

    # --- Watchlist operations ---
    def get_watchlist(self, user_id: str) -> list:
        """Returns watchlist as a list of dictionaries."""
        if self.use_firebase:
            doc_ref = self.db.collection("watchlists").document(user_id)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                return data.get("movies", [])
            return []
        else:
            db_data = self._read_mock_db()
            return db_data["watchlists"].get(user_id, [])

    def add_to_watchlist(self, user_id: str, movie_id: int, movie_title: str = "", tmdb_id: int = None):
        watchlist = self.get_watchlist(user_id)
        
        # Check if already in watchlist
        if any(item.get("movieId") == movie_id for item in watchlist):
            return watchlist # Already exists
            
        new_item = {
            "movieId": movie_id,
            "title": movie_title,
            "tmdbId": tmdb_id,
            "watched": False,
            "favorite": False,
            "rating": None,
            "addedAt": datetime.utcnow().isoformat()
        }
        watchlist.append(new_item)
        
        if self.use_firebase:
            doc_ref = self.db.collection("watchlists").document(user_id)
            doc_ref.set({"movies": watchlist}, merge=True)
        else:
            db_data = self._read_mock_db()
            db_data["watchlists"][user_id] = watchlist
            self._write_mock_db(db_data)
            
        return watchlist

    def remove_from_watchlist(self, user_id: str, movie_id: int):
        watchlist = self.get_watchlist(user_id)
        watchlist = [item for item in watchlist if item.get("movieId") != movie_id]
        
        if self.use_firebase:
            doc_ref = self.db.collection("watchlists").document(user_id)
            doc_ref.set({"movies": watchlist}, merge=True)
        else:
            db_data = self._read_mock_db()
            db_data["watchlists"][user_id] = watchlist
            self._write_mock_db(db_data)
            
        return watchlist

    def update_watchlist_item(self, user_id: str, movie_id: int, fields: dict):
        """Updates specific fields like 'watched', 'favorite', or 'rating'."""
        watchlist = self.get_watchlist(user_id)
        updated = False
        
        for item in watchlist:
            if item.get("movieId") == movie_id:
                item.update(fields)
                updated = True
                break
                
        if not updated:
            return watchlist
            
        if self.use_firebase:
            doc_ref = self.db.collection("watchlists").document(user_id)
            doc_ref.set({"movies": watchlist}, merge=True)
        else:
            db_data = self._read_mock_db()
            db_data["watchlists"][user_id] = watchlist
            self._write_mock_db(db_data)
            
        return watchlist

    # --- Ratings operations ---
    def get_user_ratings(self, user_id: str) -> dict:
        """Returns dict of {movieId: rating}."""
        if self.use_firebase:
            ratings_ref = self.db.collection("ratings").document(user_id)
            doc = ratings_ref.get()
            if doc.exists:
                return {int(k): float(v) for k, v in doc.to_dict().items()}
            return {}
        else:
            db_data = self._read_mock_db()
            user_ratings = db_data["ratings"].get(user_id, {})
            return {int(k): float(v) for k, v in user_ratings.items()}

    def submit_rating(self, user_id: str, movie_id: int, rating: float):
        """Saves a user rating. Also updates the watchlist item if present."""
        # 1. Update ratings document
        if self.use_firebase:
            ratings_ref = self.db.collection("ratings").document(user_id)
            ratings_ref.set({str(movie_id): rating}, merge=True)
        else:
            db_data = self._read_mock_db()
            if user_id not in db_data["ratings"]:
                db_data["ratings"][user_id] = {}
            db_data["ratings"][user_id][str(movie_id)] = rating
            self._write_mock_db(db_data)
            
        # 2. Sync to watchlist if it exists
        self.update_watchlist_item(user_id, movie_id, {"rating": rating, "watched": True})

    # --- Reviews operations ---
    def get_movie_reviews(self, movie_id: int) -> list:
        if self.use_firebase:
            reviews_ref = self.db.collection("reviews").where("movieId", "==", movie_id)
            docs = reviews_ref.stream()
            reviews = []
            for doc in docs:
                r = doc.to_dict()
                r["id"] = doc.id
                reviews.append(r)
            # Sort by date
            reviews.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            return reviews
        else:
            db_data = self._read_mock_db()
            movie_reviews = db_data["reviews"].get(str(movie_id), [])
            return sorted(movie_reviews, key=lambda x: x.get("timestamp", ""), reverse=True)

    def add_movie_review(self, movie_id: int, user_id: str, user_email: str, content: str, sentiment_scores: dict):
        review_data = {
            "movieId": movie_id,
            "userId": user_id,
            "userEmail": user_email,
            "content": content,
            "sentiment": sentiment_scores,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if self.use_firebase:
            doc_ref = self.db.collection("reviews").document()
            doc_ref.set(review_data)
            review_data["id"] = doc_ref.id
        else:
            db_data = self._read_mock_db()
            str_m_id = str(movie_id)
            if str_m_id not in db_data["reviews"]:
                db_data["reviews"][str_m_id] = []
            
            # Generate local unique ID
            review_data["id"] = f"rev_{int(time.time()*1000)}"
            db_data["reviews"][str_m_id].append(review_data)
            self._write_mock_db(db_data)
            
        return review_data

db_client = FirebaseDatabaseClient()
