"""
The Hawk Hub — Database Utilities
Consolidated logic for initializing and seeding AlloyDB.
"""

import os
import random
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import sessionmaker

from db.alloydb_client import Base, get_engine
from models.players import Player
from models.fitness import FitnessSession, FitnessPBs
from models.ratings import CoachRating
from models.wellbeing import WellbeingSurvey
from models.injuries import InjuryLog
from models.team import TeamSelection
from models.woop import WoopGoal
from models.stats import PlayerStats

logger = logging.getLogger(__name__)

PLAYERS_DATA = [
    {'jumper_no': 1, 'name': 'Harry Morrison', 'age': 25, 'height_cm': 184, 'games': 90, 'position': 'Mid/Def', 'status': 'Green'},
    {'jumper_no': 2, 'name': 'Mitchell Lewis', 'age': 25, 'height_cm': 199, 'games': 75, 'position': 'Key Forward', 'status': 'Amber'},
    {'jumper_no': 3, 'name': 'Jai Newcombe', 'age': 22, 'height_cm': 186, 'games': 60, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 4, 'name': 'Jarman Impey', 'age': 28, 'height_cm': 178, 'games': 180, 'position': 'Defender', 'status': 'Green'},
    {'jumper_no': 5, 'name': 'James Worpel', 'age': 25, 'height_cm': 186, 'games': 110, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 6, 'name': 'James Sicily', 'age': 29, 'height_cm': 188, 'games': 140, 'position': 'Defender', 'status': 'Green'},
]

def initialize_and_seed():
    """Synchronously initializes schema and populates data."""
    engine = get_engine()
    logger.info("Dropping and recreating all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # 1. Seed Players
        logger.info("Seeding players...")
        session.query(Player).delete()
        for p_data in PLAYERS_DATA:
            session.add(Player(
                jumper_no=p_data['jumper_no'],
                name=p_data['name'],
                age=p_data['age'],
                height_cm=p_data['height_cm'],
                weight_kg=80,
                games=p_data['games'],
                position=p_data['position'],
                status=p_data['status']
            ))
        
        # 2. Seed Fitness (Minimal)
        logger.info("Seeding fitness data...")
        session.query(FitnessSession).delete()
        session.query(FitnessPBs).delete()
        
        today = datetime.now(timezone.utc)
        for p_data in PLAYERS_DATA:
            pid = p_data['jumper_no']
            # One session per player
            session.add(FitnessSession(
                player_id=pid,
                session_date=today - timedelta(days=1),
                session_type="Training",
                distance_km=6.5,
                top_speed_kmh=31.2,
                hsd_m=850.0,
                hr_avg_bpm=155,
                hr_max_bpm=188,
                total_load=450.0,
                sprints=12,
                accelerations=45,
                decelerations=35,
                is_live=1
            ))
            # Basic PBs
            session.add(FitnessPBs(
                player_id=pid,
                run_2k_seconds=420,
                bench_press_kg=95.0,
                squat_kg=120.0,
                vertical_jump_cm=65.0,
                beep_test_level=12.5,
                top_speed_kmh=32.5,
                sprint_10m_s=1.75,
                sprint_40m_s=5.10,
                date_recorded=today - timedelta(days=30)
            ))

        session.commit()
        logger.info("Database initialized and basic data seeded.")
        return True
    except Exception as e:
        session.rollback()
        logger.error(f"Initialization failed: {e}", exc_info=True)
        raise e
    finally:
        session.close()
