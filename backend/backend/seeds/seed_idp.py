"""
The Hawk Hub — IDP Ratings Seed Script

Creates the idp_ratings table and seeds one IDP assessment per player (44 records)
with experience-weighted scores.

IDP Categories (1-10):
    Grit, TacticalIQ, Execution, Resilience, Leadership

Usage:
    python seeds/seed_idp.py
"""

import os
import random
from datetime import datetime, timedelta, timezone

from google.cloud import bigquery
from google.api_core.exceptions import NotFound

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "bill-sandpit")
DATASET_ID = "hfc_performance_hub"
TABLE_ID = "idp_ratings"

# Player data: (jumper_no, name, games, position)
# Used to weight IDP scores realistically
PLAYERS = [
    (1, 'Harry Morrison', 90, 'Mid/Def'),
    (2, 'Mitchell Lewis', 75, 'Key Forward'),
    (3, 'Jai Newcombe', 60, 'Midfielder'),
    (4, 'Jarman Impey', 180, 'Defender'),
    (5, 'James Worpel', 110, 'Midfielder'),
    (6, 'James Sicily', 140, 'Defender'),
    (7, 'Ned Reeves', 45, 'Ruck'),
    (8, 'Sam Frost', 160, 'Key Def'),
    (9, 'Changkuoth Jiath', 50, 'Def/Mid'),
    (10, 'Karl Amon', 140, 'Midfielder'),
    (11, 'Conor Nash', 85, 'Midfielder'),
    (12, 'Will Day', 60, 'Mid/Def'),
    (13, 'Dylan Moore', 80, 'Forward'),
    (14, 'Jack Scrimshaw', 85, 'Defender'),
    (15, 'Blake Hardwick', 150, 'Defender'),
    (16, "Massimo D'Ambrosio", 15, 'Def/Mid'),
    (17, 'Lloyd Meek', 30, 'Ruck'),
    (18, 'Mabior Chol', 65, 'Key Forward'),
    (19, 'Jack Ginnivan', 45, 'Forward'),
    (20, 'Chad Wingard', 220, 'Forward'),
    (21, 'Nick Watson', 10, 'Forward'),
    (22, 'Luke Breust', 285, 'Forward'),
    (23, 'Josh Weddle', 20, 'Defender'),
    (24, 'Denver Grainger-Barras', 30, 'Key Def'),
    (25, 'Josh Ward', 35, 'Midfielder'),
    (26, 'Bodie Ryan', 0, 'Defender'),
    (27, 'Will McCabe', 0, 'Key Def'),
    (28, 'Cam Mackenzie', 15, 'Midfielder'),
    (29, 'Jai Serong', 10, 'Mid/Fwd'),
    (30, 'Sam Butler', 20, 'Forward'),
    (31, 'Connor MacDonald', 40, 'Mid/Fwd'),
    (32, 'Finn Maginness', 35, 'Midfielder'),
    (33, "Jack O'Sullivan", 0, 'Forward'),
    (34, 'Ethan Phillips', 0, 'Def'),
    (35, 'Calsher Dear', 0, 'Key Fwd'),
    (36, 'James Blanck', 30, 'Key Def'),
    (37, 'Josh Bennetts', 0, 'Forward'),
    (38, 'Max Ramsden', 5, 'Ruck/Fwd'),
    (39, 'Bailey Macdonald', 2, 'Defender'),
    (40, 'Seamus Mitchell', 15, 'Def/Fwd'),
    (41, 'Josh Tucker', 0, 'Forward'),
    (42, 'Clay Tucker', 0, 'Ruck'),
    (43, 'Jack Gunston', 250, 'Forward'),
    (44, 'Henry Hustwaite', 5, 'Midfielder'),
]


def experience_tier(games: int) -> str:
    """Classify player by experience."""
    if games >= 150:
        return "elite"
    elif games >= 75:
        return "established"
    elif games >= 25:
        return "developing"
    else:
        return "rookie"


def generate_idp_ratings():
    """Generate realistic IDP ratings based on experience and position."""
    records = []
    now = datetime.now(timezone.utc)

    for jumper_no, name, games, position in PLAYERS:
        tier = experience_tier(games)

        # Base ranges by tier
        ranges = {
            "elite":       {"grit": (8, 10), "tiq": (8, 10), "exec": (8, 10), "res": (8, 10), "lead": (8, 10)},
            "established": {"grit": (7, 9),  "tiq": (6, 9),  "exec": (7, 9),  "res": (7, 9),  "lead": (6, 8)},
            "developing":  {"grit": (6, 8),  "tiq": (5, 8),  "exec": (6, 8),  "res": (6, 8),  "lead": (4, 7)},
            "rookie":      {"grit": (5, 8),  "tiq": (4, 7),  "exec": (5, 7),  "res": (5, 7),  "lead": (3, 6)},
        }
        r = ranges[tier]

        grit = random.randint(*r["grit"])
        tactical_iq = random.randint(*r["tiq"])
        execution = random.randint(*r["exec"])
        resilience = random.randint(*r["res"])
        leadership = random.randint(*r["lead"])

        # Known overrides for key players
        if jumper_no == 6:  # James Sicily (Captain)
            leadership = 10
            grit = max(grit, 9)
        elif jumper_no == 22:  # Luke Breust (Vice-Captain)
            leadership = 10
            execution = max(execution, 9)
        elif jumper_no == 3:  # Jai Newcombe
            grit = 10
            execution = max(execution, 9)
        elif jumper_no == 12:  # Will Day
            tactical_iq = 10
            execution = max(execution, 9)
        elif jumper_no == 13:  # Dylan Moore
            grit = 10
            leadership = max(leadership, 9)
        elif jumper_no == 43:  # Jack Gunston
            tactical_iq = max(tactical_iq, 9)
            execution = max(execution, 9)

        # Composite: weighted average
        composite = round(
            grit * 0.20 + tactical_iq * 0.20 + execution * 0.25
            + resilience * 0.20 + leadership * 0.15,
            1,
        )

        # Assessment date: random within last 14 days
        assessed = now - timedelta(days=random.randint(0, 14))

        records.append({
            "player_id": jumper_no,
            "grit": grit,
            "tactical_iq": tactical_iq,
            "execution": execution,
            "resilience": resilience,
            "leadership": leadership,
            "composite_score": composite,
            "assessed_at": assessed.isoformat(),
        })

    return records


def seed_idp():
    client = bigquery.Client(project=PROJECT_ID)
    dataset_ref = client.dataset(DATASET_ID)
    table_ref = dataset_ref.table(TABLE_ID)

    schema = [
        bigquery.SchemaField("player_id", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("grit", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("tactical_iq", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("execution", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("resilience", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("leadership", "INTEGER", mode="REQUIRED"),
        bigquery.SchemaField("composite_score", "FLOAT", mode="REQUIRED"),
        bigquery.SchemaField("assessed_at", "TIMESTAMP", mode="REQUIRED"),
    ]

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
    records = generate_idp_ratings()
    errors = client.insert_rows_json(table_ref, records)

    if errors:
        print(f"Errors inserting rows: {errors[:3]}...")
    else:
        print(f"Successfully inserted {len(records)} IDP ratings.")


if __name__ == "__main__":
    seed_idp()
