import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
load_dotenv()

class Config:
    # Workspace root
    BASE_DIR = Path(__file__).resolve().parent

    # Database
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "spotify_tracks")

    @classmethod
    def get_db_url(cls) -> str:
        return f"postgresql://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"

    # ETL Paths
    DATASET_URL = os.getenv("DATASET_URL", "https://huggingface.co/datasets/maharshipandya/spotify-tracks-dataset/resolve/main/dataset.csv")
    
    # Resolve file paths relative to project root
    RAW_DATA_PATH = BASE_DIR / os.getenv("RAW_DATA_PATH", "data/raw/dataset.csv")
    PROCESSED_DATA_DIR = BASE_DIR / os.getenv("PROCESSED_DATA_DIR", "data/processed/")
    
    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = BASE_DIR / os.getenv("LOG_FILE", "etl.log")

    # Scheduler
    SCHEDULE_INTERVAL_MINUTES = int(os.getenv("SCHEDULE_INTERVAL_MINUTES", "60"))

    @classmethod
    def initialize_dirs(cls):
        """Create raw and processed directories if they don't exist."""
        cls.RAW_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
        cls.PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Auto-initialize directories on import
Config.initialize_dirs()
