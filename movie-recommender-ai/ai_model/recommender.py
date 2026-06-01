import os
import json
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import tensorflow as tf
from dataset_loader import MovieLensDatasetLoader

class HybridRecommender:
    def __init__(self, dataset_type: str = "small", seq_length: int = 5):
        self.seq_length = seq_length
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.models_dir = os.path.join(base_dir, "models")
        
        # Load dataset
        self.loader = MovieLensDatasetLoader(dataset_type=dataset_type)
        self.movies_df = self.loader.get_merged_movie_data()
        self.ratings_df = self.loader.load_ratings()
        
        # Load mappings and model
        self.movie_to_idx = {}
        self.idx_to_movie = {}
        self.lstm_model = None
        
        self.load_lstm_structures()
        self.build_content_similarity()
        self.build_cf_similarity()

    def load_lstm_structures(self):
        movie_to_idx_path = os.path.join(self.models_dir, "movie_to_idx.json")
        idx_to_movie_path = os.path.join(self.models_dir, "idx_to_movie.json")
        model_path = os.path.join(self.models_dir, "recommender_lstm.h5")
        
        if os.path.exists(movie_to_idx_path) and os.path.exists(idx_to_movie_path):
            with open(movie_to_idx_path, "r") as f:
                self.movie_to_idx = {int(k): int(v) for k, v in json.load(f).items()}
            with open(idx_to_movie_path, "r") as f:
                self.idx_to_movie = {int(k): int(v) for k, v in json.load(f).items()}
                
        if os.path.exists(model_path):
            try:
                # Load model without loading weights if custom objects are needed,
                # but standard LSTM model should load fine.
                self.lstm_model = tf.keras.models.load_model(model_path)
                print("LSTM recommender model loaded successfully.")
            except Exception as e:
                print(f"Error loading LSTM model: {e}. Sequenced recommendations will fallback to CF/Content.")
        else:
            print("No LSTM model found. Run train_model.py first.")

    def build_content_similarity(self):
        """
        Creates TF-IDF matrix for content features (genres + tags) and computes similarity.
        """
        print("Building Content-Based Similarity matrix...")
        # Create metadata string for each movie
        # Combining genres list and tags list
        self.movies_df['metadata_text'] = self.movies_df.apply(
            lambda row: f"{' '.join(row['genres_list'])} {row['tag']}".strip(), axis=1
        )
        
        # Use TF-IDF
        self.tfidf = TfidfVectorizer(stop_words='english', max_features=5000)
        self.tfidf_matrix = self.tfidf.fit_transform(self.movies_df['metadata_text'].fillna(""))
        
        # We don't store the full N x N matrix in memory to save space if dataset is large,
        # but for small dataset we can compute it on the fly or pre-calculate query items.
        self.num_movies_content = self.tfidf_matrix.shape[0]

    def build_cf_similarity(self):
        """
        Computes item-item collaborative filtering similarity.
        """
        print("Building Collaborative Filtering Item-Item Similarity matrix...")
        # Create user-item matrix
        # For memory efficiency, we use only movies that have ratings
        # Pivot table
        self.user_item_matrix = self.ratings_df.pivot(
            index='userId', columns='movieId', values='rating'
        ).fillna(0)
        
        # Calculate item-item cosine similarity
        # Fill missing ratings with 0
        ratings_matrix = self.user_item_matrix.values
        # Substract mean rating to do adjusted cosine similarity (centered cosine)
        mean_user_ratings = np.nanmean(np.where(ratings_matrix == 0, np.nan, ratings_matrix), axis=1)
        mean_user_ratings = np.nan_to_num(mean_user_ratings, nan=0)
        
        ratings_centered = np.zeros_like(ratings_matrix)
        for i in range(ratings_matrix.shape[0]):
            mask = ratings_matrix[i] > 0
            ratings_centered[i, mask] = ratings_matrix[i, mask] - mean_user_ratings[i]
            
        # Cosine similarity between columns (items)
        # Note: Item matrix is Shape: (num_movies, num_users) for similarity calculation
        self.cf_item_similarity = cosine_similarity(ratings_centered.T)
        self.cf_movie_ids = list(self.user_item_matrix.columns)
        self.cf_movie_id_to_idx = {m_id: idx for idx, m_id in enumerate(self.cf_movie_ids)}

    def get_content_scores(self, user_history_ids: list) -> np.ndarray:
        """
        Calculates content recommendation scores for all movies based on similarity to watched list.
        """
        scores = np.zeros(len(self.movies_df))
        if not user_history_ids:
            return scores
            
        # Find indices of history movies in self.movies_df
        history_indices = self.movies_df[self.movies_df['movieId'].isin(user_history_ids)].index.tolist()
        if not history_indices:
            return scores
            
        # Calculate cosine similarity of all movies to history movies
        sim = cosine_similarity(self.tfidf_matrix, self.tfidf_matrix[history_indices])
        # Average similarity across all watched movies
        scores = sim.mean(axis=1)
        return scores

    def get_cf_scores(self, user_ratings: dict) -> np.ndarray:
        """
        Calculates item-item collaborative filtering scores.
        :param user_ratings: Dict of {movieId: rating} representing current user history and ratings.
        """
        scores = np.zeros(len(self.movies_df))
        if not user_ratings:
            return scores
            
        # Map ratings to array
        cf_indices = []
        ratings_val = []
        for m_id, rating in user_ratings.items():
            if m_id in self.cf_movie_id_to_idx:
                cf_indices.append(self.cf_movie_id_to_idx[m_id])
                ratings_val.append(rating - 3.0) # Center the rating around neutral
                
        if not cf_indices:
            return scores
            
        # Compute scores: Weighted average of similarities
        # Shape of CF sim: (num_cf_movies, num_cf_movies)
        # We select the columns matching user's watched items
        sim_cols = self.cf_item_similarity[:, cf_indices] # shape: (num_cf_movies, len(cf_indices))
        
        # Dot product with centered ratings
        weighted_sums = np.dot(sim_cols, np.array(ratings_val))
        sum_of_similarities = np.abs(sim_cols).sum(axis=1) + 1e-9
        
        cf_scores_raw = weighted_sums / sum_of_similarities
        
        # Map CF scores back to the full movie dataframe layout
        cf_movie_id_scores = dict(zip(self.cf_movie_ids, cf_scores_raw))
        
        for idx, row in self.movies_df.iterrows():
            m_id = row['movieId']
            if m_id in cf_movie_id_scores:
                # Normalize CF score to [0, 1] range roughly
                scores[idx] = (cf_movie_id_scores[m_id] + 2) / 4.0
                scores[idx] = np.clip(scores[idx], 0.0, 1.0)
                
        return scores

    def get_lstm_scores(self, user_history_ids: list) -> np.ndarray:
        """
        Predicts next movie probabilities using the trained LSTM model.
        """
        scores = np.zeros(len(self.movies_df))
        if self.lstm_model is None or not user_history_ids or not self.movie_to_idx:
            return scores
            
        # Map user history to model indices
        history_indices = [self.movie_to_idx[m_id] for m_id in user_history_ids if m_id in self.movie_to_idx]
        
        if not history_indices:
            return scores
            
        # Slice / Pad history to match model seq_length
        if len(history_indices) >= self.seq_length:
            input_seq = history_indices[-self.seq_length:]
        else:
            # Pad with 0s (masking will ignore it)
            input_seq = [0] * (self.seq_length - len(history_indices)) + history_indices
            
        input_arr = np.array([input_seq]) # batch size 1
        
        # Predict next movie index probabilities
        preds = self.lstm_model.predict(input_arr, verbose=0)[0]
        
        # Map probabilities back to the full movies dataframe layout
        for idx, row in self.movies_df.iterrows():
            m_id = row['movieId']
            if m_id in self.movie_to_idx:
                model_idx = self.movie_to_idx[m_id]
                scores[idx] = preds[model_idx]
                
        # Normalize to [0, 1]
        max_score = scores.max()
        if max_score > 0:
            scores = scores / max_score
            
        return scores

    def get_popular_movies(self, k: int = 10) -> list:
        """
        Fallback logic: returns popular movies sorted by average rating and number of reviews.
        """
        stats = self.ratings_df.groupby('movieId').agg(
            rating_mean=('rating', 'mean'),
            rating_count=('rating', 'count')
        ).reset_index()
        
        # Calculate a weighted score
        # Weighted Rating (WR) = (v / (v+m)) * R + (m / (v+m)) * C
        # where v is number of reviews, m is minimum reviews required, R is average rating, C is mean across all movies
        C = stats['rating_mean'].mean()
        m = 20 # Threshold review count
        
        stats['weighted_score'] = stats.apply(
            lambda x: (x['rating_count'] / (x['rating_count'] + m)) * x['rating_mean'] + 
                      (m / (x['rating_count'] + m)) * C, axis=1
        )
        
        popular = pd.merge(self.movies_df, stats, on='movieId').sort_values(by='weighted_score', ascending=False)
        return popular.head(k).to_dict(orient='records')

    def recommend(self, user_ratings: dict, k: int = 10, 
                  w_lstm: float = 0.4, w_cf: float = 0.3, w_content: float = 0.3) -> list:
        """
        Generates hybrid recommendations.
        :param user_ratings: Dict of {movieId: rating}.
        :param k: Number of recommendations to return.
        """
        user_history_ids = list(user_ratings.keys())
        
        # If user has no history, return popular movies (Cold Start)
        if not user_history_ids:
            pop = self.get_popular_movies(k)
            for m in pop:
                m['explanation'] = "Recommended because it is trending among all users."
                m['score'] = 1.0
            return pop
            
        # Get scores from all 3 components
        content_scores = self.get_content_scores(user_history_ids)
        cf_scores = self.get_cf_scores(user_ratings)
        lstm_scores = self.get_lstm_scores(user_history_ids)
        
        # Hybrid combination
        hybrid_scores = (w_lstm * lstm_scores) + (w_cf * cf_scores) + (w_content * content_scores)
        
        # Add to dataframe to slice and return
        df = self.movies_df.copy()
        df['score'] = hybrid_scores
        df['lstm_score'] = lstm_scores
        df['cf_score'] = cf_scores
        df['content_score'] = content_scores
        
        # Filter out movies user has already watched
        df = df[~df['movieId'].isin(user_history_ids)]
        
        # Get top recommendations
        top_recs = df.sort_values(by='score', ascending=False).head(k)
        
        # Generate explanations for each recommended movie
        results = []
        for _, row in top_recs.iterrows():
            rec_dict = row.to_dict()
            
            # Find the main driver of this recommendation
            # Determine maximum score contribution
            contribs = {
                "lstm": row['lstm_score'] * w_lstm,
                "cf": row['cf_score'] * w_cf,
                "content": row['content_score'] * w_content
            }
            primary_driver = max(contribs, key=contribs.get)
            
            explanation = "Recommended based on your movie taste."
            if primary_driver == "lstm" and row['lstm_score'] > 0.1:
                explanation = "Recommended because you watched similar movies in this sequence."
            elif primary_driver == "content" and row['content_score'] > 0.1:
                # Find matching genres
                matched_genres = []
                for history_id in user_history_ids:
                    hist_movie = self.movies_df[self.movies_df['movieId'] == history_id]
                    if not hist_movie.empty:
                        common = set(row['genres_list']).intersection(set(hist_movie.iloc[0]['genres_list']))
                        matched_genres.extend(list(common))
                        
                if matched_genres:
                    most_common_genre = max(set(matched_genres), key=matched_genres.count)
                    explanation = f"Recommended because you watched similar {most_common_genre} movies."
                else:
                    explanation = "Recommended because it matches the genre tags of movies you watched."
            elif primary_driver == "cf" and row['cf_score'] > 0.1:
                explanation = "Users with similar tastes also enjoyed this movie."
                
            rec_dict['explanation'] = explanation
            # Clean up numpy types for JSON conversion
            rec_dict['movieId'] = int(rec_dict['movieId'])
            if 'imdbId' in rec_dict and pd.notna(rec_dict['imdbId']):
                rec_dict['imdbId'] = int(rec_dict['imdbId'])
            if 'tmdbId' in rec_dict and pd.notna(rec_dict['tmdbId']):
                rec_dict['tmdbId'] = int(rec_dict['tmdbId'])
            rec_dict['score'] = float(rec_dict['score'])
            
            # Remove text metadata columns to keep response small
            rec_dict.pop('metadata_text', None)
            rec_dict.pop('genres', None) # We have genres_list
            
            results.append(rec_dict)
            
        return results

if __name__ == "__main__":
    recommender = HybridRecommender()
    # Test recommendations for user who watched Toy Story (movieId=1, Adventure/Comedy) and Jumanji (movieId=2, Adventure/Children/Fantasy)
    test_user_ratings = {1: 5.0, 2: 4.0}
    recs = recommender.recommend(test_user_ratings, k=5)
    for r in recs:
        print(f"Title: {r['title']}, Score: {r['score']:.4f}, Reason: {r['explanation']}")
