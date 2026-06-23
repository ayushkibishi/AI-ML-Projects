import cv2
import numpy as np
import os
from typing import Tuple, List, Dict, Any

def preprocess_image(image_path: str) -> Tuple[np.ndarray, np.ndarray]:
    """Reads and preprocesses image for contour detection."""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image from path: {image_path}")
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    # Adaptive thresholding to handle shadows
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 11, 2
    )
    return img, thresh

def find_board_contour(thresh: np.ndarray) -> np.ndarray:
    """Finds the largest quadrilateral contour which represents the board."""
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Sort contours by area descending
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    
    for contour in contours:
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        
        # Quadrilateral check
        if len(approx) == 4 and cv2.contourArea(contour) > 5000:
            return approx
            
    return None

def order_points(pts: np.ndarray) -> np.ndarray:
    """Orders coordinates as [top-left, top-right, bottom-right, bottom-left]."""
    pts = pts.reshape(4, 2)
    rect = np.zeros((4, 2), dtype="float32")
    
    # Top-left has smallest sum, bottom-right has largest sum
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    
    # Top-right has smallest difference, bottom-left has largest difference
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    
    return rect

def warp_perspective(img: np.ndarray, pts: np.ndarray, output_size: int = 400) -> np.ndarray:
    """Warps the perspective of the quad points into a flat square image."""
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    
    dst = np.array([
        [0, 0],
        [output_size - 1, 0],
        [output_size - 1, output_size - 1],
        [0, output_size - 1]
    ], dtype="float32")
    
    matrix = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(img, matrix, (output_size, output_size))
    return warped

def detect_board(image_path: str, output_dir: str = "uploads") -> Dict[str, Any]:
    """
    Detects board boundaries and returns path to warped image, 
    detection status, and coordinates.
    """
    os.makedirs(output_dir, exist_ok=True)
    filename = os.path.basename(image_path)
    warped_path = os.path.join(output_dir, "warped_" + filename)

    try:
        img, thresh = preprocess_image(image_path)
        h, w = img.shape[:2]
        board_contour = find_board_contour(thresh)
        
        if board_contour is not None:
            # Warp the board
            warped_img = warp_perspective(img, board_contour)
            cv2.imwrite(warped_path, warped_img)
            
            # Format corner points for frontend
            pts = order_points(board_contour).tolist()
            return {
                "status": "success",
                "message": "Board successfully detected and warped.",
                "warped_image_path": warped_path,
                "points": pts,
                "dimensions": {"width": w, "height": h},
                "confidence": 0.95
            }
            
    except Exception as e:
        # Log error but don't crash
        print(f"Error in CV board detection: {e}")

    # Fallback if no board contour is found: return original image
    fallback_img = cv2.imread(image_path)
    if fallback_img is not None:
        cv2.imwrite(warped_path, fallback_img)
        h, w = fallback_img.shape[:2]
        return {
            "status": "fallback",
            "message": "No clear board detected. Using original image contours.",
            "warped_image_path": warped_path,
            "points": [[0, 0], [w, 0], [w, h], [0, h]],
            "dimensions": {"width": w, "height": h},
            "confidence": 0.40
        }
        
    return {
        "status": "error",
        "message": "Failed to read or process uploaded image.",
        "warped_image_path": None,
        "points": [],
        "dimensions": {"width": 0, "height": 0},
        "confidence": 0.0
    }
