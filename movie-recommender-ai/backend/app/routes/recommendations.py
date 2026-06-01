import asyncio
import pandas as pd
from fastapi import APIRouter, Depends, Query, Request
from app.auth import get_current_user
from app.database import db_client
from app.tmdb import tmdb_client

router = APIRouter(prefix="/recommend", tags=["Recommendations"])

def clean_nan(obj):
    if isinstance(obj, list):
        return [clean_nan(x) for x in obj]
    elif isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    elif isinstance(obj, float) and (obj != obj or obj == float('inf') or obj == float('-inf')):
        return None
    return obj


@router.get("/")
async def get_user_recommendations(
    request: Request,
    limit: int = Query(10, ge=1, le=50),
    w_lstm: float = Query(0.4, description="Weight for LSTM RNN predictions"),
    w_cf: float = Query(0.3, description="Weight for Collaborative Filtering similarity"),
    w_content: float = Query(0.3, description="Weight for Content-Based genre matching")
):
    """
    Retrieves personalized top hybrid recommendations for the authenticated user.
    """
    # 1. Access current user (optional - if guest, fall back to guest)
    try:
        user = get_current_user(await Depends(get_current_user))
        user_id = user["uid"]
    except Exception:
        # Fallback for unauthenticated requests or development convenience
        # We can detect the Authorization header manually, or fallback to guest
        # If there is a header, we attempt to parse it. Let's try to fetch user if possible
        # but to make testing easy we will default to a guest user if no auth is sent.
        # However, FastAPI Depend will block if auto_error=True.
        # But we made HTTPBearer(auto_error=False) inside auth.py. Let's check headers.
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            # Verify via mock or firebase
            if db_client.use_firebase:
                try:
                    from firebase_admin import auth
                    decoded = auth.verify_id_token(token)
                    user_id = decoded["uid"]
                except Exception:
                    user_id = "guest_user"
            else:
                user_id = token.replace("mock-token-", "").strip() or "guest_user"
        else:
            user_id = "guest_user"

    # 2. Get user ratings from DB
    user_ratings = db_client.get_user_ratings(user_id)
    
    # 3. Compute recommendations
    recommender = request.app.state.recommender
    recs = recommender.recommend(
        user_ratings=user_ratings,
        k=limit,
        w_lstm=w_lstm,
        w_cf=w_cf,
        w_content=w_content
    )
    
    # 4. Resolve rich TMDB metadata (posters, ratings) in parallel for the recommendations
    async def enrich_movie(movie):
        # Movie dict has: movieId, title, title_clean, year, genres_list, tmdbId, imdbId, explanation, score
        try:
            metadata = await tmdb_client.fetch_metadata(
                movie_id=movie["movieId"],
                title=movie["title_clean"],
                genres_list=movie["genres_list"],
                tmdb_id=int(movie["tmdbId"]) if not pd.isna(movie["tmdbId"]) else None,
                imdb_id=int(movie["imdbId"]) if not pd.isna(movie["imdbId"]) else None
            )
            movie.update(metadata)
        except Exception as e:
            print(f"Error enriching recommendation {movie['title']}: {e}")
        return movie

    # Concurrently enrich all recommended items
    enriched_recs = await asyncio.gather(*[enrich_movie(rec) for rec in recs])
    
    # Also fetch global popular movies (cold start / trending rail)
    trending_raw = recommender.get_popular_movies(limit)
    
    async def enrich_trending(movie):
        try:
            metadata = await tmdb_client.fetch_metadata(
                movie_id=movie["movieId"],
                title=movie["title_clean"],
                genres_list=movie["genres_list"],
                tmdb_id=int(movie["tmdbId"]) if not pd.isna(movie["tmdbId"]) else None,
                imdb_id=int(movie["imdbId"]) if not pd.isna(movie["imdbId"]) else None
            )
            # Remove pd.NaT/NaN types
            clean_movie = {
                "movieId": int(movie["movieId"]),
                "title": movie["title"],
                "title_clean": movie["title_clean"],
                "year": int(movie["year"]) if pd.notna(movie["year"]) else None,
                "genres": movie["genres_list"],
                "explanation": "Trending worldwide among users.",
                **metadata
            }
            return clean_movie
        except Exception:
            return None

    enriched_trending = await asyncio.gather(*[enrich_trending(m) for m in trending_raw])
    enriched_trending = [m for m in enriched_trending if m is not None]

    return {
        "userId": user_id,
        "recommendations": clean_nan(enriched_recs),
        "trending": clean_nan(enriched_trending)
    }
