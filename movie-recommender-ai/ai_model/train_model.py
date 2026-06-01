import os
import json
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, LSTM, Dense, Dropout
from sklearn.model_selection import train_test_split
from dataset_loader import MovieLensDatasetLoader

# Set seed for reproducibility
np.random.seed(42)
tf.random.set_seed(42)

class MovieRecommenderTrainer:
    def __init__(self, dataset_type: str = "small", seq_length: int = 5, embedding_dim: int = 32):
        self.dataset_type = dataset_type
        self.seq_length = seq_length
        self.embedding_dim = embedding_dim
        
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.models_dir = os.path.join(base_dir, "models")
        os.makedirs(self.models_dir, exist_ok=True)
        
        self.loader = MovieLensDatasetLoader(dataset_type=dataset_type)
        
    def prepare_data(self):
        print("Loading MovieLens dataset...")
        ratings_df = self.loader.load_ratings()
        movies_df = self.loader.load_movies()
        
        # Filter for positive ratings (>= 3.0) to represent movies user enjoyed/watched
        positive_ratings = ratings_df[ratings_df['rating'] >= 3.0].copy()
        
        # Sort by timestamp to preserve temporal watch order
        positive_ratings = positive_ratings.sort_values(by=['userId', 'timestamp'])
        
        # Create mapping for movieIds to continuous indices
        unique_movies = positive_ratings['movieId'].unique()
        self.movie_to_idx = {int(m_id): int(idx) for idx, m_id in enumerate(unique_movies)}
        self.idx_to_movie = {int(idx): int(m_id) for idx, m_id in enumerate(unique_movies)}
        self.num_movies = len(unique_movies)
        
        print(f"Total positive interactions: {len(positive_ratings)}")
        print(f"Total unique movies with positive ratings: {self.num_movies}")
        
        # Save mapping
        with open(os.path.join(self.models_dir, "movie_to_idx.json"), "w") as f:
            json.dump(self.movie_to_idx, f)
        with open(os.path.join(self.models_dir, "idx_to_movie.json"), "w") as f:
            json.dump(self.idx_to_movie, f)
            
        # Map ratings dataframe
        positive_ratings['movie_idx'] = positive_ratings['movieId'].map(self.movie_to_idx)
        
        # Generate user sequence inputs (X) and targets (y)
        X = []
        y = []
        
        grouped = positive_ratings.groupby('userId')['movie_idx'].apply(list)
        for user_id, watch_history in grouped.items():
            if len(watch_history) <= self.seq_length:
                continue # Skip users with insufficient history
                
            for i in range(len(watch_history) - self.seq_length):
                X.append(watch_history[i : i + self.seq_length])
                y.append(watch_history[i + self.seq_length])
                
        X = np.array(X)
        y = np.array(y)
        
        print(f"Generated {len(X)} training sequences.")
        return X, y, ratings_df

    def build_model(self):
        print("Building LSTM model...")
        model = Sequential([
            Embedding(input_dim=self.num_movies, 
                      output_dim=self.embedding_dim, 
                      input_length=self.seq_length,
                      mask_zero=True),
            LSTM(64, activation='tanh', return_sequences=False),
            Dropout(0.2),
            Dense(64, activation='relu'),
            Dropout(0.2),
            Dense(self.num_movies, activation='softmax')
        ])
        
        model.compile(
            optimizer='adam',
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        return model

    def evaluate_rating_baseline(self, ratings_df):
        """
        Computes RMSE and MAE on rating predictions using a simple User-Movie baseline (CF style).
        Specifically, we predict user rating using a simple global mean + user bias + item bias model.
        """
        print("Calculating baseline rating metrics (RMSE, MAE)...")
        train_ratings, val_ratings = train_test_split(ratings_df, test_size=0.2, random_state=42)
        
        global_mean = train_ratings['rating'].mean()
        
        # User bias
        user_bias = train_ratings.groupby('userId')['rating'].mean() - global_mean
        # Movie bias
        movie_bias = train_ratings.groupby('movieId')['rating'].mean() - global_mean
        
        # Predict on validation
        predictions = []
        targets = []
        
        for idx, row in val_ratings.iterrows():
            u, m = row['userId'], row['movieId']
            pred = global_mean
            if u in user_bias:
                pred += user_bias[u]
            if m in movie_bias:
                pred += movie_bias[m]
                
            # clip to valid rating range
            pred = np.clip(pred, 0.5, 5.0)
            predictions.append(pred)
            targets.append(row['rating'])
            
        predictions = np.array(predictions)
        targets = np.array(targets)
        
        rmse = np.sqrt(np.mean((predictions - targets)**2))
        mae = np.mean(np.abs(predictions - targets))
        
        print(f"Baseline Ratings RMSE: {rmse:.4f}")
        print(f"Baseline Ratings MAE: {mae:.4f}")
        return rmse, mae

    def evaluate_precision_recall_at_k(self, model, X_val, y_val, k=10):
        """
        Calculates Precision@K and Recall@K for next-item predictions on validation set.
        """
        print(f"Calculating Precision@{k} and Recall@{k} on validation set...")
        # Get predictions
        preds = model.predict(X_val, batch_size=256, verbose=0)
        
        # Sort predictions and get top K indices
        top_k_indices = np.argsort(preds, axis=1)[:, -k:][:, ::-1]
        
        hits = 0
        total = len(y_val)
        
        for i in range(total):
            true_item = y_val[i]
            predicted_items = top_k_indices[i]
            
            if true_item in predicted_items:
                hits += 1
                
        # For single next-item prediction:
        # Precision@K is 1/K if the true item is in top K, else 0.
        # Recall@K is 1 if the true item is in top K, else 0.
        recall_at_k = hits / total
        precision_at_k = recall_at_k / k
        
        print(f"Next-Item Recall@{k}: {recall_at_k:.4f}")
        print(f"Next-Item Precision@{k}: {precision_at_k:.4f}")
        return precision_at_k, recall_at_k

    def train(self, epochs: int = 10, batch_size: int = 128):
        X, y, ratings_df = self.prepare_data()
        
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.15, random_state=42)
        
        model = self.build_model()
        model.summary()
        
        print(f"Starting model training for {epochs} epochs...")
        history = model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            verbose=1
        )
        
        # Save final model
        model_path = os.path.join(self.models_dir, "recommender_lstm.h5")
        model.save(model_path)
        print(f"Model saved to {model_path}")
        
        # Save training logs/history
        history_path = os.path.join(self.models_dir, "training_history.json")
        with open(history_path, "w") as f:
            json.dump({k: [float(x) for x in v] for k, v in history.history.items()}, f)
            
        # Evaluations
        p_at_k, r_at_k = self.evaluate_precision_recall_at_k(model, X_val, y_val, k=10)
        rmse, mae = self.evaluate_rating_baseline(ratings_df)
        
        # Write training summary metrics
        metrics = {
            "epochs": epochs,
            "final_accuracy": float(history.history['accuracy'][-1]),
            "final_val_accuracy": float(history.history['val_accuracy'][-1]),
            "precision_at_10": float(p_at_k),
            "recall_at_10": float(r_at_k),
            "rmse": float(rmse),
            "mae": float(mae)
        }
        with open(os.path.join(self.models_dir, "metrics.json"), "w") as f:
            json.dump(metrics, f, indent=4)
            
        print("Training pipeline completed successfully.")
        return metrics

if __name__ == "__main__":
    # Let's run a test training run (fewer epochs to ensure it works quickly)
    trainer = MovieRecommenderTrainer(dataset_type="small", seq_length=5)
    trainer.train(epochs=5, batch_size=128)
