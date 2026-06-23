from typing import List, Dict, Any

def check_winner(board: List[str]) -> str:
    # Tic-Tac-Toe winning combinations
    win_combos = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], # Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], # Columns
        [0, 4, 8], [2, 4, 6]             # Diagonals
    ]
    for combo in win_combos:
        if board[combo[0]] != "" and board[combo[0]] == board[combo[1]] == board[combo[2]]:
            return board[combo[0]]
    if "" not in board:
        return "Draw"
    return ""

def minimax(board: List[str], depth: int, is_maximizing: bool, ai_player: str, opponent: str) -> int:
    winner = check_winner(board)
    if winner == ai_player:
        return 10 - depth
    elif winner == opponent:
        return depth - 10
    elif winner == "Draw":
        return 0

    if is_maximizing:
        best_score = -float('inf')
        for i in range(9):
            if board[i] == "":
                board[i] = ai_player
                score = minimax(board, depth + 1, False, ai_player, opponent)
                board[i] = ""
                best_score = max(best_score, score)
        return best_score
    else:
        best_score = float('inf')
        for i in range(9):
            if board[i] == "":
                board[i] = opponent
                score = minimax(board, depth + 1, True, ai_player, opponent)
                board[i] = ""
                best_score = min(best_score, score)
        return best_score

def solve_tictactoe(board: List[str], player: str) -> Dict[str, Any]:
    """
    Solves a Tic-Tac-Toe board for the given player.
    board: list of 9 elements ('X', 'O', '')
    player: 'X' or 'O'
    """
    opponent = 'O' if player == 'X' else 'X'
    winner = check_winner(board)
    if winner:
        return {
            "status": "game_over",
            "winner": winner,
            "best_move": None,
            "candidates": [],
            "explanations": {
                "beginner": "The game has already ended.",
                "intermediate": "Game over state reached.",
                "advanced": f"Terminal board evaluation. Winner: {winner}."
            }
        }

    best_score = -float('inf')
    best_move = -1
    candidates = []

    for i in range(9):
        if board[i] == "":
            board[i] = player
            score = minimax(board, 0, False, player, opponent)
            board[i] = ""
            candidates.append({"move": i, "score": score})
            if score > best_score:
                best_score = score
                best_move = i

    # Sort candidates by score descending
    candidates = sorted(candidates, key=lambda x: x["score"], reverse=True)

    # Let's map score to human-readable text
    # Max score is 10 (win in 0 moves), 0 is draw, negative is loss
    evaluation = "Draw"
    if best_score > 0:
        evaluation = "Winning"
    elif best_score < 0:
        evaluation = "Losing"

    # Generate explanations based on move properties
    # Let's look at the chosen move
    row, col = best_move // 3, best_move % 3
    pos_desc = f"row {row + 1}, column {col + 1}"

    # Check if this move is a winning move or a blocking move
    board[best_move] = player
    is_winning = check_winner(board) == player
    board[best_move] = ""

    is_blocking = False
    for i in range(9):
        if board[i] == "":
            board[i] = opponent
            if check_winner(board) == opponent:
                # Opponent could have won here
                if i == best_move:
                    is_blocking = True
            board[i] = ""

    # Select explanation template
    if is_winning:
        beg_exp = f"Place your marker at {pos_desc} to get three in a row and win the game!"
        int_exp = f"Winning move at {pos_desc}. Completes the 3-in-a-row alignment for {player}."
        adv_exp = f"Terminal state transition: play at index {best_move} results in an immediate win (score: +10)."
    elif is_blocking:
        beg_exp = f"Place your marker at {pos_desc} to block your opponent from winning on their next turn!"
        int_exp = f"Defensive block at {pos_desc}. Prevents {opponent} from completing their winning sequence."
        adv_exp = f"Threat neutralization: index {best_move} blocks {opponent}'s immediate win-path, maintaining draw utility."
    elif best_move == 4:
        beg_exp = "Take the center square! The center is the most important square because it lets you build lines in all directions."
        int_exp = "Center control. Occupying index 4 maximizes the number of potential winning vectors (rows, columns, and diagonals)."
        adv_exp = "Optimal opening strategy: Central grid control maximizes branching factor and defensive coverage (heuristic weight: high)."
    else:
        beg_exp = f"Place your marker at {pos_desc} to set up your lines and control the board."
        int_exp = f"Positional play at {pos_desc} to build line opportunities and restrict opponent's placement options."
        adv_exp = f"Non-terminal minimax choice: Selected index {best_move} yielding game tree evaluation score of {best_score}."

    return {
        "status": "active",
        "best_move": best_move,
        "evaluation": evaluation,
        "score": best_score,
        "candidates": candidates,
        "explanations": {
            "beginner": beg_exp,
            "intermediate": int_exp,
            "advanced": adv_exp
        }
    }
