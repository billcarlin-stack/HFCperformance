"""
The Hawk Hub — BigQuery Seed Script

Seeds the hfc_performance_hub dataset with the 2026 projected roster.
This is the original seed script, preserved in the seeds/ directory.

Usage:
    python seeds/seed_bq_2026.py
"""

from google.cloud import bigquery
from google.api_core.exceptions import Conflict
import os

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "bill-sandpit")
DATASET_ID = "hfc_performance_hub"
TABLE_ID = "players_2026"

# 2026 Roster Data (Projected)
PLAYERS = [
    {'jumper_no': 1, 'name': 'Harry Morrison', 'age': 25, 'height_cm': 184, 'games': 90, 'position': 'Mid/Def', 'status': 'Green'},
    {'jumper_no': 2, 'name': 'Mitchell Lewis', 'age': 25, 'height_cm': 199, 'games': 75, 'position': 'Key Forward', 'status': 'Amber'},
    {'jumper_no': 3, 'name': 'Jai Newcombe', 'age': 22, 'height_cm': 186, 'games': 60, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 4, 'name': 'Jarman Impey', 'age': 28, 'height_cm': 178, 'games': 180, 'position': 'Defender', 'status': 'Green'},
    {'jumper_no': 5, 'name': 'James Worpel', 'age': 25, 'height_cm': 186, 'games': 110, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 6, 'name': 'James Sicily', 'age': 29, 'height_cm': 188, 'games': 140, 'position': 'Defender', 'status': 'Green'},
    {'jumper_no': 7, 'name': 'Ned Reeves', 'age': 25, 'height_cm': 210, 'games': 45, 'position': 'Ruck', 'status': 'Green'},
    {'jumper_no': 8, 'name': 'Sam Frost', 'age': 30, 'height_cm': 194, 'games': 160, 'position': 'Key Def', 'status': 'Amber'},
    {'jumper_no': 9, 'name': 'Changkuoth Jiath', 'age': 24, 'height_cm': 185, 'games': 50, 'position': 'Def/Mid', 'status': 'Red'},
    {'jumper_no': 10, 'name': 'Karl Amon', 'age': 28, 'height_cm': 181, 'games': 140, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 11, 'name': 'Conor Nash', 'age': 25, 'height_cm': 198, 'games': 85, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 12, 'name': 'Will Day', 'age': 22, 'height_cm': 189, 'games': 60, 'position': 'Mid/Def', 'status': 'Green'},
    {'jumper_no': 13, 'name': 'Dylan Moore', 'age': 24, 'height_cm': 177, 'games': 80, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 14, 'name': 'Jack Scrimshaw', 'age': 25, 'height_cm': 193, 'games': 85, 'position': 'Defender', 'status': 'Green'},
    {'jumper_no': 15, 'name': 'Blake Hardwick', 'age': 27, 'height_cm': 182, 'games': 150, 'position': 'Defender', 'status': 'Green'},
    {'jumper_no': 16, 'name': "Massimo D'Ambrosio", 'age': 20, 'height_cm': 178, 'games': 15, 'position': 'Def/Mid', 'status': 'Green'},
    {'jumper_no': 17, 'name': 'Lloyd Meek', 'age': 25, 'height_cm': 204, 'games': 30, 'position': 'Ruck', 'status': 'Green'},
    {'jumper_no': 18, 'name': 'Mabior Chol', 'age': 27, 'height_cm': 200, 'games': 65, 'position': 'Key Forward', 'status': 'Amber'},
    {'jumper_no': 19, 'name': 'Jack Ginnivan', 'age': 21, 'height_cm': 177, 'games': 45, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 20, 'name': 'Chad Wingard', 'age': 30, 'height_cm': 182, 'games': 220, 'position': 'Forward', 'status': 'Red'},
    {'jumper_no': 21, 'name': 'Nick Watson', 'age': 19, 'height_cm': 170, 'games': 10, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 22, 'name': 'Luke Breust', 'age': 33, 'height_cm': 184, 'games': 285, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 23, 'name': 'Josh Weddle', 'age': 19, 'height_cm': 192, 'games': 20, 'position': 'Defender', 'status': 'Green'},
    {'jumper_no': 24, 'name': 'Denver Grainger-Barras', 'age': 21, 'height_cm': 195, 'games': 30, 'position': 'Key Def', 'status': 'Amber'},
    {'jumper_no': 25, 'name': 'Josh Ward', 'age': 20, 'height_cm': 182, 'games': 35, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 26, 'name': 'Bodie Ryan', 'age': 18, 'height_cm': 188, 'games': 0, 'position': 'Defender', 'status': 'Green'},
    {'jumper_no': 27, 'name': 'Will McCabe', 'age': 18, 'height_cm': 197, 'games': 0, 'position': 'Key Def', 'status': 'Green'},
    {'jumper_no': 28, 'name': 'Cam Mackenzie', 'age': 20, 'height_cm': 188, 'games': 15, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 29, 'name': 'Jai Serong', 'age': 21, 'height_cm': 193, 'games': 10, 'position': 'Mid/Fwd', 'status': 'Green'},
    {'jumper_no': 30, 'name': 'Sam Butler', 'age': 21, 'height_cm': 184, 'games': 20, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 31, 'name': 'Connor MacDonald', 'age': 21, 'height_cm': 185, 'games': 40, 'position': 'Mid/Fwd', 'status': 'Green'},
    {'jumper_no': 32, 'name': 'Finn Maginness', 'age': 23, 'height_cm': 189, 'games': 35, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 33, 'name': "Jack O'Sullivan", 'age': 19, 'height_cm': 177, 'games': 0, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 34, 'name': 'Ethan Phillips', 'age': 24, 'height_cm': 196, 'games': 0, 'position': 'Def', 'status': 'Green'},
    {'jumper_no': 35, 'name': 'Calsher Dear', 'age': 18, 'height_cm': 194, 'games': 0, 'position': 'Key Fwd', 'status': 'Green'},
    {'jumper_no': 36, 'name': 'James Blanck', 'age': 23, 'height_cm': 196, 'games': 30, 'position': 'Key Def', 'status': 'Red'},
    {'jumper_no': 37, 'name': 'Josh Bennetts', 'age': 19, 'height_cm': 178, 'games': 0, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 38, 'name': 'Max Ramsden', 'age': 21, 'height_cm': 203, 'games': 5, 'position': 'Ruck/Fwd', 'status': 'Green'},
    {'jumper_no': 39, 'name': 'Bailey Macdonald', 'age': 19, 'height_cm': 183, 'games': 2, 'position': 'Defender', 'status': 'Green'},
    {'jumper_no': 40, 'name': 'Seamus Mitchell', 'age': 22, 'height_cm': 181, 'games': 15, 'position': 'Def/Fwd', 'status': 'Green'},
    {'jumper_no': 41, 'name': 'Josh Tucker', 'age': 20, 'height_cm': 175, 'games': 0, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 42, 'name': 'Clay Tucker', 'age': 19, 'height_cm': 204, 'games': 0, 'position': 'Ruck', 'status': 'Green'},
    {'jumper_no': 43, 'name': 'Jack Gunston', 'age': 32, 'height_cm': 193, 'games': 250, 'position': 'Forward', 'status': 'Amber'},
    {'jumper_no': 44, 'name': 'Henry Hustwaite', 'age': 19, 'height_cm': 195, 'games': 5, 'position': 'Midfielder', 'status': 'Green'},
]


def seed_database():
    client = bigquery.Client()

    # Create Dataset
    dataset_ref = client.dataset(DATASET_ID)
    try:
        client.create_dataset(dataset_ref)
        print(f"Dataset {DATASET_ID} created.")
    except Conflict:
        print(f"Dataset {DATASET_ID} already exists.")

    # Create Table
    table_ref = dataset_ref.table(TABLE_ID)
    schema = [
        bigquery.SchemaField("jumper_no", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("name", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("age", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("height_cm", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("games", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("position", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("status", "STRING", mode="REQUIRED"),
    ]

    table = bigquery.Table(table_ref, schema=schema)

    try:
        client.create_table(table)
        print(f"Table {TABLE_ID} created.")
    except Conflict:
        print(f"Table {TABLE_ID} already exists. Deleting and recreating...")
        client.delete_table(table_ref)
        client.create_table(table)
        print(f"Table {TABLE_ID} recreated.")

    # Insert Data
    errors = client.insert_rows_json(table, PLAYERS)
    if errors:
        print(f"Encountered errors while inserting rows: {errors}")
    else:
        print(f"Successfully inserted {len(PLAYERS)} players into {DATASET_ID}.{TABLE_ID}.")


if __name__ == "__main__":
    seed_database()
