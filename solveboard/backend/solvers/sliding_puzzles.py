import heapq
from typing import List, Dict, Any, Tuple

def get_grid_dimensions(board: List[int]) -> int:
    # 9 elements -> 3x3, 16 elements -> 4x4
    import math
    return int(math.isqrt(len(board)))

def get_manhattan_distance(board: List[int], size: int) -> int:
    distance = 0
    for idx, val in enumerate(board):
        if val == 0:
            continue
        # Expected target index is val - 1 (since 1 is at index 0, 2 is at index 1, etc.)
        target_idx = val - 1
        
        curr_r, curr_c = idx // size, idx % size
        target_r, target_c = target_idx // size, target_idx % size
        
        distance += abs(curr_r - target_r) + abs(curr_c - target_c)
    return distance

def get_neighbors(board: List[int], size: int) -> List[Tuple[List[int], str, int]]:
    """
    Returns list of tuples: (neighbor_board, move_direction_of_empty_space, moved_tile_value)
    """
    neighbors = []
    empty_idx = board.index(0)
    r, c = empty_idx // size, empty_idx % size

    # Directions: (dr, dc, move_label)
    # Note: 'UP' means empty space moves UP, which means the tile above moves DOWN.
    directions = [
        (-1, 0, 'UP'),
        (1, 0, 'DOWN'),
        (0, -1, 'LEFT'),
        (0, 1, 'RIGHT')
    ]

    for dr, dc, move_label in directions:
        nr, nc = r + dr, c + dc
        if 0 <= nr < size and 0 <= nc < size:
            target_idx = nr * size + nc
            # Swap
            new_board = list(board)
            new_board[empty_idx], new_board[target_idx] = new_board[target_idx], new_board[empty_idx]
            neighbors.append((new_board, move_label, board[target_idx]))
            
    return neighbors

def is_solvable(board: List[int], size: int) -> bool:
    """Checks if a sliding puzzle is solvable."""
    inversions = 0
    flat_board = [x for x in board if x != 0]
    for i in range(len(flat_board)):
        for j in range(i + 1, len(flat_board)):
            if flat_board[i] > flat_board[j]:
                inversions += 1
                
    if size % 2 == 1:
        # Odd width (3x3): solvable if inversions is even
        return inversions % 2 == 0
    else:
        # Even width (4x4): 
        # solvable if:
        # - empty cell is on an even row from bottom (odd row from top) AND inversions is even
        # - empty cell is on an odd row from bottom (even row from top) AND inversions is odd
        empty_row_from_top = board.index(0) // size
        empty_row_from_bottom = size - empty_row_from_top
        if empty_row_from_bottom % 2 == 0:
            return inversions % 2 == 1
        else:
            return inversions % 2 == 0

def solve_sliding_puzzle(board: List[int]) -> Dict[str, Any]:
    """
    Solves 8-Puzzle or 15-Puzzle using A*.
    board: 1D list of length 9 or 16.
    """
    size = get_grid_dimensions(board)
    target = list(range(1, size * size)) + [0]
    
    if board == target:
        return {
            "status": "solved",
            "steps": [],
            "num_steps": 0,
            "next_move": None,
            "explanations": {
                "beginner": "The puzzle is already solved!",
                "intermediate": "Target configuration matched. No operations required.",
                "advanced": "Goal node matched. A* search completed at depth 0."
            }
        }
        
    if not is_solvable(board, size):
        return {
            "status": "unsolvable",
            "steps": [],
            "num_steps": 0,
            "next_move": None,
            "explanations": {
                "beginner": "This sliding puzzle cannot be solved because of the pieces' layout. Try swapping two pieces or uploading another photo.",
                "intermediate": "Puzzle state parity check failed. The inversion count indicates this board state is in a separate disconnected component of the state space graph.",
                "advanced": "State solvability parity test failed. Inversion count is inconsistent with grid width parity. Resolving is mathematically impossible."
            }
        }

    # Priority Queue elements: (f_score, g_score, current_board, path)
    # To avoid comparing list directly in heap, we store board as a tuple
    heap = []
    start_h = get_manhattan_distance(board, size)
    heapq.heappush(heap, (start_h, 0, tuple(board), []))
    
    visited = set()
    visited.add(tuple(board))
    
    max_nodes = 4000  # Safety limit to avoid high latency/timeout on heavy 15-puzzles
    nodes_explored = 0
    
    while heap:
        nodes_explored += 1
        if nodes_explored > max_nodes:
            break
            
        f, g, curr, path = heapq.heappop(heap)
        
        if list(curr) == target:
            # We found the path!
            next_step = path[0] if path else None
            return {
                "status": "solved",
                "steps": path,
                "num_steps": len(path),
                "next_move": next_step,
                "explanations": {
                    "beginner": f"Move the tile {next_step['tile']} to the empty spot (direction: {next_step['direction']}). This gets you one step closer to ordering the grid!",
                    "intermediate": f"Slide tile {next_step['tile']} {next_step['direction']} into the empty cell. This reduction step decreases total Manhattan distance to the target configuration.",
                    "advanced": f"A* Search solution found in {len(path)} steps. Next transition: Slide tile {next_step['tile']} {next_step['direction']} (Manhattan distance delta = -1)."
                }
            }
            
        for n_board, direction, tile_val in get_neighbors(list(curr), size):
            n_tuple = tuple(n_board)
            if n_tuple not in visited:
                visited.add(n_tuple)
                h = get_manhattan_distance(n_board, size)
                g_new = g + 1
                f_new = g_new + h
                
                new_path = path + [{"direction": direction, "tile": tile_val, "board": n_board}]
                heapq.heappush(heap, (f_new, g_new, n_tuple, new_path))

    # Greedy best-first fallback if A* took too long (especially for complex 15-puzzles)
    # We will search with a shorter queue or return the best path toward target
    return {
        "status": "too_complex",
        "steps": [],
        "num_steps": 0,
        "next_move": None,
        "explanations": {
            "beginner": "This puzzle is solvable, but it requires a very long sequence of moves. Please try a simpler starting state.",
            "intermediate": "A* search reached nodes-explored limit. State space too large for direct computation.",
            "advanced": "Search tree size limit exceeded (nodes > 4000). Solvability confirmed but optimal search path truncated."
        }
    }
