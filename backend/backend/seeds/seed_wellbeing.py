"""
The Hawk Hub — Wellbeing Surveys Seed Script

Creates the wellbeing_surveys table and seeds ~200 realistic survey records
across all 44 players (4-5 surveys each over recent weeks).

Usage:
    python seeds/seed_wellbeing.py
"""

import os
import random
from datetime import datetime, timedelta, timezone

from google.cloud import bigquery
from google.api_core.exceptions import Conflict, NotFound

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "bill-sandpit")
DATASET_ID = "hfc_performance_hub"
TABLE_ID = "wellbeing_surveys"

# Player statuses affect score ranges
PLAYER_STATUS = {
    1: "Green", 2: "Green", 3: "Green", 4: "Amber", 5: "Green",
    6: "Green", 7: "Green", 8: "Green", 9: "Green", 10: "Green",
    11: "Green", 12: "Green", 13: "Green", 14: "Red", 15: "Amber",
    16: "Green", 17: "Green", 18: "Green", 19: "Amber", 20: "Green",
    21: "Amber", 22: "Green", 23: "Green", 24: "Green", 25: "Green",
    26: "Green", 27: "Green", 28: "Green", 29: "Amber", 30: "Green",
    31: "Red", 32: "Green", 33: "Amber", 34: "Green", 35: "Green",
    36: "Green", 37: "Green", 38: "Green", 39: "Green", 40: "Green",
    41: "Green", 42: "Green", 43: "Red", 44: "Green",
}

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
    "",  # No notes
    "",
    "",
]


def generate_surveys():
    """Generate realistic survey data for all players."""
    surveys = []
    now = datetime.now(timezone.utc)

    for player_id, status in PLAYER_STATUS.items():
        # 4-6 surveys per player over last 3 weeks
        num_surveys = random.randint(4, 6)

        for i in range(num_surveys):
            # Spread surveys across last 21 days
            days_ago = random.randint(0, 21)
            hours = random.randint(6, 20)  # Submitted between 6am-8pm
            submitted = now - timedelta(days=days_ago, hours=hours)

            # Score ranges based on status
            if status == "Green":
                sleep = random.randint(7, 10)
                soreness = random.randint(7, 10)
                stress = random.randint(7, 10)
            elif status == "Amber":
                sleep = random.randint(5, 8)
                soreness = random.randint(4, 7)
                stress = random.randint(5, 8)
            else:  # Red
                sleep = random.randint(3, 7)
                soreness = random.randint(2, 5)
                stress = random.randint(4, 7)

            surveys.append({
                "player_id": player_id,
                "sleep_score": sleep,
                "soreness_score": soreness,
                "stress_score": stress,
                "notes": random.choice(NOTES_POOL),
                "submitted_at": submitted.isoformat(),
            })

    return surveys


def seed_wellbeing():
    client = bigquery.Client(project=PROJECT_ID)
    dataset_ref = client.dataset(DATASET_ID)
    table_ref = dataset_ref.table(TABLE_ID)

    schema = [
        bigquery.SchemaField("player_id", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("sleep_score", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("soreness_score", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("stress_score", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("notes", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("submitted_at", "TIMESTAMP", mode="REQUIRED"),
    ]

    table = bigquery.Table(table_ref, schema=schema)

    # Create or recreate table
    try:
        client.get_table(table_ref)
        print(f"Table {TABLE_ID} exists. Deleting and recreating...")
        client.delete_table(table_ref)
    except NotFound:
        pass

    client.create_table(bigquery.Table(table_ref, schema=schema))
    print(f"Table {TABLE_ID} created.")

    # Generate and insert data
    surveys = generate_surveys()
    errors = client.insert_rows_json(table_ref, surveys)

    if errors:
        print(f"Errors inserting rows: {errors[:3]}...")
    else:
        print(f"Successfully inserted {len(surveys)} wellbeing surveys.")


if __name__ == "__main__":
    seed_wellbeing()
