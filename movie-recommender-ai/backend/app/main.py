import os
import sys

# Adjust sys.path to allow top-level imports of 'app' and root modules
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
    
root_dir = os.path.dirname(backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

ai_model_dir = os.path.join(root_dir, "ai_model")
if ai_model_dir not in sys.path:
    sys.path.insert(0, ai_model_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# Import routes
from app.routes import auth, movies, recommendations, chat, admin

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend services for the AI Movie Recommendation System, incorporating Collaborative Filtering, Content-Based Filtering, LSTM sequence modelling, and sentiment analysis.",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
origins = [
    "http://localhost:3000",   # React Dev port
    "http://localhost:5173",   # Vite default port
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "*"                        # Allows all for production-ready cross-origins
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    print("FastAPI Application Starting Up...")
    
    # 1. Initialize Recommendation Engine in memory (takes care of MovieLens dataset download)
    from ai_model.recommender import HybridRecommender
    print("Initializing Hybrid Recommender (this may download the MovieLens dataset)...")
    app.state.recommender = HybridRecommender(dataset_type=settings.DATASET_TYPE)
    print("Hybrid Recommender initialized.")
    
    # 2. Initialize Sentiment Analysis model in memory
    from ai_model.sentiment_analysis import SentimentAnalyzer
    print("Initializing Sentiment Analyzer...")
    app.state.sentiment_analyzer = SentimentAnalyzer()
    print("Sentiment Analyzer initialized.")
    
    print("Startup checks complete. API is ready to receive requests.")

@app.on_event("shutdown")
async def shutdown_event():
    print("FastAPI Application Shutting Down...")

# Mount routers
app.include_router(auth.router, prefix="/api")
app.include_router(movies.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

@app.get("/")
async def root():
    return {
        "message": "Welcome to the AI Movie Recommendation System API!",
        "status": "healthy",
        "docs": "/docs",
        "version": settings.VERSION
    }
