import logging
import pandas as pd
from typing import Dict
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from config import Config

# Configure logger for load module
logger = logging.getLogger("etl.load")

def get_db_engine() -> Engine:
    """Creates and returns a SQLAlchemy engine."""
    db_url = Config.get_db_url()
    # Mask password for logging
    masked_url = db_url.replace(Config.DB_PASSWORD, "****")
    logger.debug(f"Connecting to database: {masked_url}")
    return create_engine(db_url)

def create_schema(engine: Engine) -> None:
    """Creates the database schema if it doesn't exist."""
    logger.info("Initializing database schema...")
    
    schema_sql = """
    CREATE TABLE IF NOT EXISTS genres (
        genre_id INT PRIMARY KEY,
        genre_name VARCHAR(100) UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artists (
        artist_id INT PRIMARY KEY,
        artist_name VARCHAR(255) UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracks (
        track_id VARCHAR(50) PRIMARY KEY,
        track_name VARCHAR(500) NOT NULL,
        album_name VARCHAR(500),
        popularity INT,
        duration_ms INT,
        duration_min NUMERIC(8, 3),
        explicit BOOLEAN,
        danceability NUMERIC(4, 3),
        energy NUMERIC(4, 3),
        key INT,
        loudness NUMERIC(6, 3),
        mode INT,
        speechiness NUMERIC(4, 3),
        acousticness NUMERIC(4, 3),
        instrumentalness NUMERIC(4, 3),
        liveness NUMERIC(4, 3),
        valence NUMERIC(4, 3),
        tempo NUMERIC(6, 3),
        time_signature INT
    );

    CREATE TABLE IF NOT EXISTS track_artists (
        track_id VARCHAR(50) REFERENCES tracks(track_id) ON DELETE CASCADE,
        artist_id INT REFERENCES artists(artist_id) ON DELETE CASCADE,
        PRIMARY KEY (track_id, artist_id)
    );

    CREATE TABLE IF NOT EXISTS track_genres (
        track_id VARCHAR(50) REFERENCES tracks(track_id) ON DELETE CASCADE,
        genre_id INT REFERENCES genres(genre_id) ON DELETE CASCADE,
        PRIMARY KEY (track_id, genre_id)
    );
    """
    
    # Create the flattened view for ML models and downstream analysis
    view_sql = """
    CREATE OR REPLACE VIEW spotify_tracks_flat AS
    SELECT 
        t.track_id,
        t.track_name,
        t.album_name,
        t.popularity,
        t.duration_ms,
        t.duration_min,
        t.explicit,
        t.danceability,
        t.energy,
        t.key,
        t.loudness,
        t.mode,
        t.speechiness,
        t.acousticness,
        t.instrumentalness,
        t.liveness,
        t.valence,
        t.tempo,
        t.time_signature,
        string_agg(DISTINCT a.artist_name, ';;') as artists,
        string_agg(DISTINCT g.genre_name, ';;') as genres
    FROM tracks t
    LEFT JOIN track_artists ta ON t.track_id = ta.track_id
    LEFT JOIN artists a ON ta.artist_id = a.artist_id
    LEFT JOIN track_genres tg ON t.track_id = tg.track_id
    LEFT JOIN genres g ON tg.genre_id = g.genre_id
    GROUP BY 
        t.track_id, t.track_name, t.album_name, t.popularity, t.duration_ms, 
        t.duration_min, t.explicit, t.danceability, t.energy, t.key, 
        t.loudness, t.mode, t.speechiness, t.acousticness, t.instrumentalness, 
        t.liveness, t.valence, t.tempo, t.time_signature;
    """
    
    with engine.begin() as conn:
        conn.execute(text(schema_sql))
        conn.execute(text(view_sql))
        
    logger.info("Database schema and view created successfully.")

def truncate_tables(engine: Engine) -> None:
    """Truncates all tables in correct dependency order to allow fresh reload."""
    logger.info("Truncating database tables for a fresh reload...")
    truncate_sql = """
        TRUNCATE TABLE track_genres, track_artists, tracks, artists, genres CASCADE;
    """
    with engine.begin() as conn:
        conn.execute(text(truncate_sql))
    logger.info("Database tables truncated successfully.")

def load_data_to_postgres(dfs: Dict[str, pd.DataFrame], engine: Engine) -> None:
    """
    Loads transformed DataFrames to PostgreSQL.
    
    Args:
        dfs (Dict[str, pd.DataFrame]): Dictionary of DataFrames.
        engine (Engine): Database engine.
    """
    # 1. Truncate tables for clean load (full refresh pattern)
    truncate_tables(engine)
    
    # 2. Insert data into independent tables (genres, artists, tracks)
    logger.info("Loading 'genres' table...")
    dfs['genres'].to_sql(
        name='genres', 
        con=engine, 
        if_exists='append', 
        index=False, 
        method='multi', 
        chunksize=5000
    )
    logger.info(f"Loaded {len(dfs['genres'])} genres.")

    logger.info("Loading 'artists' table...")
    dfs['artists'].to_sql(
        name='artists', 
        con=engine, 
        if_exists='append', 
        index=False, 
        method='multi', 
        chunksize=5000
    )
    logger.info(f"Loaded {len(dfs['artists'])} artists.")

    logger.info("Loading 'tracks' table...")
    dfs['tracks'].to_sql(
        name='tracks', 
        con=engine, 
        if_exists='append', 
        index=False, 
        method='multi', 
        chunksize=2000 # smaller chunk size for tracks due to column count
    )
    logger.info(f"Loaded {len(dfs['tracks'])} tracks.")

    # 3. Insert data into junction tables (track_artists, track_genres)
    logger.info("Loading 'track_artists' table...")
    dfs['track_artists'].to_sql(
        name='track_artists', 
        con=engine, 
        if_exists='append', 
        index=False, 
        method='multi', 
        chunksize=5000
    )
    logger.info(f"Loaded {len(dfs['track_artists'])} track-artist relationships.")

    logger.info("Loading 'track_genres' table...")
    dfs['track_genres'].to_sql(
        name='track_genres', 
        con=engine, 
        if_exists='append', 
        index=False, 
        method='multi', 
        chunksize=5000
    )
    logger.info(f"Loaded {len(dfs['track_genres'])} track-genre relationships.")

    logger.info("All data successfully loaded into PostgreSQL.")
