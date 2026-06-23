import pytest
import sys
import os

# Adjust path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from solvers.tictactoe_solver import solve_tictactoe
from solvers.connect4_solver import solve_connect4
from solvers.checkers_solver import solve_checkers
from solvers.sudoku_solver import solve_sudoku
from solvers.reversi_solver import solve_reversi
from solvers.gomoku_solver import solve_gomoku
from solvers.chess_solver import solve_chess
from solvers.sliding_puzzles import solve_sliding_puzzle
from solvers.rubik_solver import solve_rubik

def test_tictactoe_solver():
    # Test board where X can win in one move
    board = [
        "X", "X", "",
        "O", "O", "",
        "", "", ""
    ]
    result = solve_tictactoe(board, "X")
    assert result["status"] == "active"
    assert result["best_move"] == 2
    assert "win" in result["explanations"]["beginner"].lower()

def test_connect4_solver():
    # Test board where Red can win immediately in column 3
    board = [
        "", "", "", "", "", "", "",
        "", "", "", "", "", "", "",
        "", "", "", "", "", "", "",
        "", "", "", "R", "", "", "",
        "", "", "", "R", "", "", "",
        "", "", "", "R", "", "", ""
    ]
    result = solve_connect4(board, "R")
    assert result["status"] == "active"
    assert result["best_move"] == 3

def test_checkers_solver():
    # Red pawn at 17 can jump White pawn at 26 to empty index 35
    # Board index mapping: 17 is row 2 col 1, 26 is row 3 col 2, 35 is row 4 col 3
    board = [""] * 64
    board[17] = "r"
    board[26] = "w"
    result = solve_checkers(board, "r")
    assert result["status"] == "active"
    assert result["best_move"]["from"] == 17
    assert result["best_move"]["to"] == 35
    assert 26 in result["best_move"]["captures"]

def test_sudoku_solver():
    # A partially filled valid Sudoku puzzle
    board = [
        5, 3, 0, 0, 7, 0, 0, 0, 0,
        6, 0, 0, 1, 9, 5, 0, 0, 0,
        0, 9, 8, 0, 0, 0, 0, 6, 0,
        8, 0, 0, 0, 6, 0, 0, 0, 3,
        4, 0, 0, 8, 0, 3, 0, 0, 1,
        7, 0, 0, 0, 2, 0, 0, 0, 6,
        0, 6, 0, 0, 0, 0, 2, 8, 0,
        0, 0, 0, 4, 1, 9, 0, 0, 5,
        0, 0, 0, 0, 8, 0, 0, 7, 9
    ]
    result = solve_sudoku(board)
    assert result["status"] == "solved"
    assert len(result["solved_board"]) == 81
    assert result["solved_board"][2] == 4  # first row: 5, 3, 4 ...

def test_reversi_solver():
    # Standard starting board, Black (B) has 4 valid moves: 19, 26, 37, 44
    board = [""] * 64
    board[27] = "W"
    board[28] = "B"
    board[35] = "B"
    board[36] = "W"
    
    result = solve_reversi(board, "B")
    assert result["status"] == "active"
    assert result["best_move"] in [19, 26, 37, 44]

def test_sliding_puzzle_solver():
    # 8-Puzzle with 1 swap away from solved
    board = [1, 2, 3, 4, 5, 6, 7, 0, 8]
    result = solve_sliding_puzzle(board)
    assert result["status"] == "solved"
    assert result["num_steps"] == 1
    assert result["next_move"]["tile"] == 8

def test_chess_solver():
    # FEN where White can deliver back-rank checkmate immediately
    # e.g. 1st rank has white rook on e1, 8th rank has black king on e8 with pawns in front blocking escape
    fen = "4k3/8/8/8/8/8/8/4R1K1 w - - 0 1"
    result = solve_chess(fen)
    assert result["status"] == "active"
    assert result["best_move"] is not None

def test_rubik_solver():
    # Solved cube state
    state = 'WWWWWWWWWRRRRRRRRRGGGGGGGGYYYYYYYYYOOOOOOOOOBBBBBBBBB'
    # Wait, let's make sure it has exactly 9 of each color
    state = 'W'*9 + 'R'*9 + 'G'*9 + 'Y'*9 + 'O'*9 + 'B'*9
    result = solve_rubik(state)
    assert result["status"] == "solved"

    assert len(result["solution"]) == 0
