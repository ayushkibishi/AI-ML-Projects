import os
import zipfile
import urllib.request
import pandas as pd

class MovieLensDatasetLoader:
    def __init__(self, data_dir: str = None, dataset_type: str = "small"):
        """
        Initializes the MovieLens Dataset Loader.
        :param data_dir: Directory where data will be downloaded and processed.
        :param dataset_type: 'small' for testing (ml-latest-small) or '25m' for production (ml-25m).
        """
        if data_dir is None:
            # Default to movie-recommender-ai/data/ relative to this script
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.data_dir = os.path.join(base_dir, "data")
        else:
            self.data_dir = data_dir
            
        self.dataset_type = dataset_type.lower()
        
        if self.dataset_type == "25m":
            self.zip_url = "https://files.grouplens.org/datasets/movielens/ml-25m.zip"
            self.folder_name = "ml-25m"
        else:
            self.zip_url = "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip"
            self.folder_name = "ml-latest-small"
            
        self.extract_path = os.path.join(self.data_dir, self.folder_name)
        self.zip_path = os.path.join(self.data_dir, f"{self.folder_name}.zip")

    def download_and_extract(self):
        """
        Checks if the dataset exists locally. If not, downloads and extracts it.
        """
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Check if the extracted directory exists and contains CSVs
        required_files = ["ratings.csv", "movies.csv", "links.csv"]
        exists_locally = os.path.exists(self.extract_path) and all(
            os.path.exists(os.path.join(self.extract_path, f)) for f in required_files
        )
        
        if exists_locally:
            print(f"Dataset already exists at: {self.extract_path}")
            return
            
        print(f"Dataset not found locally. Downloading from {self.zip_url}...")
        try:
            # Download file
            urllib.request.urlretrieve(self.zip_url, self.zip_path)
            print(f"Successfully downloaded to {self.zip_path}")
            
            # Extract file
            print("Extracting dataset...")
            with zipfile.ZipFile(self.zip_path, 'r') as zip_ref:
                zip_ref.extractall(self.data_dir)
            print(f"Successfully extracted to {self.data_dir}")
            
            # Remove zip after extraction to save space
            os.remove(self.zip_path)
            print("Removed temporary zip file.")
        except Exception as e:
            print(f"Error downloading or extracting dataset: {e}")
            raise e

    def load_ratings(self) -> pd.DataFrame:
        """Loads and returns ratings.csv as a pandas DataFrame."""
        self.download_and_extract()
        path = os.path.join(self.extract_path, "ratings.csv")
        df = pd.read_csv(path)
        # Ensure timestamp is sorted or typed
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='s')
        return df

    def load_movies(self) -> pd.DataFrame:
        """Loads and returns movies.csv as a pandas DataFrame."""
        self.download_and_extract()
        path = os.path.join(self.extract_path, "movies.csv")
        df = pd.read_csv(path)
        
        # Parse title and year
        # E.g. "Toy Story (1995)" -> Title: "Toy Story", Year: 1995
        df['year'] = df['title'].str.extract(r'\((\d{4})\)$').astype(float)
        df['title_clean'] = df['title'].str.replace(r'\s*\(\d{4}\)$', '', regex=True)
        
        # Parse genres into lists
        df['genres_list'] = df['genres'].apply(lambda x: x.split('|') if isinstance(x, str) else [])
        return df

    def load_links(self) -> pd.DataFrame:
        """Loads and returns links.csv as a pandas DataFrame."""
        self.download_and_extract()
        path = os.path.join(self.extract_path, "links.csv")
        df = pd.read_csv(path)
        # Cast ids as float/Int64 since they might contain NaNs in large dataset
        df['imdbId'] = df['imdbId'].astype('Int64')
        df['tmdbId'] = df['tmdbId'].astype('Int64')
        return df

    def load_tags(self) -> pd.DataFrame:
        """Loads and returns tags.csv as a pandas DataFrame, if it exists."""
        self.download_and_extract()
        path = os.path.join(self.extract_path, "tags.csv")
        if os.path.exists(path):
            return pd.read_csv(path)
        return pd.DataFrame(columns=["userId", "movieId", "tag", "timestamp"])

    def get_merged_movie_data(self) -> pd.DataFrame:
        """
        Returns a joined DataFrame containing movies, links, and tags summary.
        """
        movies = self.load_movies()
        links = self.load_links()
        
        # Join movies and links
        merged = pd.merge(movies, links, on="movieId", how="left")
        
        # Aggregate tags for content descriptions
        tags = self.load_tags()
        if not tags.empty:
            tags_grouped = tags.groupby("movieId")["tag"].apply(
                lambda x: " ".join(set(str(t) for t in x if pd.notna(t)))
            ).reset_index()
            merged = pd.merge(merged, tags_grouped, on="movieId", how="left")
            merged["tag"] = merged["tag"].fillna("")
        else:
            merged["tag"] = ""
            
        return merged

if __name__ == "__main__":
    # Test execution
    loader = MovieLensDatasetLoader(dataset_type="small")
    loader.download_and_extract()
    movies = loader.get_merged_movie_data()
    ratings = loader.load_ratings()
    print(f"Loaded {len(movies)} movies and {len(ratings)} ratings successfully!")
