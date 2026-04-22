"""
The Hawk Hub — Cloud SQL Client

Thread-safe singleton for the PostgreSQL (Cloud SQL) connection.
Uses SQLAlchemy for connection pooling and session management.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from config import get_config
import logging

logger = logging.getLogger(__name__)


_config = get_config()
_engine = None
_SessionFactory = None
_Session = None

Base = declarative_base()

def get_engine():
    """Returns the SQLAlchemy engine."""
    global _engine
    if _engine is None:
        _engine = create_engine(
            _config.DATABASE_URL,
            pool_size=10,
            max_overflow=20,
            pool_recycle=3600,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 10} # 10 seconds timeout
        )
    return _engine

def get_session():
    """Returns a thread-safe scoped session."""
    global _Session, _SessionFactory
    if _Session is None:
        engine = get_engine()
        _SessionFactory = sessionmaker(bind=engine)
        _Session = scoped_session(_SessionFactory)
    return _Session()

def init_db():
    """Initializes the database schema and runs migrations."""
    engine = get_engine()
    # Import all models here to ensure they are registered with Base
    import models.players
    import models.ratings
    import models.wellbeing
    import models.fitness
    import models.availability
    import models.injuries
    import models.team
    import models.woop
    import models.stats
    import models.user_roles
    
    Base.metadata.create_all(bind=engine)

    # ── Custom Migrations ─────────────────────────────────────────
    # Add 'source' column to coach_ratings if it doesn't exist
    try:
        with engine.connect() as conn:
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='coach_ratings' AND column_name='source';
            """)
            result = conn.execute(check_query).fetchone()
            
            if not result:
                logger.info("Adding 'source' column to coach_ratings table...")
                conn.execute(text("ALTER TABLE coach_ratings ADD COLUMN source VARCHAR(20) DEFAULT 'coach' NOT NULL;"))
                conn.commit()
                logger.info("Column 'source' added successfully.")
    except Exception as e:
        logger.error(f"Migration failed (source column): {e}")

    # Add 'rotation_color' and 'rotation_minutes' to team_selections if they don't exist
    try:
        with engine.connect() as conn:
            # Check for rotation_color
            check_color = conn.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name='team_selections' AND column_name='rotation_color';
            """)).fetchone()
            if not check_color:
                logger.info("Adding 'rotation_color' to team_selections...")
                conn.execute(text("ALTER TABLE team_selections ADD COLUMN rotation_color VARCHAR(50);"))
                conn.commit()

            # Check for rotation_minutes
            check_min = conn.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name='team_selections' AND column_name='rotation_minutes';
            """)).fetchone()
            if not check_min:
                logger.info("Adding 'rotation_minutes' to team_selections...")
                conn.execute(text("ALTER TABLE team_selections ADD COLUMN rotation_minutes INTEGER;"))
                conn.commit()
    except Exception as e:
        logger.error(f"Migration failed (team_selections columns): {e}")


