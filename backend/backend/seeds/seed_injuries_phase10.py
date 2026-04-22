"""
The Hawk Hub — Seed Injury History (Phase 10)

Populates `injury_logs` with variety of statuses (Active, Recovering, Cleared).
Updates player statuses in BigQuery to match.
"""

from google.cloud import bigquery
import uuid
import random
from datetime import datetime, timedelta
import os

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "bill-sandpit")
DATASET_ID = "hfc_performance_hub"

INJURIES = [
    ("Hamstring Strain", "Moderate", "Active"),
    ("ACL Rupture", "Major", "Active"),
    ("Ankle Sprain", "Minor", "Recovering"),
    ("Concussion", "Moderate", "Recovering"),
    ("Quad Tightness", "Minor", "Active"),
    ("Knee Soreness", "Minor", "Cleared"),
    ("Hip Pointer", "Moderate", "Cleared"),
    ("Finger Fracture", "Minor", "Cleared"),
    ("Calf Tear", "Moderate", "Active"),
]

def seed_injuries():
    client = bigquery.Client()
    table_id = f"{PROJECT_ID}.{DATASET_ID}.injury_logs"
    player_table = f"{PROJECT_ID}.{DATASET_ID}.players_2026"
    
    rows_to_insert = []
    
    # Pick 10 random players to have injuries
    impacted_players = random.sample(range(1, 45), 10)
    
    print(f"Generating injuries for {len(impacted_players)} players...")
    
    for player_id in impacted_players:
        # Generate 1-3 injuries per player
        num_injuries = random.randint(1, 3)
        for _ in range(num_injuries):
            injury_type, severity, status = random.choice(INJURIES)
            
            # For multiple injuries, only one can be "Active" or "Recovering" (the latest one)
            # In simpler logic, we'll just insert records and manually update player status at the end
            date = (datetime.now() - timedelta(days=random.randint(0, 90))).strftime("%Y-%m-%d")
            
            rows_to_insert.append({
                "id": str(uuid.uuid4()),
                "player_id": player_id,
                "injury_type": injury_type,
                "body_area": "Unspecified", # Defaulted since removed from UI
                "severity": severity,
                "contact_load": 0,
                "status": status,
                "notes": "Seeded via Phase 10 script",
                "date": date,
                "created_at": datetime.now().isoformat()
            })

    # Insert injuries
    errors = client.insert_rows_json(table_id, rows_to_insert)
    if errors:
        print(f"⚠️ Errors inserting injuries: {errors}")
    else:
        print(f"✅ {len(rows_to_insert)} injury rows inserted.")

    # Update player statuses to match the LATEST injury
    for player_id in impacted_players:
        player_logs = [l for l in rows_to_insert if l["player_id"] == player_id]
        latest_log = max(player_logs, key=lambda x: x["date"])
        
        # Mapping for player table status
        new_status = "Green"
        if latest_log["status"] == "Active":
            new_status = "Red" if latest_log["severity"] == "Major" else "Amber"
        elif latest_log["status"] == "Recovering":
            new_status = "Amber"
            
        update_query = f"""
            UPDATE `{player_table}`
            SET status = '{new_status}'
            WHERE jumper_no = {player_id}
        """
        client.query(update_query).result()
        print(f"✅ Player #{player_id} updated to status: {new_status}")

def init_table():
    client = bigquery.Client()
    table_id = f"{PROJECT_ID}.{DATASET_ID}.injury_logs"
    
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
    
    table = bigquery.Table(table_id, schema=schema)
    try:
        client.get_table(table_id)
        print(f"Table {table_id} already exists.")
    except Exception:
        print(f"Table {table_id} not found. Creating...")
        client.create_table(table)
        print(f"Table {table_id} created.")

if __name__ == "__main__":
    init_table()
    
    # Clear existing injuries first to avoid duplicates
    client = bigquery.Client()
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.injury_logs"
    client.query(f"DELETE FROM `{table_ref}` WHERE 1=1").result()
    print("🗑️ Cleared existing injury logs.")
    
    seed_injuries()
