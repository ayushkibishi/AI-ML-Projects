# Setup Instructions - VisionTrack AI

Follow these guidelines to configure and run the VisionTrack AI system locally or in containerized environments.

---

## 1. Local Development Setup (Manual)

### Backend Setup (FastAPI & AI)
1. Navigate to the root directory `AI Employee Activity Monitoring System/`.
2. Activate the Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
3. Install the dependencies:
   ```bash
   pip install fastapi uvicorn opencv-python mediapipe firebase-admin ultralytics pydantic python-multipart jinja2 passlib pyjwt
   ```
4. Start the backend:
   ```bash
   python backend/main.py
   ```
   The backend will run on `http://localhost:8000`. You can access the API documentation at `http://localhost:8000/docs`.

### Frontend Setup (Next.js 15)
1. Navigate to the `frontend/` directory.
2. Install npm dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

## 2. Firebase Integration (Optional)

By default, the application runs in **Local Demo Mode** (using an in-memory database and SQLite) so it can be evaluated instantly without setup. To connect your Firebase project:

1. Create a Firebase project at the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Cloud Firestore** and **Authentication**.
3. Generate a new Private Key:
   - Go to **Project Settings** > **Service Accounts**.
   - Click **Generate New Private Key**.
   - Save the downloaded JSON file as `backend/firebase_key.json`.
4. The system will automatically detect the file and use Firestore to sync employees, check-ins, and security logs!

---

## 3. Running with Docker Compose

If you have Docker installed, you can spin up the entire system (both frontend and backend) with a single command:

```bash
docker-compose up --build
```

- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:8000`

---

## 4. Troubleshooting Windows ML Libraries
- If OpenCV complains about missing C++ DLLs, ensure you have the [Visual C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170) installed.
- MediaPipe or YOLOv8 running on CPU will default to fallback configurations if thermal thresholds or thread counts are exceeded. You can toggle performance settings directly inside the **Surveillance Panel** under diagnostic gauges.
