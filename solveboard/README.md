# Universal AI Board Game Solver & Tutor

An AI-powered web application that detects, edits, solves, and teaches **10 different board games and puzzles** from uploaded photos or camera feeds.

---

## 🌟 Key Features

1. **Game Selection & Dashboard**: Rich visual dashboard supporting Chess, Checkers, Connect Four, Tic-Tac-Toe, Reversi (Othello), Gomoku, Sudoku, 8-Puzzle, 15-Puzzle, and Rubik's Cube.
2. **OpenCV-Powered CV Engine**: Detects board boundaries, corrects perspective distortion, segments grids, and detects cell states using color profiles.
3. **Interactive Board Editor**: Side-by-side view allowing users to correct any piece detection errors before solving.
4. **Step-by-Step Tutor**: Progressive playback (Play/Pause/Speed) showing candidate moves and tactical outcomes.
5. **Learning Mode**: Beginner, Intermediate, and Advanced settings explaining moves differently for each user profile.
6. **Voice Explanations (TTS)**: Plays audio summaries explaining the tactical reasoning behind suggested moves.
7. **Performance Analytics**: Accuracy, blunders, and mistake counts for strategic games.
8. **History Logging**: Local SQLite database saves image paths and solved sessions.

---

## 🛠️ Technology Stack

* **Frontend**: Next.js 15, TypeScript, Tailwind CSS v4, Framer Motion, `@phosphor-icons/react`
* **Backend**: FastAPI (Python 3.10+), OpenCV, gTTS (Google Text-to-Speech), SQLAlchemy, SQLite
* **Solvers**: `python-chess` (with minimax fallback), minimax with alpha-beta pruning (Checkers, Connect4, Reversi, Gomoku, Tic-Tac-Toe), constraint satisfaction (Sudoku), and A* search (8/15-Puzzle).

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Python 3.10+** and **Node.js 18+** installed.

---

### Method 1: Local Installation

#### 1. Setup Backend APIs
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python main.py
```
The backend server runs on `http://localhost:8000`.

#### 2. Setup Next.js Frontend
```bash
# Navigate to frontend directory
cd ../frontend

# Install node packages
npm install

# Start Next.js dev server
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

### Method 2: Docker Compose (Production Deployment)

Build and run both the frontend and backend in containers with one command:
```bash
docker-compose up --build
```
* Frontend client: `http://localhost:3000`
* Backend API: `http://localhost:8000`

---

## 🧩 Supported Game Solvers Details

| Game | Solver Method | Details |
|------|---------------|---------|
| **Chess** | Stockfish Engine / Minimax | Fallback pure-python alpha-beta search with Piece-Square Tables (PST) |
| **Checkers** | Minimax + Alpha-Beta | Mandatory capture rules, promotion to King, diagonal evaluations |
| **Connect Four** | Minimax + Alpha-Beta | Column-ordering optimization, 4-in-a-row sliding window heuristics |
| **Tic-Tac-Toe** | Perfect Solver | Full game-tree minimax evaluation (instantaneous) |
| **Reversi** | Minimax + Alpha-Beta | Stable corner cells weighting table + legal moves mobility count |
| **Gomoku** | Heuristic Minimax | Radius-2 center search filtering + threat line score scanning |
| **Sudoku** | Constraint Satisfaction | MRV (Minimum Remaining Values) variable ordering + backtracking |
| **8-Puzzle** | A* Search | Manhattan Distance heuristic, solvability parity checking |
| **15-Puzzle** | A* Search | Optimized path search capped at 4000 nodes to prevent memory bloat |
| **Rubik's Cube** | BFS + LBL Fallback | 6-face cross editor, turns parser, and beginner layer solving steps |
