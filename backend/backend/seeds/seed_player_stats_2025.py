import os
import random
from google.cloud import bigquery

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "bill-sandpit")
DATASET_ID = "hfc_performance_hub"

def seed_player_stats():
    client = bigquery.Client(project=PROJECT_ID)
    table_id = "player_stats_2025"
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.table_id" # Wait, fixed ref below
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.{table_id}"

    # Define schema
    schema = [
        bigquery.SchemaField("jumper_no", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("games_played", "INTEGER"),
        bigquery.SchemaField("af_avg", "FLOAT"),
        bigquery.SchemaField("rating_points", "FLOAT"), # "R" in the image
        bigquery.SchemaField("goals_avg", "FLOAT"),
        bigquery.SchemaField("disposals_avg", "FLOAT"),
        bigquery.SchemaField("marks_avg", "FLOAT"),
        bigquery.SchemaField("tackles_avg", "FLOAT"),
        bigquery.SchemaField("clearances_avg", "FLOAT"),
        bigquery.SchemaField("kicks_avg", "FLOAT"),
        bigquery.SchemaField("handballs_avg", "FLOAT"),
        bigquery.SchemaField("hitouts_avg", "FLOAT"),
    ]

    # Create table
    try:
        client.delete_table(table_ref, not_found_ok=True)
        table = bigquery.Table(table_ref, schema=schema)
        table = client.create_table(table)
        print(f"Created table {table_ref}")
    except Exception as e:
        print(f"Error creating table: {e}")
        return

    # Fetch all current players
    players_query = f"SELECT jumper_no FROM `{PROJECT_ID}.{DATASET_ID}.players_2026`"
    players = [row.jumper_no for row in client.query(players_query)]

    rows_to_insert = []
    for jn in players:
        games = random.randint(18, 23)
        # Random but realistic averages for HFC/AFL
        disposals = random.uniform(15, 30)
        kicks = disposals * random.uniform(0.5, 0.7)
        handballs = disposals - kicks
        
        rows_to_insert.append({
            "jumper_no": jn,
            "games_played": games,
            "af_avg": round(random.uniform(70, 110), 1),
            "rating_points": round(random.uniform(100, 600), 1), # Simulating "R" column
            "goals_avg": round(random.uniform(0, 2.5), 1),
            "disposals_avg": round(disposals, 1),
            "marks_avg": round(random.uniform(2, 7), 1),
            "tackles_avg": round(random.uniform(1, 6), 1),
            "clearances_avg": round(random.uniform(0, 8), 1),
            "kicks_avg": round(kicks, 1),
            "handballs_avg": round(handballs, 1),
            "hitouts_avg": round(random.uniform(0, 35) if random.random() < 0.1 else 0, 1), # Mostly 0 except rucks
        })

    errors = client.insert_rows_json(table_ref, rows_to_insert)
    if not errors:
        print(f"Successfully seeded {len(rows_to_insert)} players into {table_id}")
    else:
        print(f"Errors seeding {table_id}: {errors}")

if __name__ == "__main__":
    seed_player_stats()
