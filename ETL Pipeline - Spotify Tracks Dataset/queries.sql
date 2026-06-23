-- =====================================================================
-- Spotify Tracks Dataset - Analytical & Downstream ML Queries
-- =====================================================================

-- ---------------------------------------------------------------------
-- Part 1: Analytical Queries
-- ---------------------------------------------------------------------

-- Query 1: Top 10 most popular tracks with artists and genres
-- Uses the flattened view to compile comma-separated lists of artists/genres
SELECT 
    track_name, 
    popularity, 
    artists, 
    genres,
    album_name,
    duration_min
FROM spotify_tracks_flat
ORDER BY popularity DESC, track_name ASC
LIMIT 10;


-- Query 2: Top 10 genres by average track popularity
-- Group tracks by genres and calculate avg popularity
SELECT 
    g.genre_name,
    COUNT(tg.track_id) as track_count,
    ROUND(AVG(t.popularity), 2) as average_popularity,
    ROUND(AVG(t.energy), 3) as average_energy,
    ROUND(AVG(t.danceability), 3) as average_danceability
FROM genres g
JOIN track_genres tg ON g.genre_id = tg.genre_id
JOIN tracks t ON tg.track_id = t.track_id
GROUP BY g.genre_name
HAVING COUNT(tg.track_id) >= 100 -- Filter out sparse genres
ORDER BY average_popularity DESC
LIMIT 10;


-- Query 3: Top 10 most active artists by track count and average popularity
SELECT 
    a.artist_name,
    COUNT(ta.track_id) as track_count,
    ROUND(AVG(t.popularity), 2) as average_popularity,
    ROUND(AVG(t.danceability), 3) as average_danceability
FROM artists a
JOIN track_artists ta ON a.artist_id = ta.artist_id
JOIN tracks t ON ta.track_id = t.track_id
GROUP BY a.artist_name
ORDER BY track_count DESC, average_popularity DESC
LIMIT 10;


-- Query 4: Audio feature profile by genre (Danceability vs Energy vs Valence)
-- Compiles the average audio profile per genre to understand mood profiles.
SELECT 
    g.genre_name,
    ROUND(AVG(t.danceability), 3) as avg_danceability,
    ROUND(AVG(t.energy), 3) as avg_energy,
    ROUND(AVG(t.valence), 3) as avg_valence,
    ROUND(AVG(t.tempo), 2) as avg_tempo_bpm,
    ROUND(AVG(t.loudness), 2) as avg_loudness_db
FROM genres g
JOIN track_genres tg ON g.genre_id = tg.genre_id
JOIN tracks t ON tg.track_id = t.track_id
GROUP BY g.genre_name
ORDER BY avg_danceability DESC
LIMIT 15;


-- ---------------------------------------------------------------------
-- Part 2: Downstream ML Model Preparation Views & Queries
-- ---------------------------------------------------------------------

-- View for ML Models: Predict popularity based on audio features and metadata
-- Converts BOOLEAN to INT (1/0) and cleans columns for standard ML ingestion
CREATE OR REPLACE VIEW spotify_ml_prep AS
SELECT 
    t.track_id,
    t.popularity as target_popularity, -- Target variable (regression/classification)
    CASE WHEN t.popularity > 50 THEN 1 ELSE 0 END as target_is_popular, -- Target variable (binary classification)
    t.duration_min,
    CASE WHEN t.explicit THEN 1 ELSE 0 END as explicit_binary,
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
    -- Extract a primary genre for one-hot encoding or grouping in python
    (
        SELECT g_inner.genre_name 
        FROM track_genres tg_inner
        JOIN genres g_inner ON tg_inner.genre_id = g_inner.genre_id
        WHERE tg_inner.track_id = t.track_id
        LIMIT 1
    ) as primary_genre
FROM tracks t;

-- Query to verify the ML prep view columns and sample data
SELECT * 
FROM spotify_ml_prep
LIMIT 5;
