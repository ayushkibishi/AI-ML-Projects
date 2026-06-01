# Full-Stack AI Movie Recommendation System

A production-ready, full-stack AI Movie Recommendation System incorporating Deep Learning sequence modeling (LSTM), Collaborative Filtering, and Content-Based Filtering. The system features user authentication, written reviews with real-time NLP sentiment analysis, an interactive chatbot assistant powered by Google Gemini, and a responsive Netflix-inspired glassmorphic React interface.

---

## 🚀 Key Features

1. **Automatic Dataset Management**: Automatically fetches, cleans, and extracts MovieLens datasets (defaults to `ml-latest-small` for development/testing, supports `ml-25m`).
2. **Hybrid Recommendation Engine**:
   - **Deep Learning (LSTM/RNN)**: Learns user chronological watching sequences to predict their next watch.
   - **Collaborative Filtering**: Computes user-user and item-item similarity.
   - **Content-Based Filtering**: Calculates TF-IDF text features on movie genres and tag words.
   - **Explainable AI**: Translates model weights into user-readable explanations (e.g. *"Recommended because you watched similar Sci-Fi movies"*).
3. **NLP Sentiment Analysis**: Uses HuggingFace Transformers (DistilBERT SST-2) to analyze written movie reviews, mapping Positive, Negative, and Neutral percentage gauges in real time.
4. **AI Chatbot Guide**: Integrates the Google Gemini API to recommend, summarize, and answer questions about films while referencing the user's watchlist.
5. **Interactive Data Dashboard**: Features glassmorphic data graphs showing user genre preferences, rating distributions, and activity trends using Recharts.
6. **Robust Firebase / Sandbox Architecture**: Integrates Firebase Auth/Firestore. If credentials are omitted, it transparently falls back to a self-contained local JSON database and mock authenticator, running **completely out-of-the-box with one command**.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Recharts, Lucide Icons.
- **Backend**: FastAPI (Python), Uvicorn, Pydantic, HTTPX.
- **AI / ML**: TensorFlow, Keras, HuggingFace Transformers, Google Generative AI (Gemini SDK), Scikit-Learn, Pandas, NumPy.
- **Database / Auth**: Firebase Admin SDK (Auth + Firestore). Supports local JSON file backup mode.
- **Containerization**: Docker, Docker Compose.

---

## 📂 Project Structure

```
movie-recommender-ai/
├── backend/
│   ├── app/
│   │   ├── routes/                # API routers (auth, movies, recs, chat, admin)
│   │   ├── config.py              # Environment configuration loader
│   │   ├── database.py            # Firebase client / local Mock database
│   │   ├── tmdb.py                # TMDB/OMDB API client & asset fallbacks
│   │   ├── gemini.py              # Google Gemini API connector
│   │   └── auth.py                # Auth dependency (Firebase token verifier)
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/            # Reusable UI elements (Navbar, GlassCard, Skeletons)
│   │   ├── context/               # Auth state context
│   │   ├── pages/                 # UI screens (Home, Watchlist, Chat, Dashboard, Admin, Login)
│   │   ├── services/              # API clients & Firebase client sdk init
│   │   ├── App.jsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── ai_model/
│   ├── dataset_loader.py          # Auto-downloads and cleans MovieLens data
│   ├── train_model.py             # Compiles & trains the LSTM sequence model
│   ├── recommender.py             # Computes hybrid predictions & explanations
│   └── sentiment_analysis.py      # HuggingFace BERT sentiment analyzer
│
├── docker-compose.yml             # System orchestration configuration
└── README.md
```

---

## 🏁 Quick Start with Docker (Recommended)

You can launch the entire ecosystem (both frontend and backend) with a single command. 

```bash
# Clone the repository and navigate to root
cd movie-recommender-ai

# Launch Docker Compose
docker-compose up --build
```

- **Frontend Interface**: Open [http://localhost:3000](http://localhost:3000)
- **FastAPI Documentation (Swagger)**: Open [http://localhost:8000/docs](http://localhost:8000/docs)

*Note: On startup, the backend automatically downloads the MovieLens latest-small dataset (if missing), which takes a few seconds.*

---

## 🔒 Configuration & Environment Variables

Create a `.env` file in the `backend/` directory or add variables directly to your shell:

```env
# Backend Keys
TMDB_API_KEY=your_tmdb_key_here          # Optional: Fetches high-res movie details
OMDB_API_KEY=your_omdb_key_here          # Optional: Fetches IMDb rating metrics
GEMINI_API_KEY=your_gemini_key_here      # Optional: Enables AI chat guide CineMate

# Firebase Service Account (Optional: Falls back to mock database if blank)
FIREBASE_SERVICE_ACCOUNT_PATH=path/to/firebase-service-account.json
# OR
FIREBASE_SERVICE_ACCOUNT_JSON={"type": "service_account", ...}
```

Create a `.env` file in the `frontend/` directory for Vite:

```env
# Frontend API endpoint
VITE_API_URL=http://localhost:8000/api

# Firebase Web configuration (Optional: Falls back to mock login if blank)
VITE_FIREBASE_API_KEY=your_client_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=sender_id
VITE_FIREBASE_APP_ID=app_id
```

---

## 🧠 Recommendation Engine & MLOps

### Sequential LSTM Network Architecture
The sequence recommendation model treats user watching patterns as chronological sentences.
1. **Embedding Layer**: Projects movie tokens ($0 \dots N-1$) into a $32$-dimensional vector space.
2. **LSTM Recurrent Layer**: Processes recent chronological ratings (default history sequence window of $5$) using $64$ LSTM nodes to construct sequential temporal dependencies.
3. **Dense Dense Classifiers**: Predicts the probability of the user enjoying the next movie across the entire MovieLens database.

### Hybrid Score Calculation
The final movie suggestion rankings combine indices from the model components with weighted scores:
$$S_{hybrid} = (w_{lstm} \times S_{lstm}) + (w_{cf} \times S_{cf}) + (w_{content} \times S_{content})$$

### Retraining
The system supports non-blocking retraining. Trigger retraining via the **Admin Dashboard** in the UI, or by making a POST request:
`POST /api/admin/retrain`

This spins up the script in a detached subprocess to prevent event loop locking, computing validation metrics (**Precision@10, Recall@10, RMSE, MAE**) and writing final results to `models/metrics.json`.

---

## 📡 API Reference

### Movies Search & Feed
* `GET /api/movies/search`: Fuzzy searches titles. Supports query params `query`, `genre`, `year`, `min_rating`.
* `GET /api/movies/{movie_id}`: Fetches movie details, merging datasets with TMDB assets.
* `GET /api/movies/{movie_id}/reviews`: Returns written reviews and sentiment averages.
* `POST /api/movies/{movie_id}/review`: Submits review, returning real-time NLP sentiment tagging.

### Watchlist & Ratings
* `GET /api/movies/watchlist/all`: Returns current user'swatchlist.
* `POST /api/movies/watchlist/add`: Adds movie item.
* `DELETE /api/movies/watchlist/remove/{movie_id}`: Removes movie item.
* `POST /api/movies/{movie_id}/rate`: Submits a rating (0.5 to 5.0).

### Predictions & Chat
* `GET /api/recommend/`: Returns custom Top-10 suggestions list (hybrid) and a global Trending list.
* `POST /api/chat/`: Evaluates text prompts via Gemini API, passing the user's watchlist context.

### MLOps & Administration
* `GET /api/admin/stats`: Exposes user count, database entries, and active neural network error metrics.
* `POST /api/admin/retrain`: Triggers background retraining subprocess.
