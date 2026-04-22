"""
The Nest — Master Seed Script

Seeds all BigQuery tables with realistic 2026 Hawthorn FC demo data:
  - Injuries (with player status updates)
  - Wellbeing surveys (sleep, soreness, stress scores)
  - Calendar events
  - Coach ratings

Usage:
    python seeds/seed_all.py
"""

import os
import uuid
import random
from datetime import datetime, timedelta, timezone

from google.cloud import bigquery

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "bill-sandpit")
DATASET_ID = "hfc_performance_hub"

client = bigquery.Client(project=PROJECT_ID)


# ── Hawthorn Player Roster ────────────────────────────────────────────────────
HFC_PLAYERS = {
    1: "Harry Morrison",
    2: "Mitchell Lewis",
    3: "Jai Newcombe",
    4: "Jarman Impey",
    5: "James Worpel",
    6: "James Sicily",
    7: "Ned Reeves",
    8: "Sam Frost",
    9: "Changkuoth Jiath",
    10: "Karl Amon",
    11: "Denver Grainger-Barras",
    12: "Will Day",
    13: "Dylan Moore",
    14: "Connor Macdonald",
    15: "Jack Scrimshaw",
    16: "Josh Weddle",
    17: "Calsher Dear",
    18: "Seamus Mitchell",
    19: "Jack Ginnivan",
    20: "Lachlan Bramble",
    21: "Nick Watson",
    22: "Luke Breust",
    23: "Finn Maginness",
    24: "James Blanck",
    25: "Josh Ward",
    26: "Max Ramsden",
    27: "Tyler Brockman",
    28: "Mabior Chol",
    29: "Nik Cox",
    30: "Lloyd Meek",
    31: "Jackson Ross",
    32: "Ned Long",
    33: "Emerson Woods",
    34: "Ryan Maric",
    35: "Campbell Chesser",
    36: "Hugo Ralphsmith",
    37: "Massimo D'Ambrosio",
    38: "Fisher McAsey",
    39: "Ollie Hannaford",
    40: "Harry Pepper",
    41: "James McCabe",
    42: "Wil Park",
    43: "Jack Gunston",
    44: "Patrick Voss",
}

ALL_JUMPERS = list(HFC_PLAYERS.keys())


# ── Helper ────────────────────────────────────────────────────────────────────
def run_query(sql):
    client.query(sql).result()


def insert_rows(table_name, rows):
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.{table_name}"
    errors = client.insert_rows_json(table_ref, rows)
    if errors:
        print(f"  ⚠️  Errors inserting into {table_name}: {errors[:2]}")
    else:
        print(f"  ✅ {len(rows)} rows inserted into {table_name}")


# ── Section 1: Injuries ───────────────────────────────────────────────────────
INJURY_POOL = [
    ("Hamstring Strain", "Left Hamstring", "Moderate"),
    ("ACL Rupture", "Right Knee", "Major"),
    ("Ankle Sprain", "Left Ankle", "Minor"),
    ("Concussion", "Head", "Moderate"),
    ("Quad Tightness", "Right Quad", "Minor"),
    ("Knee Soreness", "Left Knee", "Minor"),
    ("Calf Tear", "Right Calf", "Moderate"),
    ("Shoulder Subluxation", "Right Shoulder", "Moderate"),
    ("Finger Fracture", "Right Hand", "Minor"),
    ("Hip Pointer", "Left Hip", "Minor"),
    ("Groin Strain", "Groin", "Moderate"),
    ("Back Spasm", "Lower Back", "Minor"),
]

STATUSES = ["Active", "Recovering", "Cleared"]

def seed_injuries():
    print("\n📋 Seeding injury logs...")
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.injury_logs"
    
    # Ensure table exists
    schema = [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("player_id", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("injury_type", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("body_area", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("severity", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("contact_load", "INTEGER", mode="NULLABLE"),
        bigquery.SchemaField("status", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("notes", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("date", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="REQUIRED"),
    ]
    try:
        client.get_table(table_ref)
    except Exception:
        client.create_table(bigquery.Table(table_ref, schema=schema))
        print("  Created injury_logs table.")

    run_query(f"DELETE FROM `{table_ref}` WHERE 1=1")
    print("  Cleared existing injury logs.")

    rows = []
    # 12 players have injury history
    injured_players = random.sample(ALL_JUMPERS, 12)

    for player_id in injured_players:
        num = random.randint(1, 3)
        for i in range(num):
            inj_type, body_area, severity = random.choice(INJURY_POOL)
            # Latest injury determines current status; older ones are Cleared
            status = "Cleared" if i < num - 1 else random.choice(["Active", "Recovering", "Cleared"])
            days_ago = random.randint(5 if i == num - 1 else 30, 90)
            date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
            rows.append({
                "id": str(uuid.uuid4()),
                "player_id": player_id,
                "injury_type": inj_type,
                "body_area": body_area,
                "severity": severity,
                "contact_load": random.randint(0, 5),
                "status": status,
                "notes": f"{inj_type} sustained during {random.choice(['training', 'match', 'pre-season'])}. Monitoring closely.",
                "date": date,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

    insert_rows("injury_logs", rows)

    # Update player statuses
    player_table = f"{PROJECT_ID}.{DATASET_ID}.players_2026"
    for player_id in injured_players:
        player_logs = [l for l in rows if l["player_id"] == player_id]
        latest = max(player_logs, key=lambda x: x["date"])
        if latest["status"] == "Active":
            new_status = "Red" if latest["severity"] == "Major" else "Amber"
        elif latest["status"] == "Recovering":
            new_status = "Amber"
        else:
            new_status = "Green"
        run_query(f"UPDATE `{player_table}` SET status = '{new_status}' WHERE jumper_no = {player_id}")
    print(f"  ✅ Updated status for {len(injured_players)} players.")


# ── Section 2: Wellbeing Surveys ──────────────────────────────────────────────
NOTES_POOL = [
    "Feeling fresh after rest day",
    "Slight hamstring tightness from yesterday's session",
    "Good recovery overnight",
    "Legs feel heavy after match sim",
    "Slept well, no issues",
    "Bit of quad soreness from weights",
    "Recovery session helped a lot",
    "Feeling sharp and ready",
    "Managed load well this week",
    "Some calf tightness, monitoring",
    "Great energy today",
    "Lower back stiff from travel",
    "Solid sleep, feeling good",
    "Hydration was off yesterday",
    "Match day nerves, otherwise good",
    "",
    "",
]

def seed_wellbeing():
    print("\n💤 Seeding wellbeing surveys...")
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.wellbeing_surveys"
    schema = [
        bigquery.SchemaField("player_id", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("sleep_score", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("soreness_score", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("stress_score", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("notes", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("submitted_at", "TIMESTAMP", mode="REQUIRED"),
    ]
    try:
        client.get_table(table_ref)
        client.delete_table(table_ref)
    except Exception:
        pass
    client.create_table(bigquery.Table(table_ref, schema=schema))

    now = datetime.now(timezone.utc)
    rows = []
    for player_id in ALL_JUMPERS:
        # 10-14 surveys per player over last 30 days (daily-ish)
        num = random.randint(10, 14)
        for i in range(num):
            days_ago = random.randint(0, 30)
            hour = random.randint(6, 20)
            submitted = now - timedelta(days=days_ago, hours=hour)

            # base scores — most players are Green
            sleep = random.randint(7, 10)
            soreness = random.randint(7, 10)
            stress = random.randint(6, 9)

            # Amber / Red players have lower scores
            if player_id in [4, 14, 19, 21, 29, 31, 33, 43]:
                sleep = random.randint(4, 7)
                soreness = random.randint(3, 6)
                stress = random.randint(4, 7)

            rows.append({
                "player_id": player_id,
                "sleep_score": sleep,
                "soreness_score": soreness,
                "stress_score": stress,
                "notes": random.choice(NOTES_POOL),
                "submitted_at": submitted.isoformat(),
            })

    insert_rows("wellbeing_surveys", rows)


# ── Section 3: Calendar Events ────────────────────────────────────────────────
CALENDAR_EVENTS = [
    # Training
    ("Morning Skills Session", "Training", "Technical drills — kicking and handball on the oval.", 0, 1.5),
    ("Match Simulation", "Training", "Full ground 18v18 match sim. GPS and heart rate monitored.", 0, 2),
    ("Weights & S&C", "Training", "Strength and conditioning block — upper body focus.", 0, 1),
    ("Recovery Pool Session", "Training", "Cold water recovery and active stretching.", 0, 1),
    ("Video Analysis Session", "Training", "Review of opposition patterns and set plays.", 0, 1.5),
    ("contested-ball drill", "Training", "Centre bounce and stoppage work.", 0, 1),

    # Matches
    ("Round 1 — HFC vs Carlton", "Match", "MCG. Anzac weekend. Under lights.", 0, 3),
    ("Round 3 — HFC vs Richmond", "Match", "Marvel Stadium. Western Derby.", 0, 3),
    ("Round 5 — HFC vs Melbourne", "Match", "UTAS Stadium, Launceston.", 0, 3),
    ("Round 7 — HFC vs Geelong", "Match", "GMHBA Stadium. Away game.", 0, 3),

    # Medical
    ("Pre-Season Medical Screens", "Medical", "Full squad medical checks — bloods, ECG, body composition.", 0, 4),
    ("Injury Review — Sicily, Day", "Medical", "Hamstring and knee assessment with physio.", 0, 1),
    ("GPS Load Review", "Medical", "Weekly load monitoring review with sports scientists.", 0, 1),

    # Team
    ("Pre-Season Camp", "Team", "3-day bonding and leadership camp at Falls Creek.", -14, 72),
    ("Team Meeting — Strategy Review", "Team", "Coaching staff present game plan for Round 1.", 0, 1.5),
    ("Player Awards Night", "Team", "End of season celebration and awards ceremony.", 60, 3),
    ("WOOP Goals Review — Mid-Season", "Team", "Players present progress on individual WOOP goals.", 14, 2),
]

def seed_calendar():
    print("\n📅 Seeding calendar events...")
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.calendar_events"
    schema = [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("title", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("type", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("description", "STRING"),
        bigquery.SchemaField("start_time", "TIMESTAMP", mode="REQUIRED"),
        bigquery.SchemaField("end_time", "TIMESTAMP", mode="REQUIRED"),
        bigquery.SchemaField("player_ids", "INTEGER", mode="REPEATED"),
        bigquery.SchemaField("created_at", "TIMESTAMP"),
    ]
    try:
        client.get_table(table_ref)
        run_query(f"DELETE FROM `{table_ref}` WHERE 1=1")
        print("  Cleared existing calendar events.")
    except Exception:
        client.create_table(bigquery.Table(table_ref, schema=schema))
        print("  Created calendar_events table.")

    now = datetime.now(timezone.utc)
    rows = []
    
    for i, (title, event_type, desc, days_offset, duration_hours) in enumerate(CALENDAR_EVENTS):
        # Spread events: some past, some upcoming
        event_day_offset = days_offset + (i * 3) - 20  # Mix past and future
        start = now.replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=event_day_offset)
        end = start + timedelta(hours=duration_hours)
        
        rows.append({
            "id": str(uuid.uuid4()),
            "title": title,
            "type": event_type,
            "description": desc,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "player_ids": [],  # All squad unless specific
            "created_at": now.isoformat(),
        })

    insert_rows("calendar_events", rows)


# ── Section 4: Coach Ratings ──────────────────────────────────────────────────
SKILLS = [
    ("Technical", "Kicking"),
    ("Technical", "Handball"),
    ("Technical", "Marking"),
    ("Tactical", "Decision Making"),
    ("Tactical", "Positioning"),
    ("Physical", "Speed"),
    ("Physical", "Endurance"),
    ("Mental", "Resilience"),
    ("Mental", "Leadership"),
]

# Known good players get higher ratings
HIGH_PERFORMERS = [3, 5, 6, 10, 12, 13, 22, 25, 43]

def seed_coach_ratings():
    print("\n⭐ Seeding coach ratings...")
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.coach_ratings"
    
    schema = [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("player_id", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("skill_category", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("skill_name", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("rating_value", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("notes", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("date", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="REQUIRED"),
    ]
    
    try:
        client.get_table(table_ref)
        run_query(f"DELETE FROM `{table_ref}` WHERE 1=1")
        print("  Cleared existing coach ratings.")
    except Exception:
        client.create_table(bigquery.Table(table_ref, schema=schema))
        print("  Created coach_ratings table.")

    rows = []
    for player_id, name in HFC_PLAYERS.items():
        is_high = player_id in HIGH_PERFORMERS
        for category, skill in SKILLS:
            if is_high:
                rating = random.randint(7, 10)
            else:
                rating = random.randint(4, 8)
            
            rows.append({
                "id": str(uuid.uuid4()),
                "player_id": player_id,
                "skill_category": category,
                "skill_name": skill,
                "rating_value": rating,
                "notes": "" if random.random() > 0.3 else random.choice([
                    "Excellent improvement this pre-season",
                    "Needs work under pressure",
                    "Elite level — sets the standard",
                    "Work in progress — showing signs",
                    "Injury affected form — monitoring",
                    "Outstanding contested work",
                ]),
                "date": (datetime.now() - timedelta(days=random.randint(0, 14))).strftime("%Y-%m-%d"),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

    insert_rows("coach_ratings", rows)


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🦅 Hawthorn FC — The Nest: Seeding all data...")
    seed_injuries()
    seed_wellbeing()
    seed_calendar()
    seed_coach_ratings()
    print("\n✅ All data seeded successfully!")
