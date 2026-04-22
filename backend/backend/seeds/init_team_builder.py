import os
from google.cloud import bigquery

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "bill-sandpit")
DATASET_ID = "hfc_performance_hub"

import time

def init_team_selections():
    client = bigquery.Client(project=PROJECT_ID)
    table_id = "team_selections"
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.{table_id}"

    # Define schema
    schema = [
        bigquery.SchemaField("position_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("player_id", "INTEGER"),
        bigquery.SchemaField("notes", "STRING"),
        bigquery.SchemaField("updated_at", "TIMESTAMP"),
    ]

    # Create table
    try:
        client.delete_table(table_ref, not_found_ok=True)
        table = bigquery.Table(table_ref, schema=schema)
        table = client.create_table(table)
        print(f"Created table {table_ref}")
        # Allow time for BigQuery propagation
        time.sleep(5)
    except Exception as e:
        print(f"Error creating table: {e}")
        return

    # Initialize with 27 empty slots (18 on-field, 5 bench, 4 consideration)
    positions = [
        # Full Backs
        "B_LEFT", "FB", "B_RIGHT",
        # Half Backs
        "HB_LEFT", "CHB", "HB_RIGHT",
        # Centers
        "W_LEFT", "C", "W_RIGHT",
        # Half Forwards
        "HF_LEFT", "CHF", "HF_RIGHT",
        # Full Forwards
        "FP_LEFT", "FF", "FP_RIGHT",
        # Followers
        "R", "RR", "ROV",
        # Bench
        "BENCH_1", "BENCH_2", "BENCH_3", "BENCH_4", "BENCH_5",
        # Consideration
        "CONSID_1", "CONSID_2", "CONSID_3", "CONSID_4"
    ]

    rows_to_insert = [
        {"position_id": pos, "player_id": None, "notes": "", "updated_at": None}
        for pos in positions
    ]

    # Retry loop for insertion (BigQuery eventual consistency)
    max_retries = 3
    for attempt in range(max_retries):
        try:
            errors = client.insert_rows_json(table, rows_to_insert)
            if not errors:
                print(f"Successfully initialized {len(rows_to_insert)} empty positions in {table_id}")
                return
            else:
                print(f"Errors initializing {table_id}: {errors}")
                return
        except Exception as e:
            err_msg = str(e).lower()
            if "not found" in err_msg and attempt < max_retries - 1:
                print(f"Table not yet propagated. Retrying in 5s... (Attempt {attempt + 1}/{max_retries})")
                time.sleep(5)
            else:
                print(f"Fatal error during insertion: {e}")
                return

if __name__ == "__main__":
    init_team_selections()
