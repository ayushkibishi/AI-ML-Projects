import os
import cv2
import asyncio
import base64
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.api.routes import router as api_router, system_settings
from backend.websocket.manager import ws_manager
from backend.services.ai_runner import AIRunner

app = FastAPI(
    title="VisionTrack AI",
    description="Smart Office Surveillance & Workspace Intelligence System Backend",
    version="1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for dev simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router
app.include_router(api_router, prefix="/api")

# Serve employee photos if they exist
os.makedirs("recordings/faces", exist_ok=True)
app.mount("/faces", StaticFiles(directory="recordings/faces"), name="faces")

# Initialize AI Runner
ai_runner = AIRunner()

def generate_synthetic_office_frame(t):
    """Generates a beautiful futuristic office layout screen for demo stream."""
    h, w = 480, 640
    # Dark futuristic blueprint theme background
    frame = np.zeros((h, w, 3), dtype=np.uint8)
    frame[:, :] = (15, 10, 5) # deep charcoal blue
    
    # Draw floor grids
    grid_size = 40
    for x in range(0, w, grid_size):
        cv2.line(frame, (x, 0), (x, h), (30, 20, 10), 1)
    for y in range(0, h, grid_size):
        cv2.line(frame, (0, y), (w, y), (30, 20, 10), 1)
        
    # Draw desk clusters
    # Desk 1
    cv2.rectangle(frame, (80, 120), (220, 180), (45, 30, 15), 1)
    cv2.putText(frame, "DESK CLUSTER A", (85, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (80, 60, 40), 1, cv2.LINE_AA)
    # Desk 2
    cv2.rectangle(frame, (420, 120), (560, 180), (45, 30, 15), 1)
    cv2.putText(frame, "DESK CLUSTER B", (425, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (80, 60, 40), 1, cv2.LINE_AA)
    # Server rack zone
    cv2.rectangle(frame, (80, 320), (200, 420), (20, 20, 50), 1)
    cv2.putText(frame, "SECURE ZONE 3", (85, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (100, 100, 255), 1, cv2.LINE_AA)
    
    # Draw radar tracking rings in bottom-right corner
    center_radar = (540, 380)
    for r in range(30, 90, 30):
        # Pulsing circle
        alpha_pulse = abs(np.sin(t * 2 - r/20))
        cv2.circle(frame, center_radar, r, (0, int(150 * alpha_pulse), 0), 1)
    cv2.line(frame, center_radar, (int(center_radar[0] + 80 * np.cos(t)), int(center_radar[1] + 80 * np.sin(t))), (0, 180, 0), 1)
    
    # Ambient text
    cv2.putText(frame, "CAM-01_EAST_WING", (20, 455), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (120, 120, 120), 1, cv2.LINE_AA)
    cv2.putText(frame, "REC [SECURE STREAM]", (500, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 255) if int(t) % 2 == 0 else (100, 100, 100), 1, cv2.LINE_AA)
    
    return frame

@app.websocket("/ws/surveillance")
async def ws_surveillance(websocket: WebSocket):
    await ws_manager.connect(websocket)
    
    # Open default webcam (Camera Index 0)
    cap = None
    try:
        # We attempt to open the webcam
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            print("[Surveillance Feed] Physical webcam successfully opened.")
        else:
            print("[Surveillance Feed] Webcam not detected. Launching synthetic office stream.")
            cap = None
    except Exception as e:
        print(f"[Surveillance Feed] Error checking webcam: {e}. Defaulting to synthetic.")
        cap = None
        
    start_time = time.time()
    
    try:
        while True:
            # Check for incoming configuration message from client if any
            try:
                # Non-blocking read to see if client sent settings toggles
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                new_settings = json.loads(data)
                print(f"[Surveillance Feed] Received setting update from client: {new_settings}")
                system_settings.update(new_settings)
            except asyncio.TimeoutError:
                pass # No messages, keep streaming
            except Exception as e:
                print(f"[Surveillance Feed] Error parsing client config: {e}")

            # Grab frame
            frame = None
            if cap is not None:
                ret, raw_frame = cap.read()
                if ret:
                    # Mirror frame for webcam natural view
                    frame = cv2.flip(raw_frame, 1)
                else:
                    print("[Surveillance Feed] Failed to read from webcam, fallback to synthetic.")
                    frame = generate_synthetic_office_frame(time.time() - start_time)
            else:
                frame = generate_synthetic_office_frame(time.time() - start_time)

            # Process frame through AI pipeline
            processed_frame, telemetry = ai_runner.process_frame(frame, system_settings)
            
            # Encode frame to JPEG
            _, buffer = cv2.imencode('.jpg', processed_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            jpg_as_text = base64.b64encode(buffer).decode('utf-8')
            
            # Formulate payload
            payload = {
                "frame": f"data:image/jpeg;base64,{jpg_as_text}",
                "telemetry": telemetry
            }
            
            # Send to websocket
            await websocket.send_json(payload)
            
            # Stream pacing (roughly 15 FPS)
            await asyncio.sleep(0.066)
            
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"[Surveillance Feed] Connection loop error: {e}")
        ws_manager.disconnect(websocket)
    finally:
        if cap is not None:
            cap.release()
            print("[Surveillance Feed] Physical webcam released.")

@app.on_event("startup")
async def startup_event():
    print("====================================================")
    print("VISIONTRACK AI SYSTEM STARTUP COMPLETE")
    print("REST Server listening on: http://localhost:8000")
    print("WebSocket Streaming: ws://localhost:8000/ws/surveillance")
    print("====================================================")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
