import os
from pathlib import Path
from dotenv import load_dotenv

# Locate base directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env file
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path, override=True)

class Settings:
    # LLM Settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
    
    # Server Settings
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./minecraft_agent.db")
    
    # Minecraft Bot Connection Settings
    MINECRAFT_HOST: str = os.getenv("MINECRAFT_HOST", "127.0.0.1")
    MINECRAFT_PORT: int = int(os.getenv("MINECRAFT_PORT", "25565"))
    BOT_USERNAME: str = os.getenv("BOT_USERNAME", "MinecraftAIAgent")
    MINECRAFT_VERSION: str = os.getenv("MINECRAFT_VERSION", "1.20.1")
    MINECRAFT_AUTH: str = os.getenv("MINECRAFT_AUTH", "offline")
    
    # Vision Settings
    WINDOW_TITLE: str = os.getenv("WINDOW_TITLE", "Minecraft")
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "datasets/weights/yolov8n.pt")
    
    # Voice Settings
    VOICE_RATE: int = int(os.getenv("VOICE_RATE", "150"))
    VOICE_VOLUME: float = float(os.getenv("VOICE_VOLUME", "1.0"))

settings = Settings()
