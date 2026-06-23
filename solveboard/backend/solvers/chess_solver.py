import chess
import chess.engine
import os
from typing import List, Dict, Any, Tuple

# Built-in evaluation tables (Piece-Square Tables)
# Values represent positional advantages/penalties for White pieces. For Black, we mirror them.

PAWN_TABLE = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
]

KNIGHT_TABLE = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
]

BISHOP_TABLE = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
]

ROOK_TABLE = [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0
]

QUEEN_TABLE = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  5,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
]

KING_TABLE = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
]

PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000
}

def evaluate_board(board: chess.Board) -> int:
    score = 0
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if not piece:
            continue
        
        # Determine piece value
        val = PIECE_VALUES[piece.piece_type]
        
        # Position table lookup
        table_idx = square
        if piece.color == chess.BLACK:
            # Mirror row indices for black pieces
            row, col = square // 8, square % 8
            table_idx = (7 - row) * 8 + col
            
        pst = 0
        if piece.piece_type == chess.PAWN: pst = PAWN_TABLE[table_idx]
        elif piece.piece_type == chess.KNIGHT: pst = KNIGHT_TABLE[table_idx]
        elif piece.piece_type == chess.BISHOP: pst = BISHOP_TABLE[table_idx]
        elif piece.piece_type == chess.ROOK: pst = ROOK_TABLE[table_idx]
        elif piece.piece_type == chess.QUEEN: pst = QUEEN_TABLE[table_idx]
        elif piece.piece_type == chess.KING: pst = KING_TABLE[table_idx]
        
        if piece.color == chess.WHITE:
            score += val + pst
        else:
            score -= (val + pst)
            
    # Positive score favors white, negative favors black
    return score

def minimax_chess(board: chess.Board, depth: int, alpha: float, beta: float, maximizing: bool) -> Tuple[chess.Move, int]:
    if depth == 0 or board.is_game_over():
        return None, evaluate_board(board)
        
    moves = list(board.legal_moves)
    if not moves:
        if board.is_checkmate():
            return None, -100000 if maximizing else 100000
        return None, 0 # Draw
        
    best_move = moves[0]
    
    # Sort moves heuristically (e.g. captures first) to improve alpha-beta pruning
    moves = sorted(moves, key=lambda m: board.is_capture(m), reverse=True)
    
    if maximizing:
        value = -float('inf')
        for move in moves:
            board.push(move)
            _, score = minimax_chess(board, depth - 1, alpha, beta, False)
            board.pop()
            if score > value:
                value = score
                best_move = move
            alpha = max(alpha, value)
            if alpha >= beta:
                break
        return best_move, value
    else:
        value = float('inf')
        for move in moves:
            board.push(move)
            _, score = minimax_chess(board, depth - 1, alpha, beta, True)
            board.pop()
            if score < value:
                value = score
                best_move = move
            beta = min(beta, value)
            if alpha >= beta:
                break
        return best_move, value

def get_engine_solve(fen: str, stockfish_path: str = None) -> Dict[str, Any]:
    """
    Attempts to solve chess FEN using Stockfish engine, or falls back to minimax.
    """
    board = chess.Board(fen)
    if board.is_game_over():
        winner = "Draw"
        if board.is_checkmate():
            winner = "Black" if board.turn == chess.WHITE else "White"
        return {
            "status": "game_over",
            "winner": winner,
            "best_move": None,
            "candidates": [],
            "explanations": {
                "beginner": "The chess game has already ended.",
                "intermediate": "Terminal game state reached.",
                "advanced": f"Game over condition satisfied. Result: {board.result()}."
            }
        }

    # Try Stockfish first if path is provided and executable exists
    if stockfish_path and os.path.exists(stockfish_path):
        try:
            with chess.engine.SimpleEngine.popen_uci(stockfish_path) as engine:
                # Get the best move
                result = engine.play(board, chess.engine.Limit(time=0.5))
                best_move = result.move
                
                # Get top 3 candidates
                analysis = engine.analyse(board, chess.engine.Limit(time=0.5), multipv=3)
                candidates = []
                for entry in analysis:
                    pv = entry.get("pv", [])
                    if pv:
                        candidates.append({
                            "move": pv[0].uci(),
                            "score": entry.get("score").relative.score(mate_score=10000) or 0
                        })
                
                score_val = analysis[0].get("score").relative.score(mate_score=10000) or 0
                return best_move, score_val, candidates
        except Exception as e:
            # Fallback to minimax on error
            pass

    # Minimax fallback
    # Depth 3 is highly responsive (<0.5s in python) and provides decent tactical recommendations
    maximizing = (board.turn == chess.WHITE)
    best_move, score = minimax_chess(board, 3, -float('inf'), float('inf'), maximizing)
    
    # Calculate top moves
    candidates = []
    for move in board.legal_moves:
        board.push(move)
        _, c_score = minimax_chess(board, 1, -float('inf'), float('inf'), not maximizing)
        board.pop()
        candidates.append({
            "move": move.uci(),
            "score": c_score if maximizing else -c_score
        })
        
    # Sort candidates
    candidates = sorted(candidates, key=lambda x: x["score"], reverse=True)
    score_adjusted = score if maximizing else -score
    
    return best_move, score_adjusted, candidates

def solve_chess(fen: str, stockfish_path: str = None) -> Dict[str, Any]:
    board = chess.Board(fen)
    res = get_engine_solve(fen, stockfish_path)
    if isinstance(res, dict): # Terminal check
        return res
        
    best_move, score, candidates = res
    
    # Generate explanations
    move_san = board.san(best_move)
    is_capture = board.is_capture(best_move)
    is_check = board.gives_check(best_move)
    
    # Categorize move properties
    # Target piece
    piece = board.piece_at(best_move.from_square)
    piece_name = chess.piece_name(piece.piece_type).capitalize()
    
    # Generate explanations
    if is_check:
        beg_exp = f"Move your {piece_name} to check the opponent's King with {move_san}. This puts them on the defensive!"
        int_exp = f"Delivers check with {move_san}. Forces the opponent to spend a tempo responding and restricts their king placement."
        adv_exp = f"Forced tactical transition via {move_san}+. Limits opponent king flight squares and disrupts spatial organization."
    elif is_capture:
        captured = board.piece_at(best_move.to_square)
        captured_name = chess.piece_name(captured.piece_type)
        beg_exp = f"Capture the opponent's {captured_name} using your {piece_name} with {move_san}."
        int_exp = f"Material gain or exchange: {move_san} captures the {captured_name} on {chess.square_name(best_move.to_square)}."
        adv_exp = f"Capture execution: {move_san} removes defender at {chess.square_name(best_move.to_square)}, altering board material balance."
    elif piece.piece_type == chess.PAWN:
        beg_exp = f"Advance your pawn with {move_san} to control space in the center and open lanes for your other pieces."
        int_exp = f"Pawn push {move_san} grabs central space, limits opponent minor piece mobility, and establishes structural support."
        adv_exp = f"Pawn structure expansion: {move_san} alters pawn chain grid constraints, contesting central square complexes."
    else:
        beg_exp = f"Develop your {piece_name} with {move_san} to a more active square to help control the board."
        int_exp = f"Develops {piece_name} to a active post via {move_san}, improving piece coordination and controlling central squares."
        adv_exp = f"Piece reactivation: {move_san} maximizes piece activity index and improves local square coordination. Minimax eval: {score/100:.2f}."

    eval_score = score / 100.0
    
    return {
        "status": "active",
        "best_move": best_move.uci(),
        "best_move_san": move_san,
        "evaluation": f"{eval_score:+.2f}",
        "score": score,
        "candidates": candidates[:5],
        "explanations": {
            "beginner": beg_exp,
            "intermediate": int_exp,
            "advanced": adv_exp
        }
    }
