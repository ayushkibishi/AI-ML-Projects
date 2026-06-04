import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from backend.app.database.db import Base

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    code = Column(Text, nullable=False)
    description = Column(String(500), nullable=True)
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def success_rate(self) -> float:
        total = self.success_count + self.failure_count
        return (self.success_count / total) * 100.0 if total > 0 else 0.0

class BotLog(Base):
    __tablename__ = "bot_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    level = Column(String(20), default="INFO")
    message = Column(Text, nullable=False)
    task_id = Column(String(100), nullable=True)

class BotTelemetry(Base):
    __tablename__ = "bot_telemetry"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    health = Column(Float, default=20.0)
    hunger = Column(Float, default=20.0)
    x = Column(Float, default=0.0)
    y = Column(Float, default=0.0)
    z = Column(Float, default=0.0)
    inventory = Column(Text, default="{}") # JSON representation of inventory items
    current_goal = Column(String(255), nullable=True)
    current_task = Column(String(255), nullable=True)

class AutonomousSession(Base):
    __tablename__ = "autonomous_sessions"

    id = Column(Integer, primary_key=True, index=True)
    is_active = Column(Integer, default=0)  # 0=inactive, 1=active (SQLite bool)
    current_stage = Column(String(50), default="WOOD_AGE")
    goals_completed = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

