import logging
from sqlalchemy import text
from db.cloudsql_client import get_engine, Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    engine = get_engine()
    with engine.connect() as conn:
        try:
            # 1. Add round_name column to saved_squads if it doesn't exist
            # Postgres safe ALTER table pattern:
            conn.execute(text("ALTER TABLE saved_squads ADD COLUMN IF NOT EXISTS round_name VARCHAR(50);"))
            # Optionally update existing ones to a default round "Round 1"
            conn.execute(text("UPDATE saved_squads SET round_name = 'Round 1' WHERE round_name IS NULL;"))
            
            logger.info("Successfully added round_name to saved_squads")
        except Exception as e:
            logger.error(f"Error modifying saved_squads: {e}")
            
        try:
            # 2. Create round_details table if it doesn't exist
            from models.team import RoundDetails
            RoundDetails.__table__.create(bind=engine, checkfirst=True)
            logger.info("Successfully created round_details table")
        except Exception as e:
            logger.error(f"Error creating round_details: {e}")
            
        conn.commit()
    logger.info("Migration complete.")

if __name__ == "__main__":
    run_migration()
