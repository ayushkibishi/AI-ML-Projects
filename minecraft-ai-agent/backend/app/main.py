import json
import logging
import datetime
from typing import Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database.db import engine, SessionLocal, Base
from backend.app.database.models import BotTelemetry, BotLog, Skill, AutonomousSession
from backend.app.api.endpoints import router as api_router, active_bot_connections, planner, send_to_bot
from backend.app.game_progression import (
    get_current_stage, get_next_goal, get_stage_progress_pct, STAGE_LABELS
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("Main")

Base.metadata.create_all(bind=engine)
logger.info("Database tables initialized.")

app = FastAPI(
    title="Minecraft AI Agent API",
    description="Backend coordinator for Mineflayer + Gemini autonomous Minecraft agent.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

active_frontend_connections = []


async def broadcast_to_frontends(message: Dict[str, Any]):
    """Broadcast real-time events to all connected Next.js dashboard clients."""
    for ws in active_frontend_connections:
        try:
            await ws.send_json(message)
        except Exception:
            pass


@app.websocket("/ws/bot")
async def websocket_bot_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for the Mineflayer bot.
    Receives telemetry, logs, skill results, and task_complete signals.
    Sends back execute_code commands and mode control messages.
    """
    await websocket.accept()
    active_bot_connections.append(websocket)
    logger.info("Mineflayer bot connected.")

    db = SessionLocal()
    try:
        db.add(BotLog(level="INFO", message="Bot client joined the coordination channel."))
        db.commit()

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")

            # ── Telemetry ────────────────────────────────────────────────────
            if msg_type == "telemetry":
                t = message.get("data", {})
                db.add(BotTelemetry(
                    health=t.get("health", 20.0),
                    hunger=t.get("hunger", 20.0),
                    x=t.get("x", 0.0), y=t.get("y", 64.0), z=t.get("z", 0.0),
                    inventory=json.dumps(t.get("inventory", {})),
                    current_goal=t.get("current_goal"),
                    current_task=t.get("current_task"),
                ))
                db.commit()
                await broadcast_to_frontends({"type": "status_update", "data": t})

            # ── Log ──────────────────────────────────────────────────────────
            elif msg_type == "log":
                log_data = message.get("data", {})
                level = log_data.get("level", "INFO")
                msg = log_data.get("message", "")
                db.add(BotLog(level=level, message=msg, task_id=log_data.get("task_id")))
                db.commit()
                await broadcast_to_frontends({
                    "type": "log_message",
                    "data": {
                        "timestamp": datetime.datetime.utcnow().isoformat(),
                        "level": level,
                        "message": msg,
                    }
                })

            # ── Skill success ────────────────────────────────────────────────
            elif msg_type == "skill_success":
                skill_data = message.get("data", {})
                name = skill_data.get("name")
                code = skill_data.get("code")
                description = skill_data.get("description", "")
                logger.info(f"Skill '{name}' succeeded — saving to library.")
                existing = db.query(Skill).filter(Skill.name == name).first()
                if existing:
                    existing.code = code; existing.success_count += 1
                else:
                    db.add(Skill(name=name, code=code, description=description, success_count=1))
                db.commit()
                await broadcast_to_frontends({"type": "skill_registered", "name": name, "status": "success"})

            # ── Skill failure ────────────────────────────────────────────────
            elif msg_type == "skill_failure":
                skill_data = message.get("data", {})
                name = skill_data.get("name")
                logger.warning(f"Skill '{name}' failed.")
                existing = db.query(Skill).filter(Skill.name == name).first()
                if existing:
                    existing.failure_count += 1; db.commit()
                await broadcast_to_frontends({
                    "type": "skill_failed", "name": name,
                    "error": skill_data.get("error", "Unknown error")
                })

            # ── Task complete (autonomous loop trigger) ───────────────────────
            elif msg_type == "task_complete":
                task_data = message.get("data", {})
                success = task_data.get("success", True)
                inventory = task_data.get("inventory", {})
                health = task_data.get("health", 20.0)
                hunger = task_data.get("hunger", 20.0)
                position = task_data.get("position", {"x": 0, "y": 64, "z": 0})

                # Check if autonomous mode is active
                auto_session = db.query(AutonomousSession).first()
                if not auto_session or not auto_session.is_active:
                    logger.info("task_complete received but autonomous mode is off — ignoring.")
                    continue

                # Update session
                if success:
                    auto_session.goals_completed += 1

                new_stage = get_current_stage(inventory, auto_session.current_stage)
                stage_changed = new_stage != auto_session.current_stage
                auto_session.current_stage = new_stage
                auto_session.updated_at = datetime.datetime.utcnow()
                db.commit()

                if stage_changed:
                    logger.info(f"Stage advanced to: {new_stage}")
                    db.add(BotLog(level="INFO", message=f"[AUTO] Stage advanced to: {STAGE_LABELS.get(new_stage, new_stage)}"))
                    db.commit()

                if new_stage == "GAME_COMPLETE":
                    await broadcast_to_frontends({
                        "type": "game_complete",
                        "message": "🏆 Ender Dragon defeated! Minecraft complete!"
                    })
                    auto_session.is_active = 0
                    db.commit()
                    await websocket.send_json({"type": "set_autonomous_mode", "active": False})
                    continue

                # Get next goal
                next_goal = get_next_goal(new_stage, inventory, health, hunger)
                logger.info(f"[AUTO] Stage={new_stage} | Next: {next_goal[:60]}")

                # Plan execution code
                skills_list = [
                    {"name": s.name, "description": s.description, "code": s.code}
                    for s in db.query(Skill).all()
                ]
                bot_status = {
                    "x": position.get("x", 0), "y": position.get("y", 64), "z": position.get("z", 0),
                    "health": health, "hunger": hunger, "inventory": inventory,
                }
                plan = planner.plan_next_autonomous_goal(next_goal, bot_status, skills_list, new_stage)

                db.add(BotLog(level="INFO", message=f"[AUTO] Goal: {next_goal[:120]}"))
                db.commit()

                # Broadcast stage update to frontends
                await broadcast_to_frontends({
                    "type": "autonomous_update",
                    "data": {
                        "stage": new_stage,
                        "stage_label": STAGE_LABELS.get(new_stage, new_stage),
                        "goals_completed": auto_session.goals_completed,
                        "next_goal": next_goal,
                        "progress_pct": get_stage_progress_pct(new_stage),
                    }
                })

                # Send next goal to bot
                await websocket.send_json({
                    "type": "execute_code",
                    "command": next_goal,
                    "code": plan.get("execution_code"),
                    "steps": plan.get("steps"),
                    "explanation": plan.get("explanation"),
                })

    except WebSocketDisconnect:
        logger.warning("Mineflayer bot disconnected.")
        if websocket in active_bot_connections:
            active_bot_connections.remove(websocket)
    except Exception as e:
        logger.error(f"Bot socket error: {e}")
        if websocket in active_bot_connections:
            active_bot_connections.remove(websocket)
    finally:
        db.close()


@app.websocket("/ws/frontend")
async def websocket_frontend_endpoint(websocket: WebSocket):
    """WebSocket endpoint for Next.js dashboard clients."""
    await websocket.accept()
    active_frontend_connections.append(websocket)
    logger.info("Frontend dashboard client connected.")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.warning("Frontend client disconnected.")
        if websocket in active_frontend_connections:
            active_frontend_connections.remove(websocket)
    except Exception as e:
        logger.error(f"Frontend socket error: {e}")
        if websocket in active_frontend_connections:
            active_frontend_connections.remove(websocket)


@app.get("/")
def read_root():
    return {"message": "Minecraft AI Agent v2.0 — Autonomous Mode Enabled"}
