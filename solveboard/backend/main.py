import os
import json
import shutil
import uuid
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, GameHistory
from cv_engine.detector import detect_board
from cv_engine.classifier import extract_state
from tts import generate_speech

# Import all solvers
from solvers.tictactoe_solver import solve_tictactoe
from solvers.connect4_solver import solve_connect4
from solvers.checkers_solver import solve_checkers
from solvers.sudoku_solver import solve_sudoku
from solvers.reversi_solver import solve_reversi
from solvers.gomoku_solver import solve_gomoku
from solvers.chess_solver import solve_chess
from solvers.sliding_puzzles import solve_sliding_puzzle
from solvers.rubik_solver import solve_rubik

app = FastAPI(title="Universal AI Board Game Solver API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for dev simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory configuration
ORIGINAL_DIR = "uploads/original"
WARPED_DIR = "uploads/warped"
os.makedirs(ORIGINAL_DIR, exist_ok=True)
os.makedirs(WARPED_DIR, exist_ok=True)

# Mount uploads static folder
app.mount("/static", StaticFiles(directory="uploads"), name="static")

class SolveRequest(BaseModel):
    game_type: str
    state: Any # Can be List, Dict, or String (like FEN)
    player: Optional[str] = None # 'X', 'O', 'r', 'w', 'B', 'W', FEN active color, etc.
    level: Optional[str] = "beginner" # beginner, intermediate, advanced

def board_array_to_fen(board_list: List[str], active_player: str = "w") -> str:
    """Converts a 64-element chess array into a FEN string."""
    rows = []
    # 64 element array is row 0 (ranks 8) to row 7 (rank 1)
    for r in range(8):
        empty_count = 0
        row_str = ""
        for c in range(8):
            piece = board_list[r * 8 + c]
            if piece == "":
                empty_count += 1
            else:
                if empty_count > 0:
                    row_str += str(empty_count)
                    empty_count = 0
                row_str += piece
        if empty_count > 0:
            row_str += str(empty_count)
        rows.append(row_str)
    
    fen_board = "/".join(rows)
    # Default FEN suffix details for simplicity
    return f"{fen_board} {active_player} KQkq - 0 1"

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    game_type: str = Form(...)
):
    # Generate unique filename to avoid conflict
    file_ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4()}{file_ext}"
    original_path = os.path.join(ORIGINAL_DIR, unique_name)

    # Save original file
    with open(original_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Run CV detector
    detection = detect_board(original_path, output_dir=WARPED_DIR)
    
    # Extract board state if detection was successful
    detected_state = []
    if detection["status"] in ["success", "fallback"]:
        warped_img_path = detection["warped_image_path"]
        detected_state = extract_state(warped_img_path, game_type)

    return {
        "status": detection["status"],
        "message": detection["message"],
        "original_image_url": f"/static/original/{unique_name}",
        "warped_image_url": f"/static/warped/{os.path.basename(detection['warped_image_path'])}" if detection["warped_image_path"] else None,
        "detected_state": detected_state,
        "points": detection["points"],
        "confidence": detection["confidence"]
    }

@app.post("/api/solve")
async def solve_game(
    req: SolveRequest,
    db: Session = Depends(get_db)
):
    game_type = req.game_type.lower().replace("-", "").replace(" ", "")
    state = req.state
    player = req.player or "w"
    level = req.level.lower() if req.level else "beginner"

    result = {}
    try:
        if game_type in ["chess"]:
            # If board is sent as 64-element list, convert to FEN
            if isinstance(state, list):
                fen = board_array_to_fen(state, player)
            else:
                fen = str(state)
            result = solve_chess(fen)
            
        elif game_type in ["checkers"]:
            result = solve_checkers(state, player)
            
        elif game_type in ["connectfour", "connect4"]:
            result = solve_connect4(state, player)
            
        elif game_type in ["tictactoe"]:
            result = solve_tictactoe(state, player)
            
        elif game_type in ["reversi", "othello"]:
            result = solve_reversi(state, player)
            
        elif game_type in ["gomoku"]:
            result = solve_gomoku(state, player)
            
        elif game_type in ["sudoku"]:
            # State should be list of 81 ints
            int_state = [int(x) for x in state]
            result = solve_sudoku(int_state)
            
        elif game_type in ["8puzzle", "15puzzle", "8-puzzle", "15-puzzle"]:
            int_state = [int(x) for x in state]
            result = solve_sliding_puzzle(int_state)
            
        elif game_type in ["rubikscube", "rubik"]:
            result = solve_rubik(str(state))
            
        else:
            raise HTTPException(status_code=400, detail="Unsupported game type.")

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Solver error: {str(e)}")

    # Add Text-to-Speech URL if explanation is present
    voice_url = ""
    explanations = result.get("explanations", {})
    explanation_text = explanations.get(level, "")
    if explanation_text:
        voice_url = generate_speech(explanation_text)

    result["voice_url"] = voice_url

    # Save to history
    try:
        history_entry = GameHistory(
            game_type=req.game_type,
            detected_state=json.dumps(state),
            solution=json.dumps(result)
        )
        db.add(history_entry)
        db.commit()
    except Exception as db_err:
        print(f"Error saving to history db: {db_err}")

    return result

@app.get("/api/history")
async def get_history(db: Session = Depends(get_db)):
    entries = db.query(GameHistory).order_by(GameHistory.timestamp.desc()).limit(20).all()
    return [e.to_dict() for e in entries]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
