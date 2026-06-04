import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database.db import Base
from backend.app.database.models import Skill, BotLog, BotTelemetry
from backend.app.memory.faiss_store import FAISSMemoryStore
from backend.app.planner.gemini_planner import GeminiPlanner

# Use an in-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(name="memory_store")
def fixture_memory_store(tmp_path):
    # Use a temporary directory for FAISS local database to avoid polluting datasets/
    db_dir = tmp_path / "faiss_test_db"
    return FAISSMemoryStore(persist_directory=str(db_dir))

def test_database_models(db_session):
    """
    Test creating skills, logs, and telemetry entries.
    """
    # 1. Test Skill creation
    skill = Skill(
        name="testSkill",
        code="async function execute(bot) { return true; }",
        description="A test code skill",
        success_count=5,
        failure_count=1
    )
    db_session.add(skill)
    db_session.commit()
    
    saved_skill = db_session.query(Skill).filter_by(name="testSkill").first()
    assert saved_skill is not None
    assert saved_skill.success_count == 5
    assert saved_skill.success_rate() == pytest.approx(83.33, 0.01)

    # 2. Test Telemetry creation
    telemetry = BotTelemetry(
        health=18.5,
        hunger=15.0,
        x=10.0,
        y=64.0,
        z=-25.0,
        inventory='{"oak_log": 2, "stick": 4}',
        current_goal="Get Wood",
        current_task="Mine block"
    )
    db_session.add(telemetry)
    db_session.commit()
    
    saved_telemetry = db_session.query(BotTelemetry).order_by(BotTelemetry.timestamp.desc()).first()
    assert saved_telemetry is not None
    assert saved_telemetry.health == 18.5
    assert saved_telemetry.z == -25.0

def test_memory_store(memory_store):
    """
    Test indexing and searching coordinate memories in the local FAISS DB.
    """
    # Save a couple of landmark coordinate memories
    memory_store.save_memory("Main Oak Forest", 120, 64, -200, "Spacious forest with oak and birch trees")
    memory_store.save_memory("Iron Mine Shaft", -450, 30, 80, "Deep cave containing abundant iron and coal ores")
    
    # Query forest location
    results = memory_store.query_memory("wood logs and trees", k=2)
    assert len(results) >= 1
    # Check that our forest landmark is the primary match
    assert "Forest" in results[0]["label"]
    assert results[0]["x"] == 120.0
    
    # Fetch all stored memories
    all_mems = memory_store.get_all_memories()
    assert len(all_mems) == 2

def test_planner_offline_fallback(memory_store):
    """
    Verify the AI planner generates a coherent plan and executable JS code.
    Runs the planner in offline mode to guarantee test execution stability.
    """
    planner = GeminiPlanner(memory_store)
    
    bot_status = {
        "x": 0.0, "y": 64.0, "z": 0.0,
        "health": 20.0, "hunger": 20.0,
        "inventory": {"oak_log": 2}
    }
    
    available_skills = [
        {"name": "collectWood", "description": "Harvests oak log blocks"},
        {"name": "craftPlanks", "description": "Crafts oak planks from logs"}
    ]
    
    # Test planning a wood-gathering command
    result = planner.plan_and_generate_code("Gather some wood blocks", bot_status, available_skills)
    
    assert "explanation" in result
    assert "steps" in result
    assert "execution_code" in result
    assert len(result["steps"]) > 0
    assert "execute" in result["execution_code"]
