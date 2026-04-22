import sys
import os
import logging

# Add backend directory to path so imports work
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from db.cloudsql_client import init_db
    from seeds.seed_cloudsql_players import seed_cloudsql
    from seeds.seed_cloudsql_fitness import seed_cloudsql_fitness
    
    logger.info("Initializing database schema...")
    init_db()
    
    logger.info("Running player seed...")
    seed_cloudsql()
    
    logger.info("Running fitness seed...")
    seed_cloudsql_fitness()
    
    logger.info("SUCCESS!")
except Exception as e:
    logger.error("Seeding failed: %s", str(e), exc_info=True)
