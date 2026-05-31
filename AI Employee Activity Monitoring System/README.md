# VisionTrack AI - Smart Office Surveillance & Workspace Intelligence

VisionTrack AI is an ultra-modern, cinematic AI-powered Smart Office Surveillance & Workspace Intelligence operating system. It integrates computer vision analytics, multi-object tracking, body posture estimation, facial recognition, and productivity graphing into a glassmorphism real-time web console.

---

## Key Features

1. **Real-time CCTV Dashboard**: WebSocket frame streamer drawing bounding boxes, skeletons, and diagnostic overlay stats.
2. **Biometric Face Enroller**: Register employees with names and departments. Captures photo snapshots directly from browser webcams or handles local file uploads.
3. **AI Posture & Activity Classifier**: Identifies employees sitting, standing, walking, sleeping at desk, and phone usage.
4. **Threat Warning Alarm System**: Instantly triggers alerts for unauthorized entries, sleeping employees, or prolonged inactivity.
5. **Interactive 3D Holograms**: Implements Three.js models showing floating digital wireframe office maps and neural networks.
6. **Workspace Data Charts**: Area, bar, and radial charts illustrating attendance curves, room occupancy, and activity distributions.
7. **AI Voice Command Terminal**: Utilizes Web Speech recognition to execute actions and speak back reports.
8. **Exportable Intelligence Reports**: Generates automated summaries of office telemetry for text logs download.
9. **Firebase Firestore Database**: Syncs employee credentials and security logs to the cloud, with smart local SQLite/in-memory fallbacks (Zero-Config First).

---

## Quick Start (Docker)

Spin up both services instantly:
```bash
docker-compose up --build
```
- **Frontend Panel**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`

For manual setups, see [docs/SETUP_INSTRUCTIONS.md](file:///d:/ayush/AI%20Employee%20Activity%20Monitoring%20System/docs/SETUP_INSTRUCTIONS.md).

---

## Demo Credentials (Demo Mode)

Access the admin dashboard:
- **Email**: `admin@visiontrack.ai`
- **Password**: `password123`

---

## Project Structure

```
visiontrack-ai/
├── frontend/                     # Next.js 15 App (Tailwind CSS, Framer Motion, Recharts)
│   ├── app/                      # Page routing structure
│   ├── components/               # Cyberpunk UI layout components
│   └── 3d/                       # Three.js globe & blueprints
├── backend/                      # FastAPI REST & WebSockets Server
│   ├── api/                      # REST routers & controllers
│   ├── websocket/                # Connection manager
│   ├── services/                 # AI Orchestrator & Report compiling
│   └── firebase/                 # Firestore database connections
├── ai/                           # AI Inference Subsystem
│   ├── yolo/                     # YOLOv8 object detection wrapper
│   ├── pose/                     # MediaPipe skeletal mesh pipeline
│   ├── face/                     # Enrolling and face-recognition comparators
│   ├── tracking/                 # Multi-person Centroid-IoU tracker
│   └── activity/                 # Rules-based activity classifiers
├── docs/                         # Developer manuals
└── docker/                       # Container files
```
