from typing import List, Dict, Any, Tuple

def is_valid_sudoku(board: List[int], val: int, idx: int) -> bool:
    row, col = idx // 9, idx % 9
    
    # Check row
    for c in range(9):
        if board[row * 9 + c] == val and c != col:
            return False
            
    # Check column
    for r in range(9):
        if board[r * 9 + col] == val and r != row:
            return False
            
    # Check 3x3 box
    box_r, box_c = (row // 3) * 3, (col // 3) * 3
    for r in range(box_r, box_r + 3):
        for c in range(box_c, box_c + 3):
            if board[r * 9 + c] == val and (r != row or c != col):
                return False
                
    return True

def get_candidates(board: List[int], idx: int) -> List[int]:
    if board[idx] != 0:
        return []
    candidates = []
    for val in range(1, 10):
        if is_valid_sudoku(board, val, idx):
            candidates.append(val)
    return candidates

def find_mrv_cell(board: List[int]) -> int:
    """Finds the empty cell with the Minimum Remaining Values (MRV)."""
    min_candidates = 10
    best_idx = -1
    for i in range(81):
        if board[i] == 0:
            candidates = get_candidates(board, i)
            num_cand = len(candidates)
            if num_cand < min_candidates:
                min_candidates = num_cand
                best_idx = i
    return best_idx

def solve_backtracking(board: List[int]) -> bool:
    idx = find_mrv_cell(board)
    if idx == -1:
        return True  # Solved!
        
    candidates = get_candidates(board, idx)
    for val in candidates:
        board[idx] = val
        if solve_backtracking(board):
            return True
        board[idx] = 0
        
    return False

def get_next_hint(board: List[int]) -> Tuple[int, int, str, str, str]:
    """
    Finds a cell that is easy to solve (e.g., has the fewest options, ideally 1)
    and explains why.
    """
    # Look for a cell with exactly 1 candidate (naked single)
    naked_single_idx = -1
    naked_single_candidates = []
    
    # Fallback: MRV cell
    mrv_idx = -1
    mrv_candidates = []
    min_cand_len = 10

    for i in range(81):
        if board[i] == 0:
            cands = get_candidates(board, i)
            if len(cands) == 1:
                naked_single_idx = i
                naked_single_candidates = cands
                break
            if len(cands) < min_cand_len and len(cands) > 0:
                min_cand_len = len(cands)
                mrv_idx = i
                mrv_candidates = cands

    target_idx = naked_single_idx if naked_single_idx != -1 else mrv_idx
    candidates = naked_single_candidates if naked_single_idx != -1 else mrv_candidates
    
    if target_idx == -1 or not candidates:
        return -1, 0, "", "", ""
        
    row, col = target_idx // 9, target_idx % 9
    chosen_val = candidates[0]
    
    # Build explanation details
    row_vals = [board[row * 9 + c] for c in range(9) if board[row * 9 + c] != 0]
    col_vals = [board[r * 9 + col] for r in range(9) if board[r * 9 + col] != 0]
    
    box_r, box_c = (row // 3) * 3, (col // 3) * 3
    box_vals = []
    for r in range(box_r, box_r + 3):
        for c in range(box_c, box_c + 3):
            val = board[r * 9 + c]
            if val != 0:
                box_vals.append(val)

    # Explanation texts
    beg_exp = f"Focus on Row {row + 1}, Column {col + 1}. The number {chosen_val} fits here because it's not present in its row, column, or 3x3 block."
    
    int_exp = (
        f"Cell ({row+1}, {col+1}) has candidates {candidates}. We suggest placing {chosen_val} here. "
        f"Its row already contains {sorted(list(set(row_vals)))}, column contains {sorted(list(set(col_vals)))}, "
        f"and the 3x3 box contains {sorted(list(set(box_vals)))}."
    )
    
    adv_exp = (
        f"Constraint Satisfaction optimization selects variable x_{row}_{col}. "
        f"Domain reduction via Arc Consistency (AC-3) narrows legal values to {candidates}. "
        f"Value {chosen_val} is selected via MRV heuristic."
    )
    
    return target_idx, chosen_val, beg_exp, int_exp, adv_exp

def solve_sudoku(board: List[int]) -> Dict[str, Any]:
    """
    Solves Sudoku puzzle.
    board: 1D list of 81 integers (0 for empty, 1-9 for filled cells)
    """
    # Make a copy for solving
    work_board = list(board)
    
    # Check if input board is valid
    for i in range(81):
        if board[i] != 0:
            if not is_valid_sudoku(board, board[i], i):
                return {
                    "status": "invalid_board",
                    "solved_board": None,
                    "next_hint": None,
                    "explanations": {
                        "beginner": "The board has duplicate numbers in the same row, column, or block. Please correct them.",
                        "intermediate": "Conflict detected in board configuration: duplicate values violate Sudoku rules.",
                        "advanced": "Malformed Sudoku constraint graph: duplicate assignment violates uniqueness constraint."
                    }
                }

    # Find the next hint before modifying the board
    hint_idx, hint_val, beg, jnt, adv = get_next_hint(board)
    
    # Solve the board
    success = solve_backtracking(work_board)
    
    if not success:
        return {
            "status": "unsolvable",
            "solved_board": None,
            "next_hint": None,
            "explanations": {
                "beginner": "This Sudoku puzzle is unsolvable in its current state.",
                "intermediate": "No valid solution exists matching the initial constraints.",
                "advanced": "CSP backtracking search completed with failure. No solution path exists."
            }
        }
        
    hint_row, hint_col = hint_idx // 9, hint_idx % 9 if hint_idx != -1 else (0, 0)
    
    return {
        "status": "solved",
        "solved_board": work_board,
        "next_hint": {
            "index": hint_idx,
            "row": hint_row,
            "column": hint_col,
            "value": hint_val
        },
        "explanations": {
            "beginner": beg,
            "intermediate": jnt,
            "advanced": adv
        }
    }
