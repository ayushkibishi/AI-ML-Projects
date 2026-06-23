import os
import sys
import time
import argparse
import logging
from config import Config
from src.ingest import ingest_dataset
from src.transform import transform_dataset
from src.load import get_db_engine, create_schema, load_data_to_postgres

def setup_logging():
    """Configures global logging system to output to file and console."""
    # Ensure log file folder exists
    Config.LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    log_level = getattr(logging, Config.LOG_LEVEL.upper(), logging.INFO)
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Clean previous handlers
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
        
    # File Handler
    file_handler = logging.FileHandler(Config.LOG_FILE, encoding='utf-8')
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)
    
    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

def run_etl(force_download: bool = False, skip_db: bool = False):
    """Orchestrates the entire ETL pipeline."""
    logger = logging.getLogger("etl.main")
    logger.info("=" * 60)
    logger.info("Starting Spotify Tracks ETL Pipeline")
    logger.info("=" * 60)
    
    start_time = time.time()
    
    try:
        # Step 1: Ingestion
        ingest_start = time.time()
        logger.info("--- Step 1: Ingest Data ---")
        raw_csv_path = ingest_dataset(force_download=force_download)
        ingest_duration = time.time() - ingest_start
        logger.info(f"Ingestion completed in {ingest_duration:.2f} seconds.")
        
        # Step 2: Transformation
        transform_start = time.time()
        logger.info("--- Step 2: Transform Data ---")
        dfs = transform_dataset(raw_csv_path)
        transform_duration = time.time() - transform_start
        logger.info(f"Transformation completed in {transform_duration:.2f} seconds.")
        
        # Step 3: Loading (Optional)
        if not skip_db:
            load_start = time.time()
            logger.info("--- Step 3: Load Data to PostgreSQL ---")
            engine = get_db_engine()
            
            # Ensure DB tables and view exist
            create_schema(engine)
            
            # Load Data
            load_data_to_postgres(dfs, engine)
            load_duration = time.time() - load_start
            logger.info(f"Database loading completed in {load_duration:.2f} seconds.")
        else:
            logger.info("Skipping database loading as requested.")
            
        total_duration = time.time() - start_time
        logger.info("=" * 60)
        logger.info(f"ETL Pipeline completed successfully in {total_duration:.2f} seconds.")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"ETL Pipeline execution failed: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Spotify Tracks Dataset ETL Pipeline CLI"
    )
    parser.add_argument(
        "--force-download", 
        action="store_true", 
        help="Force download of raw dataset from Hugging Face even if cached"
    )
    parser.add_argument(
        "--skip-db", 
        action="store_true", 
        help="Skip database connection and loading step (dry-run mode)"
    )
    
    args = parser.parse_args()
    
    # Initialize log configurations
    setup_logging()
    
    run_etl(force_download=args.force_download, skip_db=args.skip_db)
