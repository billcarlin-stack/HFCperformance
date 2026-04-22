"""
The Nest — Fitness Data Seed Script

Creates and populates:
  - fitness_sessions: GPS/training session data per player per day
  - fitness_pbs: Personal best records for each player

Injured players (Red/Amber status) don't receive live session data.
All players receive PB records.

Usage:
    python seeds/seed_fitness.py
"""

import os
import uuid
import random
from datetime import datetime, timedelta, timezone
from google.cloud import bigquery

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "bill-sandpit")
DATASET_ID = "hfc_performance_hub"

client = bigquery.Client(project=PROJECT_ID)

# ──────────────────────────────────────────────────────────────────────────────
# Player roster with status (injured players have no live session data)
# ──────────────────────────────────────────────────────────────────────────────
HFC_PLAYERS = {
    1: ("Harry Morrison", "Green"),
    2: ("Mitchell Lewis", "Green"),
    3: ("Jai Newcombe", "Green"),
    4: ("Jarman Impey", "Amber"),
    5: ("James Worpel", "Green"),
    6: ("James Sicily", "Green"),
    7: ("Ned Reeves", "Green"),
    8: ("Sam Frost", "Green"),
    9: ("Changkuoth Jiath", "Green"),
    10: ("Karl Amon", "Green"),
    11: ("Denver Grainger-Barras", "Green"),
    12: ("Will Day", "Green"),
    13: ("Dylan Moore", "Green"),
    14: ("Connor Macdonald", "Red"),
    15: ("Jack Scrimshaw", "Amber"),
    16: ("Josh Weddle", "Green"),
    17: ("Calsher Dear", "Green"),
    18: ("Seamus Mitchell", "Green"),
    19: ("Jack Ginnivan", "Amber"),
    20: ("Lachlan Bramble", "Green"),
    21: ("Nick Watson", "Amber"),
    22: ("Luke Breust", "Green"),
    23: ("Finn Maginness", "Green"),
    24: ("James Blanck", "Green"),
    25: ("Josh Ward", "Green"),
    26: ("Max Ramsden", "Green"),
    27: ("Tyler Brockman", "Green"),
    28: ("Mabior Chol", "Green"),
    29: ("Nik Cox", "Amber"),
    30: ("Lloyd Meek", "Green"),
    31: ("Jackson Ross", "Red"),
    32: ("Ned Long", "Green"),
    33: ("Emerson Woods", "Amber"),
    34: ("Ryan Maric", "Green"),
    35: ("Campbell Chesser", "Green"),
    36: ("Hugo Ralphsmith", "Green"),
    37: ("Massimo D'Ambrosio", "Green"),
    38: ("Fisher McAsey", "Green"),
    39: ("Ollie Hannaford", "Green"),
    40: ("Harry Pepper", "Green"),
    41: ("James McCabe", "Green"),
    42: ("Wil Park", "Green"),
    43: ("Jack Gunston", "Red"),
    44: ("Patrick Voss", "Green"),
}

# Key athleticism markers by position/profile
# Midfielders/Defenders: high distance, higher HR
# Forwards: high speed, power
POSITION_PROFILES = {
    "midfielder": {"distance_km": (13, 17), "top_speed": (30, 34), "hr_avg": (152, 168), "hsd_m": (1200, 2200), "sprints": (18, 32), "acc": (55, 95)},
    "forward":    {"distance_km": (10, 14), "top_speed": (31, 35), "hr_avg": (148, 165), "hsd_m": (900, 1600), "sprints": (15, 27), "acc": (45, 80)},
    "defender":   {"distance_km": (11, 15), "top_speed": (29, 33), "hr_avg": (150, 166), "hsd_m": (1000, 1800), "sprints": (16, 28), "acc": (50, 85)},
    "ruck":       {"distance_km": (9, 13),  "top_speed": (27, 31), "hr_avg": (145, 162), "hsd_m": (700, 1300), "sprints": (10, 20), "acc": (40, 70)},
}

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

def rnd(a, b, decimals=1):
    return round(random.uniform(a, b), decimals)


def seed_sessions():
    print("\n🏃 Seeding fitness sessions...")
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.fitness_sessions"

    schema = [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("player_id", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("session_date", "DATE", mode="REQUIRED"),
        bigquery.SchemaField("session_type", "STRING"),
        bigquery.SchemaField("top_speed_kmh", "FLOAT"),
        bigquery.SchemaField("distance_km", "FLOAT"),
        bigquery.SchemaField("hsd_m", "FLOAT"),
        bigquery.SchemaField("hr_avg_bpm", "INTEGER"),
        bigquery.SchemaField("hr_max_bpm", "INTEGER"),
        bigquery.SchemaField("total_load", "FLOAT"),
        bigquery.SchemaField("sprints", "INTEGER"),
        bigquery.SchemaField("accelerations", "INTEGER"),
        bigquery.SchemaField("decelerations", "INTEGER"),
        bigquery.SchemaField("is_live", "BOOLEAN"),
    ]

    print(f"  Checking table: {table_ref}")
    try:
        client.get_table(table_ref)
        print("  Table exists. Clearing data...")
        client.query(f"DELETE FROM `{table_ref}` WHERE 1=1").result()
    except Exception as e:
        print(f"  Table not found or error. Creating: {e}")
        table = bigquery.Table(table_ref, schema=schema)
        client.create_table(table, exists_ok=True)
        print("  Created fitness_sessions table.")

    rows = []
    today = datetime.now(timezone.utc).date()
    print(f"  Generating rows for {len(HFC_PLAYERS)} players...")

    for player_id, (name, status) in HFC_PLAYERS.items():
        pos = PLAYER_POSITIONS.get(player_id, "midfielder")
        profile = POSITION_PROFILES.get(pos, POSITION_PROFILES["midfielder"])

        if status == "Red":
            continue

        if status == "Amber":
            dist_range, speed_range, hr_range, hsd_range, sprint_range, acc_range = (3, 6), (18, 24), (120, 145), (200, 500), (0, 5), (10, 30)
            session_type = random.choice(["Rehab Pool", "Modified Training", "Bike Session"])
        else:
            dist_range, speed_range, hr_range, hsd_range, sprint_range, acc_range = profile["distance_km"], profile["top_speed"], profile["hr_avg"], profile["hsd_m"], profile["sprints"], profile["acc"]
            session_type = random.choice(["Pre-Season Training", "Match Simulation", "Skills Session", "Track Session"])

        for days_ago in range(7, 0, -1):
            session_date = today - timedelta(days=days_ago)
            if session_date.weekday() == 6 and random.random() > 0.3: continue

            rows.append({
                "id": str(uuid.uuid4()),
                "player_id": player_id,
                "session_date": session_date.isoformat(),
                "session_type": session_type,
                "top_speed_kmh": rnd(*speed_range),
                "distance_km": rnd(*dist_range),
                "hsd_m": float(random.randint(*hsd_range)),
                "hr_avg_bpm": random.randint(*hr_range),
                "hr_max_bpm": min(220, random.randint(*hr_range) + random.randint(15, 35)),
                "total_load": rnd(200, 600),
                "sprints": random.randint(*sprint_range),
                "accelerations": random.randint(*acc_range),
                "decelerations": int(random.randint(*acc_range) * random.uniform(0.7, 1.1)),
                "is_live": days_ago == 1,
            })

    print(f"  Inserting {len(rows)} rows...")
    errors = client.insert_rows_json(table_ref, rows)
    if errors:
        print(f"  ⚠️  Insert Errors: {errors[:2]}")
    else:
        print("  ✅ Sessions seeded.")


def seed_pbs():
    print("\n🏆 Seeding personal bests...")
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.fitness_pbs"

    schema = [
        bigquery.SchemaField("player_id", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("run_2k_seconds", "INTEGER"),      # 2km time trial
        bigquery.SchemaField("bench_press_kg", "FLOAT"),        # Max bench press
        bigquery.SchemaField("squat_kg", "FLOAT"),              # Max back squat
        bigquery.SchemaField("vertical_jump_cm", "FLOAT"),      # Standing vertical jump
        bigquery.SchemaField("beep_test_level", "FLOAT"),       # Beep test level (e.g. 14.2)
        bigquery.SchemaField("top_speed_kmh", "FLOAT"),         # Season best top speed GPS
        bigquery.SchemaField("sprint_10m_s", "FLOAT"),          # 10m sprint time
        bigquery.SchemaField("sprint_40m_s", "FLOAT"),          # 40m sprint time
        bigquery.SchemaField("date_recorded", "DATE"),
    ]

    try:
        client.get_table(table_ref)
        client.query(f"DELETE FROM `{table_ref}` WHERE 1=1").result()
        print("  Cleared existing PBs.")
    except Exception:
        client.create_table(bigquery.Table(table_ref, schema=schema))
        print("  Created fitness_pbs table.")

    # Elite AFL ranges
    PB_RANGES = {
        "midfielder": {
            "run_2k": (385, 430),  # seconds (~6:25 - 7:10)
            "bench_kg": (85, 120),
            "squat_kg": (100, 150),
            "vertical_cm": (62, 78),
            "beep": (13.0, 15.5),
            "top_speed": (33, 36),
            "sprint_10m": (1.60, 1.75),
            "sprint_40m": (4.85, 5.15),
        },
        "forward": {
            "run_2k": (395, 440),
            "bench_kg": (90, 125),
            "squat_kg": (110, 160),
            "vertical_cm": (65, 82),
            "beep": (12.5, 14.5),
            "top_speed": (33, 37),
            "sprint_10m": (1.58, 1.73),
            "sprint_40m": (4.80, 5.10),
        },
        "defender": {
            "run_2k": (390, 435),
            "bench_kg": (90, 130),
            "squat_kg": (115, 165),
            "vertical_cm": (63, 80),
            "beep": (12.8, 15.0),
            "top_speed": (32, 35),
            "sprint_10m": (1.62, 1.78),
            "sprint_40m": (4.90, 5.20),
        },
        "ruck": {
            "run_2k": (415, 480),
            "bench_kg": (105, 145),
            "squat_kg": (130, 185),
            "vertical_cm": (65, 80),
            "beep": (11.0, 13.5),
            "top_speed": (29, 33),
            "sprint_10m": (1.70, 1.88),
            "sprint_40m": (5.05, 5.40),
        },
    }

    rows = []
    today = datetime.now(timezone.utc).date()

    for player_id, (name, status) in HFC_PLAYERS.items():
        pos = PLAYER_POSITIONS.get(player_id, "midfielder")
        r = PB_RANGES[pos]

        rows.append({
            "player_id": player_id,
            "run_2k_seconds": random.randint(*r["run_2k"]),
            "bench_press_kg": rnd(*r["bench_kg"]),
            "squat_kg": rnd(*r["squat_kg"]),
            "vertical_jump_cm": rnd(*r["vertical_cm"]),
            "beep_test_level": rnd(*r["beep"]),
            "top_speed_kmh": rnd(*r["top_speed"]),
            "sprint_10m_s": rnd(*r["sprint_10m"], decimals=2),
            "sprint_40m_s": rnd(*r["sprint_40m"], decimals=2),
            "date_recorded": (today - timedelta(days=random.randint(0, 60))).isoformat(),
        })

    errors = client.insert_rows_json(table_ref, rows)
    if errors:
        print(f"  ⚠️  Errors: {errors[:2]}")
    else:
        print(f"  ✅ {len(rows)} PB rows inserted.")


if __name__ == "__main__":
    print("🦅 Seeding fitness data for Hawthorn FC...")
    seed_sessions()
    seed_pbs()
    print("\n✅ Fitness data seeded successfully!")
