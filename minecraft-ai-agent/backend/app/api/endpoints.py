import os
import json
import logging
import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from backend.app.database.db import get_db
from backend.app.database.models import Skill, BotLog, BotTelemetry, AutonomousSession
from backend.app.memory.faiss_store import FAISSMemoryStore
from backend.app.planner.gemini_planner import GeminiPlanner
from backend.app.vision.yolo_detector import YOLODetector
from backend.app.voice.audio_processor import AudioProcessor
from backend.app.game_progression import (
    get_current_stage, get_next_goal, get_stage_progress_pct,
    STAGE_LABELS, STAGE_ORDER
)

logger = logging.getLogger("API")
router = APIRouter()

# Initialize Singletons
memory_store = FAISSMemoryStore()
planner = GeminiPlanner(memory_store)
detector = YOLODetector()
audio_processor = AudioProcessor()

# Active WebSocket connections (populated by main.py)
active_bot_connections = []

async def send_to_bot(message: Dict[str, Any]):
    """Send a message to all connected Mineflayer bot clients."""
    for websocket in active_bot_connections:
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send to bot: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Manual Command
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/command")
async def execute_command(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Receive a natural language command from the frontend and relay it to the bot."""
    command = payload.get("command")
    if not command:
        raise HTTPException(status_code=400, detail="command field required")

    logger.info(f"User command: '{command}'")
    db.add(BotLog(level="INFO", message=f"User Command: {command}"))

    latest = db.query(BotTelemetry).order_by(BotTelemetry.timestamp.desc()).first()
    bot_status = {
        "x": latest.x if latest else 0,
        "y": latest.y if latest else 64,
        "z": latest.z if latest else 0,
        "health": latest.health if latest else 20,
        "hunger": latest.hunger if latest else 20,
        "inventory": json.loads(latest.inventory) if latest and latest.inventory else {},
    }

    skills_list = [
        {"name": s.name, "description": s.description, "code": s.code}
        for s in db.query(Skill).all()
    ]

    plan = planner.plan_and_generate_code(command, bot_status, skills_list)
    db.add(BotLog(level="INFO", message=f"Planner: {plan.get('explanation')}"))
    db.commit()

    await send_to_bot({
        "type": "execute_code",
        "command": command,
        "code": plan.get("execution_code"),
        "steps": plan.get("steps"),
        "explanation": plan.get("explanation"),
    })
    return plan


# ─────────────────────────────────────────────────────────────────────────────
# Autonomous Mode
# ─────────────────────────────────────────────────────────────────────────────

def _get_or_create_session(db: Session) -> AutonomousSession:
    session = db.query(AutonomousSession).first()
    if not session:
        session = AutonomousSession()
        db.add(session)
        db.commit()
        db.refresh(session)
    return session


@router.post("/autonomous/start")
async def start_autonomous(db: Session = Depends(get_db)):
    """Activate autonomous mode — the bot will self-direct from its current state to the Ender Dragon."""
    session = _get_or_create_session(db)
    session.is_active = 1
    session.started_at = datetime.datetime.utcnow()
    session.updated_at = datetime.datetime.utcnow()

    # Determine initial stage from latest telemetry
    latest = db.query(BotTelemetry).order_by(BotTelemetry.timestamp.desc()).first()
    inventory = json.loads(latest.inventory) if latest and latest.inventory else {}
    health = latest.health if latest else 20.0
    hunger = latest.hunger if latest else 20.0

    stage = get_current_stage(inventory)
    session.current_stage = stage
    db.commit()

    logger.info(f"Autonomous mode STARTED at stage: {stage}")

    # Tell bot to enter autonomous mode
    await send_to_bot({"type": "set_autonomous_mode", "active": True})

    # Send first goal
    first_goal = get_next_goal(stage, inventory, health, hunger)
    skills_list = [
        {"name": s.name, "description": s.description, "code": s.code}
        for s in db.query(Skill).all()
    ]
    bot_status = {
        "x": latest.x if latest else 0, "y": latest.y if latest else 64,
        "z": latest.z if latest else 0, "health": health, "hunger": hunger,
        "inventory": inventory,
    }
    plan = planner.plan_next_autonomous_goal(first_goal, bot_status, skills_list, stage)

    db.add(BotLog(level="INFO", message=f"[AUTO] Stage={stage} | Goal: {first_goal}"))
    db.commit()

    await send_to_bot({
        "type": "execute_code",
        "command": first_goal,
        "code": plan.get("execution_code"),
        "steps": plan.get("steps"),
        "explanation": plan.get("explanation"),
    })

    return {
        "status": "started",
        "stage": stage,
        "stage_label": STAGE_LABELS.get(stage, stage),
        "first_goal": first_goal,
        "progress_pct": get_stage_progress_pct(stage),
    }


@router.post("/autonomous/stop")
async def stop_autonomous(db: Session = Depends(get_db)):
    """Deactivate autonomous mode."""
    session = _get_or_create_session(db)
    session.is_active = 0
    session.updated_at = datetime.datetime.utcnow()
    db.commit()
    await send_to_bot({"type": "set_autonomous_mode", "active": False})
    logger.info("Autonomous mode STOPPED")
    return {"status": "stopped"}


@router.get("/autonomous/status")
def get_autonomous_status(db: Session = Depends(get_db)):
    """Return current autonomous session state."""
    session = _get_or_create_session(db)
    stage = session.current_stage or "WOOD_AGE"
    return {
        "is_active": bool(session.is_active),
        "current_stage": stage,
        "stage_label": STAGE_LABELS.get(stage, stage),
        "goals_completed": session.goals_completed,
        "progress_pct": get_stage_progress_pct(stage),
        "stage_order": STAGE_ORDER,
        "started_at": session.started_at.isoformat() if session.started_at else None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Plan only (no execution)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/plan")
def generate_plan_only(payload: Dict[str, Any], db: Session = Depends(get_db)):
    command = payload.get("command")
    if not command:
        raise HTTPException(status_code=400, detail="command field required")
    latest = db.query(BotTelemetry).order_by(BotTelemetry.timestamp.desc()).first()
    bot_status = {
        "x": latest.x if latest else 0, "y": latest.y if latest else 64,
        "z": latest.z if latest else 0, "health": latest.health if latest else 20,
        "hunger": latest.hunger if latest else 20,
        "inventory": json.loads(latest.inventory) if latest else {},
    }
    skills_list = [{"name": s.name, "description": s.description} for s in db.query(Skill).all()]
    return planner.plan_and_generate_code(command, bot_status, skills_list)


# ─────────────────────────────────────────────────────────────────────────────
# Memory
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/memory")
def get_memories():
    return memory_store.get_all_memories()

@router.post("/memory")
def add_memory(payload: Dict[str, Any]):
    label = payload.get("label")
    x = payload.get("x"); y = payload.get("y"); z = payload.get("z")
    if label is None or x is None or y is None or z is None:
        raise HTTPException(status_code=400, detail="label, x, y, z required")
    memory_store.save_memory(label, x, y, z, payload.get("description", ""), payload.get("category", "location"))
    return {"status": "success", "message": f"Memory '{label}' indexed."}


# ─────────────────────────────────────────────────────────────────────────────
# Bot Status / Inventory / Logs / Skills
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/inventory")
def get_inventory(db: Session = Depends(get_db)):
    latest = db.query(BotTelemetry).order_by(BotTelemetry.timestamp.desc()).first()
    return json.loads(latest.inventory) if latest else {}

@router.get("/status")
def get_status(db: Session = Depends(get_db)):
    latest = db.query(BotTelemetry).order_by(BotTelemetry.timestamp.desc()).first()
    if not latest:
        return {"health": 20.0, "hunger": 20.0, "position": {"x": 0, "y": 64, "z": 0}, "inventory": {}, "current_goal": None, "current_task": None}
    return {
        "health": latest.health, "hunger": latest.hunger,
        "position": {"x": latest.x, "y": latest.y, "z": latest.z},
        "inventory": json.loads(latest.inventory),
        "current_goal": latest.current_goal,
        "current_task": latest.current_task,
    }

@router.get("/logs")
def get_logs(db: Session = Depends(get_db), limit: int = 50):
    logs = db.query(BotLog).order_by(BotLog.timestamp.desc()).limit(limit).all()
    return [{"timestamp": l.timestamp.isoformat(), "level": l.level, "message": l.message} for l in logs]

@router.get("/skills")
def get_skills(db: Session = Depends(get_db)):
    return [{
        "id": s.id, "name": s.name, "description": s.description,
        "code": s.code, "success_rate": s.success_rate()
    } for s in db.query(Skill).all()]

@router.post("/skills")
def create_skill(payload: Dict[str, Any], db: Session = Depends(get_db)):
    name = payload.get("name"); code = payload.get("code")
    if not name or not code:
        raise HTTPException(status_code=400, detail="name and code required")
    existing = db.query(Skill).filter(Skill.name == name).first()
    if existing:
        existing.code = code; existing.description = payload.get("description", "")
    else:
        db.add(Skill(name=name, code=code, description=payload.get("description", "")))
    db.commit()
    return {"status": "success", "message": f"Skill '{name}' registered."}


# ─────────────────────────────────────────────────────────────────────────────
# Voice & Vision
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/voice/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    temp_path = f"datasets/voice/temp_{file.filename}"
    os.makedirs("datasets/voice", exist_ok=True)
    with open(temp_path, "wb") as f:
        f.write(await file.read())
    transcript = audio_processor.transcribe_audio_file(temp_path)
    if os.path.exists(temp_path): os.remove(temp_path)
    return {"transcript": transcript}

@router.post("/voice/tts")
def text_to_speech(payload: Dict[str, Any]):
    text = payload.get("text")
    if not text: raise HTTPException(status_code=400, detail="text required")
    filepath = audio_processor.text_to_speech(text)
    return FileResponse(filepath, media_type="audio/mpeg", filename="speech.mp3")

@router.get("/vision/detections")
def get_vision_detections(db: Session = Depends(get_db)):
    latest = db.query(BotTelemetry).order_by(BotTelemetry.timestamp.desc()).first()
    bot_entities = []
    if latest:
        bot_entities = [
            {"name": "zombie", "position": {"x": latest.x + 5, "y": latest.y, "z": latest.z - 3}},
            {"name": "sheep", "position": {"x": latest.x - 4, "y": latest.y, "z": latest.z + 8}},
            {"name": "cow",   "position": {"x": latest.x + 8, "y": latest.y, "z": latest.z + 2}},
        ]
    return {"detections": detector.detect_entities(bot_entities)}
