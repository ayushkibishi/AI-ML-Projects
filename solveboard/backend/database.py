import json
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./board_games.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class GameHistory(Base):
    __tablename__ = "game_history"

    id = Column(Integer, primary_key=True, index=True)
    game_type = Column(String(50), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    original_image = Column(String(255), nullable=True)
    warped_image = Column(String(255), nullable=True)
    detected_state = Column(Text, nullable=True)  # JSON representation of detected board
    solution = Column(Text, nullable=True)        # JSON representation of solver output

    def to_dict(self):
        return {
            "id": self.id,
            "game_type": self.game_type,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "original_image": self.original_image,
            "warped_image": self.warped_image,
            "detected_state": json.loads(self.detected_state) if self.detected_state else None,
            "solution": json.loads(self.solution) if self.solution else None
        }

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
