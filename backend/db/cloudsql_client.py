"""
The Hawk Hub — Cloud SQL Client

Thread-safe singleton for the PostgreSQL (Cloud SQL) connection.
Uses SQLAlchemy for connection pooling and session management.
"""

import os
from sqlalchemy import create_engine, text, MetaData
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from config import get_config
import logging

logger = logging.getLogger(__name__)


_config = get_config()
_engine = None
_SessionFactory = None
_Session = None

# DB_SCHEMA env var: set to 'coaching' on Hawks production, leave unset for bill-sandpit
_DB_SCHEMA = os.environ.get('DB_SCHEMA', None)
_metadata = MetaData(schema=_DB_SCHEMA) if _DB_SCHEMA else MetaData()
Base = declarative_base(metadata=_metadata)

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
    import models.game_ratings
    import models.idp_assessment

    Base.metadata.create_all(bind=engine)

    # ── Custom Migrations ─────────────────────────────────────────
    # Schema-qualified table references for migrations
    _schema_prefix = f"{_DB_SCHEMA}." if _DB_SCHEMA else ""
    _schema_filter = f"AND table_schema='{_DB_SCHEMA}'" if _DB_SCHEMA else "AND table_schema='public'"

    # Add 'source' column to coach_ratings if it doesn't exist
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='coach_ratings' AND column_name='source'
                {_schema_filter};
            """)).fetchone()
            if not result:
                logger.info("Adding 'source' column to coach_ratings table...")
                conn.execute(text(f"ALTER TABLE {_schema_prefix}coach_ratings ADD COLUMN source VARCHAR(20) DEFAULT 'coach' NOT NULL;"))
                conn.commit()
                logger.info("Column 'source' added successfully.")
    except Exception as e:
        logger.error(f"Migration failed (source column): {e}")

    # Add 'rotation_color' and 'rotation_minutes' to team_selections if they don't exist
    try:
        with engine.connect() as conn:
            check_color = conn.execute(text(f"""
                SELECT column_name FROM information_schema.columns
                WHERE table_name='team_selections' AND column_name='rotation_color'
                {_schema_filter};
            """)).fetchone()
            if not check_color:
                logger.info("Adding 'rotation_color' to team_selections...")
                conn.execute(text(f"ALTER TABLE {_schema_prefix}team_selections ADD COLUMN rotation_color VARCHAR(50);"))
                conn.commit()

            check_min = conn.execute(text(f"""
                SELECT column_name FROM information_schema.columns
                WHERE table_name='team_selections' AND column_name='rotation_minutes'
                {_schema_filter};
            """)).fetchone()
            if not check_min:
                logger.info("Adding 'rotation_minutes' to team_selections...")
                conn.execute(text(f"ALTER TABLE {_schema_prefix}team_selections ADD COLUMN rotation_minutes INTEGER;"))
                conn.commit()
    except Exception as e:
        logger.error(f"Migration failed (team_selections columns): {e}")

    # Add assessment_period_id to coach_ratings
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"""
                SELECT 1 FROM information_schema.columns
                WHERE table_name='coach_ratings' AND column_name='assessment_period_id'
                {_schema_filter}
            """)).fetchone()
            if not result:
                conn.execute(text(f"ALTER TABLE {_schema_prefix}coach_ratings ADD COLUMN assessment_period_id VARCHAR(36)"))
                conn.commit()
                logger.info("Added assessment_period_id to coach_ratings")
    except Exception as e:
        logger.error(f"Migration failed (assessment_period_id): {e}")

    # Add 'league_id' column to player_stats_2025 and create unique index for composite PK
    try:
        with engine.connect() as conn:
            check_table = conn.execute(text(f"""
                SELECT table_name FROM information_schema.tables
                WHERE table_name='player_stats_2025' {_schema_filter};
            """)).fetchone()
            if check_table:
                check_league = conn.execute(text(f"""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name='player_stats_2025' AND column_name='league_id'
                    {_schema_filter};
                """)).fetchone()
                if not check_league:
                    logger.info("Adding 'league_id' column to player_stats_2025...")
                    conn.execute(text(f"ALTER TABLE {_schema_prefix}player_stats_2025 ADD COLUMN league_id INTEGER DEFAULT 1;"))
                    conn.commit()
                    logger.info("Column 'league_id' added successfully.")

            conn.execute(text(f"""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_player_stats_league
                ON {_schema_prefix}player_stats_2025(jumper_no, league_id);
            """))
            conn.commit()
            logger.info("Unique index uq_player_stats_league ensured on player_stats_2025.")
    except Exception as e:
        logger.error(f"Migration failed (player_stats_2025 league_id): {e}")

