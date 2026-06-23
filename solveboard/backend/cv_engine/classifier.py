import cv2
import numpy as np
from typing import List, Dict, Any

def get_hsv_color_name(h: float, s: float, v: float) -> str:
    """Classifies an HSV color into one of the standard Rubik colors or Board colors."""
    # Hue values: Red is around 0/180, Orange 10-25, Yellow 25-35, Green 35-85, Blue 90-130
    if s < 40:
        return 'W' if v > 150 else 'B'  # White vs Black/Dark Grey
        
    if h < 8 or h > 165:
        return 'R'  # Red
    elif 8 <= h < 22:
        return 'O'  # Orange
    elif 22 <= h < 38:
        return 'Y'  # Yellow
    elif 38 <= h < 85:
        return 'G'  # Green
    elif 85 <= h < 135:
        return 'B'  # Blue
    return 'W'

def classify_connect4(warped_img: np.ndarray) -> List[str]:
    """Classifies a 6x7 Connect Four board. Returns a list of 42 strings ('R', 'Y', '')."""
    cells = []
    h, w = warped_img.shape[:2]
    cell_h = h // 6
    cell_w = w // 7
    
    hsv = cv2.cvtColor(warped_img, cv2.COLOR_BGR2HSV)

    for r in range(6):
        for c in range(7):
            # Focus on the center of the cell to avoid borders
            y1 = r * cell_h + int(cell_h * 0.25)
            y2 = (r + 1) * cell_h - int(cell_h * 0.25)
            x1 = c * cell_w + int(cell_w * 0.25)
            x2 = (c + 1) * cell_w - int(cell_w * 0.25)
            
            roi = hsv[y1:y2, x1:x2]
            avg_hsv = cv2.mean(roi)[:3]
            h_val, s_val, v_val = avg_hsv
            
            # Red has low hue (0-10) or high hue (170-180)
            # Yellow has hue around 25-35
            if s_val > 70: # Colorful disc present
                if h_val < 15 or h_val > 165:
                    cells.append("R")
                elif 20 <= h_val < 40:
                    cells.append("Y")
                else:
                    cells.append("")
            else:
                cells.append("")
                
    return cells

def classify_reversi(warped_img: np.ndarray) -> List[str]:
    """Classifies an 8x8 Reversi board. Returns 64 elements ('B', 'W', '')."""
    cells = []
    h, w = warped_img.shape[:2]
    cell_h = h // 8
    cell_w = w // 8
    
    hsv = cv2.cvtColor(warped_img, cv2.COLOR_BGR2HSV)

    for r in range(8):
        for c in range(8):
            y1 = r * cell_h + int(cell_h * 0.3)
            y2 = (r + 1) * cell_h - int(cell_h * 0.3)
            x1 = c * cell_w + int(cell_w * 0.3)
            x2 = (c + 1) * cell_w - int(cell_w * 0.3)
            
            roi = hsv[y1:y2, x1:x2]
            avg_hsv = cv2.mean(roi)[:3]
            h_val, s_val, v_val = avg_hsv
            
            # Reversi board is green. If green saturation is high, it is empty.
            # If s_val is low: it's either Black (low v_val) or White (high v_val).
            if 35 <= h_val <= 85 and s_val > 60:
                cells.append("")
            else:
                if v_val > 130:
                    cells.append("W")
                else:
                    cells.append("B")
                    
    return cells

def classify_checkers(warped_img: np.ndarray) -> List[str]:
    """Classifies an 8x8 Checkers board. Returns 64 elements ('r', 'R', 'w', 'W', '')."""
    cells = []
    h, w = warped_img.shape[:2]
    cell_h = h // 8
    cell_w = w // 8
    
    hsv = cv2.cvtColor(warped_img, cv2.COLOR_BGR2HSV)

    for r in range(8):
        for c in range(8):
            # Only checkers on dark squares: (r+c)%2 == 1
            if (r + c) % 2 == 0:
                cells.append("")
                continue
                
            y1 = r * cell_h + int(cell_h * 0.3)
            y2 = (r + 1) * cell_h - int(cell_h * 0.3)
            x1 = c * cell_w + int(cell_w * 0.3)
            x2 = (c + 1) * cell_w - int(cell_w * 0.3)
            
            roi = hsv[y1:y2, x1:x2]
            avg_hsv = cv2.mean(roi)[:3]
            h_val, s_val, v_val = avg_hsv
            
            if s_val > 80: # Red checkers
                if h_val < 15 or h_val > 160:
                    # Default pawn, users can promote to King via interactive editor
                    cells.append("r")
                else:
                    cells.append("")
            elif s_val < 50 and v_val > 160: # White checkers
                cells.append("w")
            else:
                cells.append("")
                
    return cells

def classify_tictactoe(warped_img: np.ndarray) -> List[str]:
    """Classifies a 3x3 Tic-Tac-Toe grid. Returns 9 elements ('X', 'O', '')."""
    cells = []
    h, w = warped_img.shape[:2]
    cell_h = h // 3
    cell_w = w // 3
    
    gray = cv2.cvtColor(warped_img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)

    for r in range(3):
        for c in range(3):
            y1 = r * cell_h + int(cell_h * 0.15)
            y2 = (r + 1) * cell_h - int(cell_h * 0.15)
            x1 = c * cell_w + int(cell_w * 0.15)
            x2 = (c + 1) * cell_w - int(cell_w * 0.15)
            
            roi_edges = edges[y1:y2, x1:x2]
            non_zero = cv2.countNonZero(roi_edges)
            
            # If very few edge pixels, it is empty
            if non_zero < 80:
                cells.append("")
            else:
                # Distinguish X vs O by contour shape complexity (O is rounder)
                roi_gray = gray[y1:y2, x1:x2]
                _, thresh = cv2.threshold(roi_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                if contours:
                    largest = max(contours, key=cv2.contourArea)
                    perimeter = cv2.arcLength(largest, True)
                    area = cv2.contourArea(largest)
                    if perimeter > 0:
                        circularity = 4 * np.pi * area / (perimeter ** 2)
                        # Circles have circularity closer to 1, crosses are much lower (< 0.5)
                        if circularity > 0.65:
                            cells.append("O")
                            continue
                cells.append("X")
                
    return cells

def classify_rubik_face(warped_img: np.ndarray) -> List[str]:
    """Classifies a 3x3 Rubik's Cube face stickers. Returns 9 colors ('W', 'R', 'G', 'Y', 'O', 'B')."""
    cells = []
    h, w = warped_img.shape[:2]
    cell_h = h // 3
    cell_w = w // 3
    
    hsv = cv2.cvtColor(warped_img, cv2.COLOR_BGR2HSV)

    for r in range(3):
        for c in range(3):
            y1 = r * cell_h + int(cell_h * 0.3)
            y2 = (r + 1) * cell_h - int(cell_h * 0.3)
            x1 = c * cell_w + int(cell_w * 0.3)
            x2 = (c + 1) * cell_w - int(cell_w * 0.3)
            
            roi = hsv[y1:y2, x1:x2]
            avg_hsv = cv2.mean(roi)[:3]
            color = get_hsv_color_name(avg_hsv[0], avg_hsv[1], avg_hsv[2])
            cells.append(color)
            
    return cells
def classify_chess(warped_img: np.ndarray) -> List[str]:
    """
    Classifies an 8x8 Chess board using traditional OpenCV.
    Uses pixel standard deviation to check occupancy, and brightness (mean gray value)
    to check color (White vs Black).
    Falls back to logical types (Rook, Knight, Pawn, etc.) based on grid rank to simplify editing.
    """
    cells = []
    h, w = warped_img.shape[:2]
    cell_h = h // 8
    cell_w = w // 8
    
    gray = cv2.cvtColor(warped_img, cv2.COLOR_BGR2GRAY)
    
    # Predefined piece templates based on rank position
    black_pieces = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
    white_pieces = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']

    for r in range(8):
        for c in range(8):
            # Coordinates for center of cell
            y1 = r * cell_h + int(cell_h * 0.22)
            y2 = (r + 1) * cell_h - int(cell_h * 0.22)
            x1 = c * cell_w + int(cell_w * 0.22)
            x2 = (c + 1) * cell_w - int(cell_w * 0.22)
            
            roi = gray[y1:y2, x1:x2]
            std_dev = np.std(roi)
            mean_val = np.mean(roi)

            # Check if square is occupied (std dev > 13.5 indicates texture/edges of chess pieces)
            if std_dev > 13.5:
                # White pieces are bright, Black pieces are dark compared to the wooden tile
                if mean_val > 140:
                    # White piece
                    if r == 7:
                        cells.append(white_pieces[c])
                    elif r == 6:
                        cells.append('P')
                    else:
                        cells.append('P')  # default pawn in mid board
                else:
                    # Black piece
                    if r == 0:
                        cells.append(black_pieces[c])
                    elif r == 1:
                        cells.append('p')
                    else:
                        cells.append('p')  # default pawn in mid board
            else:
                cells.append("")
                
    # CRITICAL FALLBACK: Ensure the FEN always contains both Kings!
    # Without Kings, python-chess raises ValueError or evaluates the board as dead (game over).
    if 'k' not in cells:
        cells[4] = 'k'  # Place Black King on e8 by default
    if 'K' not in cells:
        cells[60] = 'K'  # Place White King on e1 by default

    return cells

def extract_state(warped_image_path: str, game_type: str) -> List[Any]:
    """
    Main entry point. Loads the warped image and returns the estimated board state grid
    as a list of strings/integers, which is then sent to the frontend for verification.
    """
    img = cv2.imread(warped_image_path)
    if img is None:
        return []
        
    game_type = game_type.lower().replace("-", "").replace(" ", "")
    
    if game_type == "connectfour" or game_type == "connect4":
        return classify_connect4(img)
    elif game_type == "reversi" or game_type == "othello":
        return classify_reversi(img)
    elif game_type == "checkers":
        return classify_checkers(img)
    elif game_type == "tictactoe":
        return classify_tictactoe(img)
    elif game_type == "rubikscube" or game_type == "rubik":
        return classify_rubik_face(img)
    elif game_type == "sudoku":
        # Return empty 9x9 board with default zeros, let user fill in or pre-detect populated squares
        cells = []
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        cell_h, cell_w = img.shape[0] // 9, img.shape[1] // 9
        for r in range(9):
            for c in range(9):
                y1 = r * cell_h + int(cell_h * 0.25)
                y2 = (r + 1) * cell_h - int(cell_h * 0.25)
                x1 = c * cell_w + int(cell_w * 0.25)
                x2 = (c + 1) * cell_w - int(cell_w * 0.25)
                roi = gray[y1:y2, x1:x2]
                std_dev = np.std(roi)
                if std_dev > 18:
                    cells.append(1)
                else:
                    cells.append(0)
        return cells
    elif game_type == "chess":
        return classify_chess(img)
    elif game_type in ["8puzzle", "8-puzzle"]:
        return [1, 2, 3, 4, 5, 6, 7, 8, 0]
    elif game_type in ["15puzzle", "15-puzzle"]:
        return list(range(1, 16)) + [0]
    elif game_type == "gomoku":
        return [""] * 225

    return []
