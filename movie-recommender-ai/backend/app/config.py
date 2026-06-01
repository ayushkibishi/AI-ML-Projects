import os
from dotenv import load_dotenv

# Load .env file from the backend folder if it exists
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(backend_dir, ".env"))

class Settings:
    PROJECT_NAME: str = "AI Movie Recommendation System API"
    VERSION: str = "1.0.0"
    
    # Run config
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # Database and ML settings
    DATASET_TYPE: str = os.getenv("DATASET_TYPE", "small") # "small" or "25m"
    
    # API Keys
    TMDB_API_KEY: str = os.getenv("TMDB_API_KEY", "")
    OMDB_API_KEY: str = os.getenv("OMDB_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Firebase
    # Path to the firebase service account key JSON file
    FIREBASE_SERVICE_ACCOUNT_PATH: str = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "")
    # Or stringified JSON contents
    FIREBASE_SERVICE_ACCOUNT_JSON: str = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    
    @property
    def is_firebase_configured(self) -> bool:
        return bool(
            self.FIREBASE_SERVICE_ACCOUNT_PATH 
            or self.FIREBASE_SERVICE_ACCOUNT_JSON 
            or os.path.exists(os.path.join(backend_dir, "firebase-service-account.json"))
        )

settings = Settings()
