from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from pydantic import BaseModel, Field
from typing import Optional, List
import pandas as pd
from app.auth import get_current_user
from app.database import db_client
from app.tmdb import tmdb_client

router = APIRouter(prefix="/movies", tags=["Movies"])

# --- Pydantic Schemas for Requests ---
class WatchlistAddRequest(BaseModel):
    movieId: int
    title: str
    tmdbId: Optional[int] = None

class ToggleStateRequest(BaseModel):
    value: bool

class RateRequest(BaseModel):
    rating: float = Field(..., ge=0.5, le=5.0)

class ReviewRequest(BaseModel):
    content: str = Field(..., min_length=3)

# --- Routes ---

@router.get("/search")
async def search_movies(
    request: Request,
    query: Optional[str] = Query(None, description="Fuzzy search title"),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    year: Optional[int] = Query(None, description="Filter by exact year"),
    min_rating: Optional[float] = Query(None, description="Filter by minimum global rating"),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """
    Searches the MovieLens database with filtering options.
    """
    recommender = request.app.state.recommender
    df = recommender.movies_df.copy()
    
    # 1. Fuzzy search on title
    if query:
        # Match either original title "Toy Story (1995)" or cleaned title "Toy Story"
        df = df[df['title'].str.contains(query, case=False, na=False) | 
                df['title_clean'].str.contains(query, case=False, na=False)]
                
    # 2. Genre filter
    if genre:
        df = df[df['genres_list'].apply(lambda genres: any(g.lower() == genre.lower() for g in genres))]
        
    # 3. Year filter
    if year:
        df = df[df['year'] == year]
        
    # Sort popular movies first (based on ratings count if available in dataset,
    # or simple movieId descending/ascending)
    total_count = len(df)
    
    # Slice/Paginate
    sliced = df.iloc[skip:skip+limit]
    
    # Format return list
    results = []
    for _, row in sliced.iterrows():
        movie_dict = {
            "movieId": int(row["movieId"]),
            "title": row["title"],
            "title_clean": row["title_clean"],
            "year": int(row["year"]) if pd.notna(row["year"]) else None,
            "genres": row["genres_list"],
            "tmdbId": int(row["tmdbId"]) if pd.notna(row["tmdbId"]) else None,
            "imdbId": int(row["imdbId"]) if pd.notna(row["imdbId"]) else None,
            # Placeholder poster until detailed request is made, to speed up search list
            "poster_url": tmdb_client._get_fallback_poster(row["genres_list"])
        }
        results.append(movie_dict)
        
    return {
        "total": total_count,
        "results": results,
        "limit": limit,
        "skip": skip
    }

@router.get("/genres")
async def get_all_genres(request: Request):
    """
    Returns a unique list of all movie genres in the dataset.
    """
    recommender = request.app.state.recommender
    genres_set = set()
    for genres in recommender.movies_df['genres_list']:
        for g in genres:
            if g and g != "(no genres listed)":
                genres_set.add(g)
    return sorted(list(genres_set))

@router.get("/{movie_id}")
async def get_movie_details(request: Request, movie_id: int):
    """
    Retrieves full details of a specific movie, merging metadata from TMDB/OMDb.
    """
    recommender = request.app.state.recommender
    match = recommender.movies_df[recommender.movies_df['movieId'] == movie_id]
    
    if match.empty:
        raise HTTPException(status_code=404, detail="Movie not found in database.")
        
    row = match.iloc[0]
    
    # Fetch rich metadata (overview, poster, rating, runtime, trailer)
    metadata = await tmdb_client.fetch_metadata(
        movie_id=movie_id,
        title=row["title_clean"],
        genres_list=row["genres_list"],
        tmdb_id=int(row["tmdbId"]) if not pd.isna(row["tmdbId"]) else None,
        imdb_id=int(row["imdbId"]) if not pd.isna(row["imdbId"]) else None
    )
    
    return {
        "movieId": movie_id,
        "title": row["title"],
        "title_clean": row["title_clean"],
        "year": int(row["year"]) if pd.notna(row["year"]) else None,
        "genres": row["genres_list"],
        "tmdbId": int(row["tmdbId"]) if pd.notna(row["tmdbId"]) else None,
        "imdbId": int(row["imdbId"]) if pd.notna(row["imdbId"]) else None,
        **metadata
    }

# --- Watchlist Endpoints ---

@router.get("/watchlist/all")
async def get_watchlist(current_user: dict = Depends(get_current_user)):
    """Retrieves current user's watchlist."""
    watchlist = db_client.get_watchlist(current_user["uid"])
    return watchlist

@router.post("/watchlist/add")
async def add_to_watchlist(req: WatchlistAddRequest, current_user: dict = Depends(get_current_user)):
    """Adds a movie to the watchlist."""
    watchlist = db_client.add_to_watchlist(
        user_id=current_user["uid"],
        movie_id=req.movieId,
        movie_title=req.title,
        tmdb_id=req.tmdbId
    )
    return {"status": "success", "watchlist": watchlist}

@router.delete("/watchlist/remove/{movie_id}")
async def remove_from_watchlist(movie_id: int, current_user: dict = Depends(get_current_user)):
    """Removes a movie from the watchlist."""
    watchlist = db_client.remove_from_watchlist(current_user["uid"], movie_id)
    return {"status": "success", "watchlist": watchlist}

@router.post("/watchlist/{movie_id}/watched")
async def toggle_watched(movie_id: int, req: ToggleStateRequest, current_user: dict = Depends(get_current_user)):
    """Toggles the watched status of a watchlist movie."""
    watchlist = db_client.update_watchlist_item(current_user["uid"], movie_id, {"watched": req.value})
    return {"status": "success", "watchlist": watchlist}

@router.post("/watchlist/{movie_id}/favorite")
async def toggle_favorite(movie_id: int, req: ToggleStateRequest, current_user: dict = Depends(get_current_user)):
    """Toggles the favorite status of a watchlist movie."""
    watchlist = db_client.update_watchlist_item(current_user["uid"], movie_id, {"favorite": req.value})
    return {"status": "success", "watchlist": watchlist}

# --- Ratings & Reviews Endpoints ---

@router.post("/{movie_id}/rate")
async def rate_movie(movie_id: int, req: RateRequest, current_user: dict = Depends(get_current_user)):
    """Submits a movie rating and triggers real-time preference updates."""
    db_client.submit_rating(current_user["uid"], movie_id, req.rating)
    return {"status": "success", "message": f"Rating of {req.rating} submitted successfully."}

@router.post("/{movie_id}/review")
async def review_movie(request: Request, movie_id: int, req: ReviewRequest, current_user: dict = Depends(get_current_user)):
    """Submits a written review and performs real-time NLP Sentiment Analysis."""
    analyzer = request.app.state.sentiment_analyzer
    sentiment_scores = analyzer.analyze(req.content)
    
    review = db_client.add_movie_review(
        movie_id=movie_id,
        user_id=current_user["uid"],
        user_email=current_user["email"],
        content=req.content,
        sentiment_scores=sentiment_scores
    )
    return {"status": "success", "review": review}

@router.get("/{movie_id}/reviews")
async def get_reviews(movie_id: int):
    """Retrieves all reviews and sentiment stats for a specific movie."""
    reviews = db_client.get_movie_reviews(movie_id)
    
    # Calculate summary sentiment stats
    pos_sum, neg_sum, neu_sum = 0.0, 0.0, 0.0
    count = len(reviews)
    
    for r in reviews:
        s = r.get("sentiment", {})
        pos_sum += s.get("positive", 0.0)
        neg_sum += s.get("negative", 0.0)
        neu_sum += s.get("neutral", 0.0)
        
    summary = {
        "count": count,
        "average_sentiment": {
            "positive": round(pos_sum / count, 4) if count > 0 else 0.0,
            "negative": round(neg_sum / count, 4) if count > 0 else 0.0,
            "neutral": round(neu_sum / count, 4) if count > 0 else 0.0
        }
    }
    
    return {
        "reviews": reviews,
        "summary": summary
    }
