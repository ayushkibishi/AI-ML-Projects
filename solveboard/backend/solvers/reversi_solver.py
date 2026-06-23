from typing import List, Dict, Any, Tuple

# Reversi/Othello representation: 1D list of 64 strings
# 'B' (Black/Player 1), 'W' (White/Player 2), '' (Empty)
# We assume 'B' is black, 'W' is white.

DIRECTIONS = [
    (-1, -1), (-1, 0), (-1, 1),
    (0, -1),           (0, 1),
    (1, -1),  (1, 0),  (1, 1)
]

# Static weights for 8x8 Reversi board evaluation
BOARD_WEIGHTS = [
    100, -20,  10,   5,   5,  10, -20, 100,
    -20, -40,  -5,  -5,  -5,  -5, -40, -20,
     10,  -5,  15,   3,   3,  15,  -5,  10,
      5,  -5,   3,   3,   3,   3,  -5,   5,
      5,  -5,   3,   3,   3,   3,  -5,   5,
     10,  -5,  15,   3,   3,  15,  -5,  10,
    -20, -40,  -5,  -5,  -5,  -5, -40, -20,
    100, -20,  10,   5,   5,  10, -20, 100
]

def in_bounds(r: int, c: int) -> bool:
    return 0 <= r < 8 and 0 <= c < 8

def get_row_col(idx: int) -> Tuple[int, int]:
    return idx // 8, idx % 8

def get_index(r: int, c: int) -> int:
    return r * 8 + c

def get_flips_for_move(board: List[str], idx: int, player: str) -> List[int]:
    if board[idx] != "":
        return []
    
    r, c = get_row_col(idx)
    opponent = 'W' if player == 'B' else 'B'
    flips = []

    for dr, dc in DIRECTIONS:
        temp_flips = []
        curr_r = r + dr
        curr_c = c + dc
        
        while in_bounds(curr_r, curr_c):
            curr_idx = get_index(curr_r, curr_c)
            if board[curr_idx] == opponent:
                temp_flips.append(curr_idx)
            elif board[curr_idx] == player:
                # Found sand-wiched opponent pieces
                flips.extend(temp_flips)
                break
            else:
                # Empty space, search fails in this direction
                break
            curr_r += dr
            curr_c += dc
            
    return flips

def get_valid_moves(board: List[str], player: str) -> List[int]:
    valid_moves = []
    for i in range(64):
        if len(get_flips_for_move(board, i, player)) > 0:
            valid_moves.append(i)
    return valid_moves

def apply_move(board: List[str], idx: int, player: str) -> List[str]:
    new_board = list(board)
    flips = get_flips_for_move(board, idx, player)
    new_board[idx] = player
    for f in flips:
        new_board[f] = player
    return new_board

def evaluate_reversi(board: List[str], player: str) -> int:
    opponent = 'W' if player == 'B' else 'B'
    score = 0
    
    # Weight table evaluation
    for i in range(64):
        if board[i] == player:
            score += BOARD_WEIGHTS[i]
        elif board[i] == opponent:
            score -= BOARD_WEIGHTS[i]

    # Mobility score (number of valid moves)
    player_moves = len(get_valid_moves(board, player))
    opp_moves = len(get_valid_moves(board, opponent))
    score += (player_moves - opp_moves) * 15

    return score

def minimax_reversi(board: List[str], depth: int, alpha: float, beta: float, maximizing_player: bool, player: str) -> Tuple[int, int]:
    opponent = 'W' if player == 'B' else 'B'
    active_player = player if maximizing_player else opponent
    
    valid_moves = get_valid_moves(board, active_player)
    
    # If no valid moves, check if opponent has valid moves (if neither, game is over)
    if len(valid_moves) == 0:
        opp_valid_moves = get_valid_moves(board, opponent if active_player == player else player)
        if len(opp_valid_moves) == 0:
            # Game over, count discs
            player_count = board.count(player)
            opp_count = board.count(opponent)
            if player_count > opp_count:
                return -1, 100000 + (player_count - opp_count)
            elif player_count < opp_count:
                return -1, -100000 - (opp_count - player_count)
            else:
                return -1, 0
        else:
            # Pass turn to the other player
            _, score = minimax_reversi(board, depth - 1, alpha, beta, not maximizing_player, player)
            return -1, score

    if depth == 0:
        return -1, evaluate_reversi(board, player)

    if maximizing_player:
        value = -float('inf')
        best_move = valid_moves[0] if valid_moves else -1
        # Sort moves by board weight to optimize alpha-beta pruning
        valid_moves = sorted(valid_moves, key=lambda m: BOARD_WEIGHTS[m], reverse=True)
        for move in valid_moves:
            next_board = apply_move(board, move, player)
            _, score = minimax_reversi(next_board, depth - 1, alpha, beta, False, player)
            if score > value:
                value = score
                best_move = move
            alpha = max(alpha, value)
            if alpha >= beta:
                break
        return best_move, value
    else:
        value = float('inf')
        best_move = valid_moves[0] if valid_moves else -1
        valid_moves = sorted(valid_moves, key=lambda m: BOARD_WEIGHTS[m])
        for move in valid_moves:
            next_board = apply_move(board, move, opponent)
            _, score = minimax_reversi(next_board, depth - 1, alpha, beta, True, player)
            if score < value:
                value = score
                best_move = move
            beta = min(beta, value)
            if alpha >= beta:
                break
        return best_move, value

def solve_reversi(board: List[str], player: str) -> Dict[str, Any]:
    """
    Solves Reversi state.
    board: 1D list of 64 strings ('B', 'W', '')
    player: 'B' (Black) or 'W' (White)
    """
    valid_moves = get_valid_moves(board, player)
    
    if len(valid_moves) == 0:
        opponent = 'W' if player == 'B' else 'B'
        opp_moves = get_valid_moves(board, opponent)
        if len(opp_moves) == 0:
            b_count = board.count('B')
            w_count = board.count('W')
            winner = 'B' if b_count > w_count else 'W' if w_count > b_count else 'Draw'
            return {
                "status": "game_over",
                "winner": winner,
                "best_move": None,
                "candidates": [],
                "explanations": {
                    "beginner": "The board is full or neither player has valid moves. Game over.",
                    "intermediate": "Terminal position reached. Final disk count determines winner.",
                    "advanced": f"Dual-pass state terminal node. Black discs: {b_count}, White discs: {w_count}."
                }
            }
        else:
            return {
                "status": "pass",
                "best_move": None,
                "candidates": [],
                "explanations": {
                    "beginner": "You have no legal moves! You must pass your turn to the opponent.",
                    "intermediate": "No valid flip vectors exist. Forced pass state.",
                    "advanced": "Player has zero active action transitions. Control yields to opponent."
                }
            }

    # Search depth of 5 is highly optimized for Python
    best_move, score = minimax_reversi(board, 5, -float('inf'), float('inf'), True, player)

    candidates = []
    for move in valid_moves:
        next_board = apply_move(board, move, player)
        _, c_score = minimax_reversi(next_board, 3, -float('inf'), float('inf'), False, player)
        candidates.append({
            "move": move,
            "score": c_score
        })

    candidates = sorted(candidates, key=lambda x: x["score"], reverse=True)

    # Explanation text
    row, col = get_row_col(best_move)
    cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    move_lbl = f"{cols[col]}{row + 1}"
    
    flips_count = len(get_flips_for_move(board, best_move, player))
    is_corner = best_move in [0, 7, 56, 63]

    if is_corner:
        beg_exp = f"Play at {move_lbl}. This is a CORNER square! Corner squares are extremely valuable because the opponent can never flip them back once you take them."
        int_exp = f"Corner capture at {move_lbl}. Secures a stable cell which acts as an anchor for the rest of the board."
        adv_exp = f"Maximum positional stability: {move_lbl} is a corner node (static weight: 100), ensuring permanent disk status."
    elif BOARD_WEIGHTS[best_move] > 10:
        beg_exp = f"Play at {move_lbl} to capture {flips_count} discs. This square gives you good board control and keeps your position strong."
        int_exp = f"High-weight cell selection at {move_lbl}, flipping {flips_count} pieces. Maintains strong edge control or inner-grid presence."
        adv_exp = f"Positional utility maximization: play at {move_lbl} flips {flips_count} disks, resulting in heuristic valuation {score}."
    else:
        beg_exp = f"Play at {move_lbl} to flip {flips_count} of your opponent's discs and open up new options for yourself."
        int_exp = f"Strategic flip at {move_lbl}. Limits opponent's future mobility (available moves) while expanding your own."
        adv_exp = f"Minimax depth-5 selection: {move_lbl} flips {flips_count} opponent disks. Heuristic value: {score}."

    return {
        "status": "active",
        "best_move": best_move,
        "evaluation": "Winning" if score > 100 else "Even" if abs(score) < 50 else "Losing",
        "score": score,
        "candidates": candidates,
        "explanations": {
            "beginner": beg_exp,
            "intermediate": int_exp,
            "advanced": adv_exp
        }
    }
