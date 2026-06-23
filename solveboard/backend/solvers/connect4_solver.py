from typing import List, Dict, Any

ROWS = 6
COLS = 7

def get_row_col(index: int):
    return index // COLS, index % COLS

def get_index(row: int, col: int) -> int:
    return row * COLS + col

def get_next_open_row(board: List[str], col: int) -> int:
    # Check from bottom row (5) up to top row (0)
    for r in range(ROWS - 1, -1, -1):
        if board[get_index(r, col)] == "":
            return r
    return -1

def check_winning_move(board: List[str], piece: str) -> bool:
    # Horizontal check
    for r in range(ROWS):
        for c in range(COLS - 3):
            if all(board[get_index(r, c + i)] == piece for i in range(4)):
                return True
    # Vertical check
    for r in range(ROWS - 3):
        for c in range(COLS):
            if all(board[get_index(r + i, c)] == piece for i in range(4)):
                return True
    # Positive diagonal check
    for r in range(ROWS - 3):
        for c in range(COLS - 3):
            if all(board[get_index(r + i, c + i)] == piece for i in range(4)):
                return True
    # Negative diagonal check
    for r in range(3, ROWS):
        for c in range(COLS - 3):
            if all(board[get_index(r - i, c + i)] == piece for i in range(4)):
                return True
    return False

def evaluate_window(window: List[str], piece: str, opponent: str) -> int:
    score = 0
    piece_count = window.count(piece)
    opp_count = window.count(opponent)
    empty_count = window.count("")

    if piece_count == 4:
        score += 100000
    elif piece_count == 3 and empty_count == 1:
        score += 100
    elif piece_count == 2 and empty_count == 2:
        score += 10

    if opp_count == 3 and empty_count == 1:
        score -= 80  # block opponent's 3-in-a-row
    elif opp_count == 2 and empty_count == 2:
        score -= 8

    return score

def evaluate_board(board: List[str], piece: str) -> int:
    score = 0
    opponent = "Y" if piece == "R" else "R"

    # Center column preference
    center_col = [board[get_index(r, COLS // 2)] for r in range(ROWS)]
    center_count = center_col.count(piece)
    score += center_count * 15

    # Horizontal score
    for r in range(ROWS):
        row_array = [board[get_index(r, c)] for c in range(COLS)]
        for c in range(COLS - 3):
            window = row_array[c:c + 4]
            score += evaluate_window(window, piece, opponent)

    # Vertical score
    for c in range(COLS):
        col_array = [board[get_index(r, c)] for r in range(ROWS)]
        for r in range(ROWS - 3):
            window = col_array[r:r + 4]
            score += evaluate_window(window, piece, opponent)

    # Positive diagonal score
    for r in range(ROWS - 3):
        for c in range(COLS - 3):
            window = [board[get_index(r + i, c + i)] for i in range(4)]
            score += evaluate_window(window, piece, opponent)

    # Negative diagonal score
    for r in range(3, ROWS):
        for c in range(COLS - 3):
            window = [board[get_index(r - i, c + i)] for i in range(4)]
            score += evaluate_window(window, piece, opponent)

    return score

def is_terminal_node(board: List[str]) -> bool:
    return (
        check_winning_move(board, "R") or 
        check_winning_move(board, "Y") or 
        len([c for c in range(COLS) if get_next_open_row(board, c) != -1]) == 0
    )

def minimax_c4(board: List[str], depth: int, alpha: float, beta: float, maximizing_player: bool, piece: str, opponent: str) -> tuple:
    valid_locations = [c for c in range(COLS) if get_next_open_row(board, c) != -1]
    is_terminal = is_terminal_node(board)

    if depth == 0 or is_terminal:
        if is_terminal:
            if check_winning_move(board, piece):
                return (None, 10000000 + depth)
            elif check_winning_move(board, opponent):
                return (None, -10000000 - depth)
            else:  # No more moves (Draw)
                return (None, 0)
        else:
            return (None, evaluate_board(board, piece))

    # Prioritize center columns for faster alpha-beta pruning cuts
    valid_locations = sorted(valid_locations, key=lambda c: abs(c - COLS // 2))

    if maximizing_player:
        value = -float('inf')
        best_col = valid_locations[0] if valid_locations else -1
        for col in valid_locations:
            row = get_next_open_row(board, col)
            idx = get_index(row, col)
            board[idx] = piece
            _, new_score = minimax_c4(board, depth - 1, alpha, beta, False, piece, opponent)
            board[idx] = ""
            if new_score > value:
                value = new_score
                best_col = col
            alpha = max(alpha, value)
            if alpha >= beta:
                break
        return best_col, value
    else:
        value = float('inf')
        best_col = valid_locations[0] if valid_locations else -1
        for col in valid_locations:
            row = get_next_open_row(board, col)
            idx = get_index(row, col)
            board[idx] = opponent
            _, new_score = minimax_c4(board, depth - 1, alpha, beta, True, piece, opponent)
            board[idx] = ""
            if new_score < value:
                value = new_score
                best_col = col
            beta = min(beta, value)
            if alpha >= beta:
                break
        return best_col, value

def solve_connect4(board: List[str], player: str) -> Dict[str, Any]:
    """
    Solves Connect Four state.
    board: 1D list of 42 strings ('R', 'Y', '')
    player: 'R' (Red) or 'Y' (Yellow)
    """
    opponent = "Y" if player == "R" else "R"

    if is_terminal_node(board):
        winner = None
        if check_winning_move(board, "R"):
            winner = "R"
        elif check_winning_move(board, "Y"):
            winner = "Y"
        return {
            "status": "game_over",
            "winner": winner,
            "best_move": None,
            "candidates": [],
            "explanations": {
                "beginner": "The game has already ended.",
                "intermediate": "No further moves possible.",
                "advanced": f"Terminal board. Winner: {winner}."
            }
        }

    # Search depth of 6 is fast in Python (usually <0.5s)
    best_col, score = minimax_c4(board, 5, -float('inf'), float('inf'), True, player, opponent)

    # Calculate scores for all candidate moves
    candidates = []
    valid_cols = [c for c in range(COLS) if get_next_open_row(board, c) != -1]
    for col in valid_cols:
        row = get_next_open_row(board, col)
        idx = get_index(row, col)
        board[idx] = player
        # evaluate at depth 3 for quick candidate assessment
        _, c_score = minimax_c4(board, 3, -float('inf'), float('inf'), False, player, opponent)
        board[idx] = ""
        candidates.append({"column": col, "score": c_score})

    candidates = sorted(candidates, key=lambda x: x["score"], reverse=True)

    # Design custom explanations based on selected column
    col_name = f"column {best_col + 1}"
    
    # Check if this move wins immediately or blocks an opponent's win
    row = get_next_open_row(board, best_col)
    idx = get_index(row, best_col)
    
    board[idx] = player
    wins_immediately = check_winning_move(board, player)
    board[idx] = ""
    
    board[idx] = opponent
    blocks_immediately = check_winning_move(board, opponent)
    board[idx] = ""

    if wins_immediately:
        beg_exp = f"Drop your disc in {col_name} to align four discs and win the game!"
        int_exp = f"Immediate winning move at {col_name}. Completes a 4-in-a-row connection."
        adv_exp = f"Depth-0 terminal win: placing piece in {col_name} completes winning alignment."
    elif blocks_immediately:
        beg_exp = f"Drop your disc in {col_name} to block your opponent from winning on their next turn!"
        int_exp = f"Critical defensive block at {col_name}. Interrupts the opponent's winning line of three."
        adv_exp = f"Immediate threat response: column {best_col} blocks opponent's 4-in-a-row path."
    elif best_col == 3:
        beg_exp = "Play in the center column. Controlling the middle columns is critical in Connect Four because it gives you the most paths to build lines."
        int_exp = "Center column control. Central column placement maximizes connectivity options across both left and right sides."
        adv_exp = "Positional priority: Column 3 offers the maximum number of potential winning vectors (horizontal, vertical, diagonal)."
    else:
        beg_exp = f"Drop your disc in {col_name} to build up your vertical stack and create diagonal threats."
        int_exp = f"Positional expansion in {col_name}. Sets up multiple branching lines while blocking opponent progress."
        adv_exp = f"Minimax search depth-5 optimal column selection: column {best_col} yields optimal heuristic evaluation score of {score}."

    return {
        "status": "active",
        "best_move": best_col,
        "evaluation": "Winning" if score > 50000 else "Even" if abs(score) < 5000 else "Losing",
        "score": score,
        "candidates": candidates,
        "explanations": {
            "beginner": beg_exp,
            "intermediate": int_exp,
            "advanced": adv_exp
        }
    }
