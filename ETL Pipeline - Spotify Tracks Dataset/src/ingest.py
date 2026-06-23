import logging
import requests
from pathlib import Path
from config import Config

# Configure logger for ingest module
logger = logging.getLogger("etl.ingest")

def ingest_dataset(force_download: bool = False) -> Path:
    """
    Downloads the Spotify tracks dataset from Hugging Face if it does not exist locally.
    
    Args:
        force_download (bool): If True, downloads dataset even if file already exists.
        
    Returns:
        Path: The file path to the downloaded raw dataset.
    """
    raw_path = Config.RAW_DATA_PATH
    
    if raw_path.exists() and not force_download:
        logger.info(f"Dataset already exists at: {raw_path}. Skipping download.")
        return raw_path

    url = Config.DATASET_URL
    logger.info(f"Starting download from URL: {url}")
    
    try:
        # Request stream to download large files
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        chunk_size = 1024 * 1024 # 1 MB chunks
        downloaded = 0
        
        logger.info(f"Total dataset file size: {total_size / (1024 * 1024):.2f} MB")
        
        with open(raw_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=chunk_size):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        logger.info(f"Download Progress: {percent:.1f}% ({downloaded / (1024 * 1024):.2f} MB)")
                    else:
                        logger.info(f"Downloaded: {downloaded / (1024 * 1024):.2f} MB")
                        
        logger.info(f"Successfully downloaded raw dataset to: {raw_path}")
        return raw_path
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to download dataset: {e}")
        raise RuntimeError(f"Error downloading Spotify tracks dataset: {e}")
