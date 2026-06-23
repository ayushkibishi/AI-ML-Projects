from typing import List, Dict, Any, Tuple

# Board representation: 64-element list of strings:
# '' (empty), 'r' (red pawn), 'R' (red king), 'w' (white pawn), 'W' (white king)
# Player: 'r' (Red, moves up or down? Let's say red starts at top, white at bottom. 
# Red pawns move down: row increments. White pawns move up: row decrements.
# Kings move in both directions.)

def get_row_col(index: int) -> Tuple[int, int]:
    return index // 8, index % 8

def get_index(row: int, col: int) -> int:
    return row * 8 + col

def in_bounds(row: int, col: int) -> bool:
    return 0 <= row < 8 and 0 <= col < 8

def get_moves(board: List[str], player: str) -> List[Dict[str, Any]]:
    """
    Generates all legal moves for a player.
    Checkers rule: If a jump (capture) is available, it is mandatory.
    Returns list of dicts: {"from": int, "to": int, "captures": List[int]}
    """
    pawn_char = player.lower()
    king_char = player.upper()
    
    opponent_chars = ['w', 'W'] if player == 'r' else ['r', 'R']
    
    jump_moves = []
    slide_moves = []

    # Direction vectors
    # 'r' moves down (row + 1), 'w' moves up (row - 1)
    pawn_dirs = [1] if player == 'r' else [-1]
    king_dirs = [-1, 1]

    for i in range(64):
        piece = board[i]
        if piece != pawn_char and piece != king_char:
            continue
        
        row, col = get_row_col(i)
        is_king = (piece == king_char)
        dirs = king_dirs if is_king else pawn_dirs

        for dr in dirs:
            for dc in [-1, 1]:
                # 1. Check for normal slides
                target_r = row + dr
                target_c = col + dc
                if in_bounds(target_r, target_c):
                    target_idx = get_index(target_r, target_c)
                    if board[target_idx] == "":
                        slide_moves.append({
                            "from": i,
                            "to": target_idx,
                            "captures": []
                        })
                
                # 2. Check for jump moves
                jump_r = row + dr * 2
                jump_c = col + dc * 2
                mid_r = row + dr
                mid_c = col + dc
                if in_bounds(jump_r, jump_c):
                    mid_idx = get_index(mid_r, mid_c)
                    jump_idx = get_index(jump_r, jump_c)
                    if board[mid_idx] in opponent_chars and board[jump_idx] == "":
                        jump_moves.append({
                            "from": i,
                            "to": jump_idx,
                            "captures": [mid_idx]
                        })

    # Rule: If captures are available, they are mandatory!
    if len(jump_moves) > 0:
        return jump_moves
    return slide_moves

def apply_move(board: List[str], move: Dict[str, Any]) -> List[str]:
    new_board = list(board)
    start = move["from"]
    end = move["to"]
    piece = new_board[start]
    
    new_board[start] = ""
    new_board[end] = piece

    # King promotion
    end_row, _ = get_row_col(end)
    if piece == 'r' and end_row == 7:
        new_board[end] = 'R'
    elif piece == 'w' and end_row == 0:
        new_board[end] = 'W'

    # Remove captured pieces
    for cap in move["captures"]:
        new_board[cap] = ""
        
    return new_board

def evaluate_checkers(board: List[str], player: str) -> int:
    score = 0
    opponent = 'w' if player == 'r' else 'r'
    
    pawn_val = 100
    king_val = 175
    
    for i in range(64):
        piece = board[i]
        if piece == "":
            continue
        row, col = get_row_col(i)
        
        # Red scoring
        if piece == 'r':
            score += pawn_val + row * 10  # Encourage advancing
        elif piece == 'R':
            score += king_val
            
        # White scoring
        elif piece == 'w':
            score -= (pawn_val + (7 - row) * 10)
        elif piece == 'W':
            score -= king_val

    return score if player == 'r' else -score

def minimax_checkers(board: List[str], depth: int, alpha: float, beta: float, maximizing_player: bool, player: str) -> Tuple[Any, int]:
    opponent = 'w' if player == 'r' else 'r'
    active_player = player if maximizing_player else opponent
    
    moves = get_moves(board, active_player)
    
    if depth == 0 or len(moves) == 0:
        return None, evaluate_checkers(board, player)

    if maximizing_player:
        value = -float('inf')
        best_move = moves[0] if moves else None
        for move in moves:
            next_board = apply_move(board, move)
            _, score = minimax_checkers(next_board, depth - 1, alpha, beta, False, player)
            if score > value:
                value = score
                best_move = move
            alpha = max(alpha, value)
            if alpha >= beta:
                break
        return best_move, value
    else:
        value = float('inf')
        best_move = moves[0] if moves else None
        for move in moves:
            next_board = apply_move(board, move)
            _, score = minimax_checkers(next_board, depth - 1, alpha, beta, True, player)
            if score < value:
                value = score
                best_move = move
            beta = min(beta, value)
            if alpha >= beta:
                break
        return best_move, value

def solve_checkers(board: List[str], player: str) -> Dict[str, Any]:
    """
    Solves Checkers state.
    board: 1D list of 64 strings ('r', 'R', 'w', 'W', '')
    player: 'r' (Red) or 'w' (White)
    """
    moves = get_moves(board, player)
    
    if len(moves) == 0:
        return {
            "status": "game_over",
            "winner": "w" if player == "r" else "r",
            "best_move": None,
            "candidates": [],
            "explanations": {
                "beginner": "No moves available. Game over.",
                "intermediate": "The player has no legal moves and has lost the game.",
                "advanced": "No branching options at current state. Terminal loss node evaluated."
            }
        }

    # Search depth of 6 is highly responsive and strong
    best_move, score = minimax_checkers(board, 6, -float('inf'), float('inf'), True, player)

    candidates = []
    for move in moves:
        next_board = apply_move(board, move)
        _, c_score = minimax_checkers(next_board, 4, -float('inf'), float('inf'), False, player)
        candidates.append({
            "move": move,
            "score": c_score
        })

    candidates = sorted(candidates, key=lambda x: x["score"], reverse=True)

    # Explanation text
    src_r, src_c = get_row_col(best_move["from"])
    dst_r, dst_c = get_row_col(best_move["to"])
    
    cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    src_lbl = f"{cols[src_c]}{8 - src_r}"
    dst_lbl = f"{cols[dst_c]}{8 - dst_r}"

    is_jump = len(best_move["captures"]) > 0

    if is_jump:
        cap_r, cap_c = get_row_col(best_move["captures"][0])
        cap_lbl = f"{cols[cap_c]}{8 - cap_r}"
        beg_exp = f"Jump from {src_lbl} to {dst_lbl}, capturing the opponent's piece at {cap_lbl}. Note that jumps are mandatory!"
        int_exp = f"Mandatory capture move: {src_lbl} to {dst_lbl} capturing piece on {cap_lbl}. Restores material balance or creates advantage."
        adv_exp = f"Forced transition: jump {src_lbl}➔{dst_lbl} via capture {cap_lbl} (leaves board in node score {score})."
    else:
        # Check promotion potential
        promotes = (player == 'r' and dst_r == 7) or (player == 'w' and dst_r == 0)
        piece_type = "king" if board[best_move["from"]].isupper() else "piece"
        if promotes:
            beg_exp = f"Move your {piece_type} from {src_lbl} to {dst_lbl} to promote it to a King! Kings are super powerful because they can move backwards."
            int_exp = f"Pawn promotion pathway: {src_lbl} to {dst_lbl} to secure king status, dramatically increasing directional mobility."
            adv_exp = f"Promotion execution: {src_lbl}➔{dst_lbl} results in king conversion, boosting node valuation to {score}."
        else:
            beg_exp = f"Move your {piece_type} from {src_lbl} to {dst_lbl} to control the board and advance your position."
            int_exp = f"Positional diagonal move: {src_lbl} to {dst_lbl}. Establishes checker alignment and maintains center/flank defensive structure."
            adv_exp = f"Normal slide {src_lbl}➔{dst_lbl}. Minimax search depth-6 yields value {score}."

    return {
        "status": "active",
        "best_move": {
            "from": best_move["from"],
            "to": best_move["to"],
            "captures": best_move["captures"]
        },
        "evaluation": "Winning" if score > 150 else "Even" if abs(score) < 100 else "Losing",
        "score": score,
        "candidates": candidates,
        "explanations": {
            "beginner": beg_exp,
            "intermediate": int_exp,
            "advanced": adv_exp
        }
    }
