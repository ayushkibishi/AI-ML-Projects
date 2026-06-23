import logging
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, Dict
from config import Config

# Configure logger for transform module
logger = logging.getLogger("etl.transform")

def transform_dataset(raw_path: Path) -> Dict[str, pd.DataFrame]:
    """
    Cleans and transforms raw Spotify tracks dataset.
    Normalizes schemas for tracks, artists, genres, and their junction tables.
    
    Args:
        raw_path (Path): Path to the raw CSV file.
        
    Returns:
        Dict[str, pd.DataFrame]: Dictionaries containing transformed DataFrames.
    """
    logger.info(f"Loading raw dataset from {raw_path}")
    
    # Load dataset
    df = pd.read_csv(raw_path)
    logger.info(f"Loaded dataset with shape: {df.shape}")
    
    # 1. Clean column list & drop unnecessary index columns
    if 'Unnamed: 0' in df.columns:
        df = df.drop(columns=['Unnamed: 0'])
        logger.debug("Dropped index column 'Unnamed: 0'")
        
    # 2. Handle missing/null values
    # Drop rows with critical nulls (track_id, track_name, artists)
    critical_cols = ['track_id', 'track_name', 'artists']
    null_counts = df[critical_cols].isnull().sum()
    if null_counts.sum() > 0:
        logger.warning(f"Found nulls in critical columns:\n{null_counts}")
        df = df.dropna(subset=critical_cols)
        logger.info(f"Shape after dropping critical nulls: {df.shape}")
        
    # Standardize explicit column as boolean
    df['explicit'] = df['explicit'].astype(bool)
    
    # 3. Clean and process audio features
    # Ensure numerical columns contain numeric data, coerce errors to NaN and fill them
    audio_features = [
        'popularity', 'duration_ms', 'danceability', 'energy', 'key', 
        'loudness', 'mode', 'speechiness', 'acousticness', 'instrumentalness', 
        'liveness', 'valence', 'tempo', 'time_signature'
    ]
    for col in audio_features:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Check for nulls in audio features and fill with mean/median or drop
    feature_nulls = df[audio_features].isnull().sum()
    if feature_nulls.sum() > 0:
        logger.warning(f"Found null values in features:\n{feature_nulls}")
        # Fill missing values with median for popularity and median/mean for others
        for col in audio_features:
            if df[col].isnull().any():
                fill_val = df[col].median()
                df[col] = df[col].fillna(fill_val)
                logger.info(f"Filled nulls in {col} with median value: {fill_val}")
                
    # 4. Feature Engineering
    # Convert duration_ms to duration_min (minutes)
    df['duration_min'] = round(df['duration_ms'] / 60000.0, 3)
    
    # 5. Entity Extraction & Deduplication
    # Because tracks can be in multiple genres, the raw CSV has duplicate track_ids.
    # We will build junction tables for genres and artists.
    
    logger.info("Extracting relational entity mappings...")
    
    # a. Process Genres
    # Compile all unique genres
    unique_genres = df['track_genre'].dropna().unique()
    genres_df = pd.DataFrame({
        'genre_id': range(1, len(unique_genres) + 1),
        'genre_name': unique_genres
    })
    genre_map = dict(zip(genres_df['genre_name'], genres_df['genre_id']))
    
    # Track-Genre relationships
    # Maintain all genre relationships per track_id
    track_genres_raw = df[['track_id', 'track_genre']].drop_duplicates().dropna()
    track_genres_raw['genre_id'] = track_genres_raw['track_genre'].map(genre_map)
    track_genres_df = track_genres_raw[['track_id', 'genre_id']].drop_duplicates()
    
    # b. Process Artists
    # Split artists separated by ';;'
    # We'll build a set of all unique artists
    all_artists = set()
    track_artists_rows = []
    
    # To optimize, iterate over the deduplicated track-artist mappings
    track_artists_raw = df[['track_id', 'artists']].drop_duplicates().dropna()
    
    for idx, row in track_artists_raw.iterrows():
        t_id = row['track_id']
        artists_str = row['artists']
        # Split by double semicolon
        parts = [a.strip() for a in artists_str.split(';;') if a.strip()]
        for artist in parts:
            all_artists.add(artist)
            track_artists_rows.append({'track_id': t_id, 'artist_name': artist})
            
    artists_list = sorted(list(all_artists))
    artists_df = pd.DataFrame({
        'artist_id': range(1, len(artists_list) + 1),
        'artist_name': artists_list
    })
    artist_map = dict(zip(artists_df['artist_name'], artists_df['artist_id']))
    
    # Track-Artist relationships (junction table)
    track_artists_mapped = pd.DataFrame(track_artists_rows)
    track_artists_mapped['artist_id'] = track_artists_mapped['artist_name'].map(artist_map)
    track_artists_df = track_artists_mapped[['track_id', 'artist_id']].drop_duplicates()
    
    # c. Deduplicate Tracks
    # Since tracks are now linked to multiple artists and genres via junction tables,
    # we can safely deduplicate the main tracks table by track_id.
    # When deduplicating, we keep the first occurrence.
    tracks_df = df.drop_duplicates(subset=['track_id'], keep='first').copy()
    
    # Columns to keep in tracks table
    tracks_cols = [
        'track_id', 'track_name', 'album_name', 'popularity', 'duration_ms', 
        'duration_min', 'explicit', 'danceability', 'energy', 'key', 
        'loudness', 'mode', 'speechiness', 'acousticness', 'instrumentalness', 
        'liveness', 'valence', 'tempo', 'time_signature'
    ]
    tracks_df = tracks_df[tracks_cols]
    
    logger.info(f"Deduplicated Tracks count: {tracks_df.shape[0]}")
    logger.info(f"Unique Artists count: {artists_df.shape[0]}")
    logger.info(f"Unique Genres count: {genres_df.shape[0]}")
    logger.info(f"Track-Artist relationships count: {track_artists_df.shape[0]}")
    logger.info(f"Track-Genre relationships count: {track_genres_df.shape[0]}")
    
    # Save transformed datasets to CSV locally for backup/audit trail
    Config.PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    tracks_df.to_csv(Config.PROCESSED_DATA_DIR / "tracks.csv", index=False)
    artists_df.to_csv(Config.PROCESSED_DATA_DIR / "artists.csv", index=False)
    genres_df.to_csv(Config.PROCESSED_DATA_DIR / "genres.csv", index=False)
    track_artists_df.to_csv(Config.PROCESSED_DATA_DIR / "track_artists.csv", index=False)
    track_genres_df.to_csv(Config.PROCESSED_DATA_DIR / "track_genres.csv", index=False)
    
    logger.info("Saved processed CSV backups in data/processed/")
    
    return {
        'tracks': tracks_df,
        'artists': artists_df,
        'genres': genres_df,
        'track_artists': track_artists_df,
        'track_genres': track_genres_df
    }
