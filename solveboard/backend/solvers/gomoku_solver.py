from typing import List, Dict, Any, Tuple

# Gomoku board representation: 1D list of size N*N. N is computed from length.
# Players: 'B' (Black), 'W' (White), '' (Empty)

def get_board_size(board: List[str]) -> int:
    import math
    return int(math.isqrt(len(board)))

def get_row_col(idx: int, size: int) -> Tuple[int, int]:
    return idx // size, idx % size

def get_index(r: int, c: int, size: int) -> int:
    return r * size + c

def in_bounds(r: int, c: int, size: int) -> bool:
    return 0 <= r < size and 0 <= c < size

def check_win(board: List[str], player: str, size: int) -> bool:
    # Check horizontal, vertical, and diagonals
    for r in range(size):
        for c in range(size):
            idx = get_index(r, c, size)
            if board[idx] != player:
                continue
            
            # Check 4 directions
            for dr, dc in [(0, 1), (1, 0), (1, 1), (1, -1)]:
                win = True
                for i in range(1, 5):
                    nr, nc = r + dr * i, c + dc * i
                    if not in_bounds(nr, nc, size) or board[get_index(nr, nc, size)] != player:
                        win = False
                        break
                if win:
                    return True
    return False

def evaluate_line(line: List[str], player: str) -> int:
    opponent = 'W' if player == 'B' else 'B'
    p_count = line.count(player)
    o_count = line.count(opponent)
    empty = line.count("")

    if o_count == 0:
        if p_count == 5:
            return 1000000
        elif p_count == 4:
            return 50000
        elif p_count == 3:
            return 5000
        elif p_count == 2:
            return 100
    elif p_count == 0:
        if o_count == 5:
            return -1000000
        elif o_count == 4:
            return -45000  # Prioritize blocking opponent's 4
        elif o_count == 3:
            return -4000
        elif o_count == 2:
            return -80
    return 0

def evaluate_gomoku(board: List[str], player: str, size: int) -> int:
    score = 0
    opponent = 'W' if player == 'B' else 'B'

    # Evaluate all 5-cell segments in rows, columns, and diagonals
    # Horizontal
    for r in range(size):
        for c in range(size - 4):
            line = [board[get_index(r, c + i, size)] for i in range(5)]
            score += evaluate_line(line, player)
            
    # Vertical
    for r in range(size - 4):
        for c in range(size):
            line = [board[get_index(r + i, c, size)] for i in range(5)]
            score += evaluate_line(line, player)
            
    # Diagonal \
    for r in range(size - 4):
        for c in range(size - 4):
            line = [board[get_index(r + i, c + i, size)] for i in range(5)]
            score += evaluate_line(line, player)
            
    # Diagonal /
    for r in range(4, size):
        for c in range(size - 4):
            line = [board[get_index(r - i, c + i, size)] for i in range(5)]
            score += evaluate_line(line, player)

    return score

def get_interesting_moves(board: List[str], size: int) -> List[int]:
    """
    To keep search fast, only look at cells adjacent to existing stones (radius 1 or 2).
    """
    interesting = set()
    has_stones = False
    
    for i in range(len(board)):
        if board[i] != "":
            has_stones = True
            r, col = get_row_col(i, size)
            # Add neighbors in radius 2
            for dr in [-2, -1, 0, 1, 2]:
                for dc in [-2, -1, 0, 1, 2]:
                    nr, nc = r + dr, col + dc
                    if in_bounds(nr, nc, size):
                        idx = get_index(nr, nc, size)
                        if board[idx] == "":
                            interesting.add(idx)
                            
    if not has_stones:
        # If board is empty, play at center
        return [get_index(size // 2, size // 2, size)]
        
    return list(interesting)

def minimax_gomoku(board: List[str], depth: int, alpha: float, beta: float, maximizing_player: bool, player: str, size: int) -> Tuple[int, int]:
    opponent = 'W' if player == 'B' else 'B'
    active_player = player if maximizing_player else opponent

    # Quick check for win
    if check_win(board, player, size):
        return -1, 10000000 + depth
    if check_win(board, opponent, size):
        return -1, -10000000 - depth

    if depth == 0:
        return -1, evaluate_gomoku(board, player, size)

    moves = get_interesting_moves(board, size)
    if not moves:
        return -1, 0

    # Sort moves heuristically for faster pruning
    move_scores = []
    for move in moves:
        board[move] = active_player
        h_score = evaluate_gomoku(board, player, size)
        board[move] = ""
        move_scores.append((move, h_score))

    if maximizing_player:
        move_scores = sorted(move_scores, key=lambda x: x[1], reverse=True)
        value = -float('inf')
        best_move = move_scores[0][0]
        # Only check top 8 moves to preserve runtime
        for move, _ in move_scores[:8]:
            board[move] = player
            _, score = minimax_gomoku(board, depth - 1, alpha, beta, False, player, size)
            board[move] = ""
            if score > value:
                value = score
                best_move = move
            alpha = max(alpha, value)
            if alpha >= beta:
                break
        return best_move, value
    else:
        move_scores = sorted(move_scores, key=lambda x: x[1])
        value = float('inf')
        best_move = move_scores[0][0]
        for move, _ in move_scores[:8]:
            board[move] = opponent
            _, score = minimax_gomoku(board, depth - 1, alpha, beta, True, player, size)
            board[move] = ""
            if score < value:
                value = score
                best_move = move
            beta = min(beta, value)
            if alpha >= beta:
                break
        return best_move, value

def solve_gomoku(board: List[str], player: str) -> Dict[str, Any]:
    """
    Solves Gomoku state.
    board: 1D list of length N*N (typically 225 for 15x15)
    player: 'B' (Black) or 'W' (White)
    """
    size = get_board_size(board)
    opponent = 'W' if player == 'B' else 'B'

    if check_win(board, player, size):
        return {
            "status": "game_over",
            "winner": player,
            "best_move": None,
            "candidates": [],
            "explanations": {
                "beginner": f"Player {player} has already won with 5 in a row!",
                "intermediate": f"Terminal state: {player} has aligned five consecutive stones.",
                "advanced": f"Terminal win state evaluated for player {player}."
            }
        }
    if check_win(board, opponent, size):
        return {
            "status": "game_over",
            "winner": opponent,
            "best_move": None,
            "candidates": [],
            "explanations": {
                "beginner": f"Player {opponent} has already won the game.",
                "intermediate": f"Terminal state: opponent {opponent} completed five-in-a-row.",
                "advanced": f"Terminal loss state evaluated (winner: {opponent})."
            }
        }

    # Search depth of 2 is fast and yields great positional play on larger boards
    best_move, score = minimax_gomoku(board, 2, -float('inf'), float('inf'), True, player, size)

    interesting = get_interesting_moves(board, size)
    candidates = []
    
    # Evaluate candidates at depth 1 for responsiveness
    for move in interesting[:10]:
        board[move] = player
        c_score = evaluate_gomoku(board, player, size)
        board[move] = ""
        candidates.append({
            "move": move,
            "score": c_score
        })
    candidates = sorted(candidates, key=lambda x: x["score"], reverse=True)

    row, col = get_row_col(best_move, size)
    move_lbl = f"Row {row + 1}, Column {col + 1}"

    # Analyze move properties for explanations
    board[best_move] = player
    creates_5 = check_win(board, player, size)
    board[best_move] = ""

    board[best_move] = opponent
    blocks_5 = check_win(board, opponent, size)
    board[best_move] = ""

    if creates_5:
        beg_exp = f"Place your stone at {move_lbl} to complete your line of five and win the game!"
        int_exp = f"Winning move at {move_lbl}. Establishes five-in-a-row alignment."
        adv_exp = f"Terminal state transition: move at index {best_move} creates immediate five-in-a-row."
    elif blocks_5:
        beg_exp = f"Place your stone at {move_lbl} to block your opponent from getting five in a row and winning next turn!"
        int_exp = f"Defensive block at {move_lbl}. Restricts opponent's immediate winning sequence."
        adv_exp = f"Critical threat prevention: index {best_move} blocks opponent's five-in-a-row win path."
    else:
        beg_exp = f"Place your stone at {move_lbl} to create multiple threat lines (three-in-a-row or four-in-a-row) and build towards five."
        int_exp = f"Strategic cell occupancy at {move_lbl} to maximize structural connection lines."
        adv_exp = f"Heuristic selection at {move_lbl}. Evaluates board state utility at depth-2: {score}."

    return {
        "status": "active",
        "best_move": best_move,
        "evaluation": "Winning" if score > 30000 else "Even" if abs(score) < 5000 else "Losing",
        "score": score,
        "candidates": candidates,
        "explanations": {
            "beginner": beg_exp,
            "intermediate": int_exp,
            "advanced": adv_exp
        }
    }
