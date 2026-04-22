import os
import uuid
from datetime import datetime, timezone
from google.cloud import bigquery

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "bill-sandpit")
DATASET_ID = "hfc_performance_hub"
TABLE_ID = "woop_goals"

WISHES = [
    ("Improve Disposal Efficiency", "Hit targets @ 85%+", "Fatigue", "Breath before kick"),
    ("Increase Contested Possessions", "Match avg > 10", "Opponent strength", "Low center of gravity"),
    ("Elite Recovery Routine", "0 soreness issues", "Late nights", "Set 9pm phone alarm"),
    ("Leadership on field", "Vocal in defense", "Natural introversion", "Find 3 triggers per quarter"),
    ("Sprint Speed Maintenance", "Hit top speed weekly", "Tight calves", "Extra 10m dynamic warmup"),
    ("Tactical Mastery", "Zero missed rotations", "Complex structures", "Review game film MON morning")
]

def seed_woop():
    client = bigquery.Client(project=PROJECT_ID)
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"

    # Ensure table exists (schema logic from routes/woop.py)
    schema = [
        bigquery.SchemaField("id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("player_id", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("wish", "STRING"),
        bigquery.SchemaField("outcome", "STRING"),
        bigquery.SchemaField("obstacle", "STRING"),
        bigquery.SchemaField("plan", "STRING"),
        bigquery.SchemaField("status", "STRING"),
        bigquery.SchemaField("week_of", "STRING"),
        bigquery.SchemaField("created_at", "TIMESTAMP"),
    ]
    
    try:
        client.get_table(table_ref)
        print("Table exists, clearing old WOOP goals...")
        client.query(f"DELETE FROM `{table_ref}` WHERE 1=1").result()
    except Exception:
        print("Creating table...")
        table = bigquery.Table(table_ref, schema=schema)
        client.create_table(table)

    records = []
    for player_id in range(1, 45):
        # 2 goals per player
        import random
        selected_wishes = random.sample(WISHES, 2)
        
        for wish, outcome, obstacle, plan in selected_wishes:
            records.append({
                "id": str(uuid.uuid4())[:8],
                "player_id": player_id,
                "wish": wish,
                "outcome": outcome,
                "obstacle": obstacle,
                "plan": plan,
                "status": "active",
                "week_of": datetime.now().strftime("%Y-W%W"),
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    errors = client.insert_rows_json(table_ref, records)
    if errors:
        print(f"Errors inserting: {errors}")
    else:
        print(f"Seeded {len(records)} WOOP goals for 44 players.")

if __name__ == "__main__":
    seed_woop()
