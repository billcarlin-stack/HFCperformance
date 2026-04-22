"""
The Nest — Cloud SQL Fitness Data Seed Script

Populates Cloud SQL with:
  - fitness_sessions: Daily GPS/training data
  - fitness_pbs: Personal best records

Matches the frontend and BigQuery schemas exactly.
"""

import os
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys

# Add parent directory to path so we can import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.fitness import Base, FitnessSession, FitnessPBs

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/hfc_prod")

# ──────────────────────────────────────────────────────────────────────────────
# Data Helpers
# ──────────────────────────────────────────────────────────────────────────────
HFC_PLAYER_IDS = list(range(1, 45))

PLAYER_POSITIONS = {
    1: "midfielder", 2: "ruck", 3: "midfielder", 4: "defender",
    5: "midfielder", 6: "defender", 7: "ruck", 8: "defender",
    9: "defender", 10: "midfielder", 11: "defender", 12: "midfielder",
    13: "forward", 14: "midfielder", 15: "midfielder", 16: "midfielder",
    17: "forward", 18: "midfielder", 19: "forward", 20: "midfielder",
    21: "midfielder", 22: "forward", 23: "midfielder", 24: "defender",
    25: "midfielder", 26: "defender", 27: "forward", 28: "forward",
    29: "forward", 30: "ruck", 31: "midfielder", 32: "midfielder",
    33: "midfielder", 34: "forward", 35: "midfielder", 36: "forward",
    37: "midfielder", 38: "defender", 39: "defender", 40: "midfielder",
    41: "midfielder", 42: "midfielder", 43: "forward", 44: "midfielder",
}

POSITION_PROFILES = {
    "midfielder": {"distance_km": (13, 17), "top_speed": (30, 34), "hr_avg": (152, 168), "hsd_m": (1200, 2200), "sprints": (18, 32), "acc": (55, 95)},
    "forward":    {"distance_km": (10, 14), "top_speed": (31, 35), "hr_avg": (148, 165), "hsd_m": (900, 1600), "sprints": (15, 27), "acc": (45, 80)},
    "defender":   {"distance_km": (11, 15), "top_speed": (29, 33), "hr_avg": (150, 166), "hsd_m": (1000, 1800), "sprints": (16, 28), "acc": (50, 85)},
    "ruck":       {"distance_km": (9, 13),  "top_speed": (27, 31), "hr_avg": (145, 162), "hsd_m": (700, 1300), "sprints": (10, 20), "acc": (40, 70)},
}

PB_RANGES = {
    "midfielder": {
        "run_2k": (385, 430),
        "bench_kg": (85, 120),
        "squat_kg": (100, 150),
        "vertical_cm": (62, 78),
        "beep": (13.0, 15.5),
        "top_speed": (33, 36),
        "sprint_10m": (1.60, 1.75),
        "sprint_40m": (4.85, 5.15),
    },
    # ... Simplified for brevity or added as needed
}

def rnd(a, b, decimals=1):
    return round(random.uniform(a, b), decimals)

def seed_cloudsql_fitness():
    print(f"🚀 Connecting to Cloud SQL: {DATABASE_URL.split('@')[-1]}")
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Clear existing
        print("🧹 Clearing existing fitness data...")
        db.query(FitnessSession).delete()
        db.query(FitnessPBs).delete()
        db.commit()

        # Seed Sessions (last 7 days)
        print("🏃 Seeding fitness sessions...")
        today = datetime.now(timezone.utc)
        sessions_to_add = []
        
        for player_id in HFC_PLAYER_IDS:
            pos = PLAYER_POSITIONS.get(player_id, "midfielder")
            profile = POSITION_PROFILES[pos]
            
            for days_ago in range(1, 8):
                session_date = today - timedelta(days=days_ago)
                top_speed = rnd(*profile["top_speed"])
                hr_avg = random.randint(*profile["hr_avg"])
                
                sessions_to_add.append(FitnessSession(
                    player_id=player_id,
                    session_date=session_date,
                    session_type=random.choice(["Skills Session", "Match Sim", "Conditioning"]),
                    distance_km=rnd(*profile["distance_km"]),
                    top_speed_kmh=top_speed,
                    hsd_m=float(random.randint(*profile["hsd_m"])),
                    hr_avg_bpm=hr_avg,
                    hr_max_bpm=hr_avg + random.randint(20, 35),
                    total_load=rnd(300, 600),
                    sprints=random.randint(*profile["sprints"]),
                    accelerations=random.randint(*profile["acc"]),
                    decelerations=int(random.randint(*profile["acc"]) * 0.8),
                    is_live=1 if days_ago == 1 else 0
                ))
        
        db.add_all(sessions_to_add)
        print(f"  ✅ Added {len(sessions_to_add)} session records.")

        # Seed PBs
        print("🏆 Seeding fitness PBs...")
        pbs_to_add = []
        for player_id in HFC_PLAYER_IDS:
            pos = PLAYER_POSITIONS.get(player_id, "midfielder")
            r = PB_RANGES.get(pos, PB_RANGES["midfielder"])
            
            pbs_to_add.append(FitnessPBs(
                player_id=player_id,
                run_2k_seconds=random.randint(*r["run_2k"]),
                bench_press_kg=rnd(*r["bench_kg"]),
                squat_kg=rnd(*r["squat_kg"]),
                vertical_jump_cm=rnd(*r["vertical_cm"]),
                beep_test_level=rnd(*r["beep"]),
                top_speed_kmh=rnd(*r["top_speed"]),
                sprint_10m_s=rnd(*r["sprint_10m"], decimals=2),
                sprint_40m_s=rnd(*r["sprint_40m"], decimals=2),
                date_recorded=today - timedelta(days=random.randint(5, 30))
            ))
        
        db.add_all(pbs_to_add)
        db.commit()
        print(f"  ✅ Added {len(pbs_to_add)} PB records.")
        print("\n✨ Cloud SQL Fitness seeding complete!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_cloudsql_fitness()
