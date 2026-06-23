import time
import logging
import schedule
from config import Config
from main import run_etl, setup_logging

# Configure logger for scheduling
logger = logging.getLogger("etl.scheduler")

def scheduled_job():
    """Wrapper function to execute ETL within schedule framework."""
    logger.info("Triggering scheduled ETL run...")
    # Run ETL (re-use existing files, do not force-download unless files missing)
    run_etl(force_download=False)

def main():
    setup_logging()
    interval = Config.SCHEDULE_INTERVAL_MINUTES
    logger.info("=" * 60)
    logger.info(f"Starting Spotify ETL Scheduler Daemon (runs every {interval} minutes)")
    logger.info("=" * 60)
    
    # Run once immediately on start
    scheduled_job()
    
    # Schedule recurring task
    schedule.every(interval).minutes.do(scheduled_job)
    
    try:
        while True:
            schedule.run_pending()
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Scheduler daemon stopped by user.")
    except Exception as e:
        logger.critical(f"Scheduler daemon terminated due to error: {e}", exc_info=True)

if __name__ == "__main__":
    main()
