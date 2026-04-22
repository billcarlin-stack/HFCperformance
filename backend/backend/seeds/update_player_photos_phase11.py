"""Update player photos for Hawthorn using Name-based mapping (Phase 13)."""
from google.cloud import bigquery
import urllib.parse
import os

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "bill-sandpit")
DATASET_ID = "hfc_performance_hub"
TABLE_ID = f"{PROJECT_ID}.{DATASET_ID}.players_2026"

BASE_URL = "https://s.afl.com.au/staticfile/AFL%20Tenant/AFL/Players/ChampIDImages/AFL"

# Correct mapping of Names to (champion_data_id, comp_season_id)
PHOTO_MAP = {
    "Harry Sheezel":    ("1024349", "2026014"),
    "George Wardlaw":   ("1024350", "2026014"),
    "Nick Larkey":      ("1001017", "2026014"),
    "Colby McKercher":  ("1027931", "2026014"),
    "Zane Duursma":     ("1023494", "2026014"),
    "L. Davies-Uniacke": ("1000958", "2026014"),
    "Tristan Xerri":    ("1001004", "2026014"),
    "Jy Simpkin":       ("1000918", "2026014"),
    "Luke McDonald":    ("296355",  "2026014"),
    "Jack Darling":     ("291244",  "2026014"),
    "Caleb Daniel":     ("297495",  "2026014"),
    "Luke Parker":      ("291316",  "2026014"),
    "Finn O'Sullivan":  ("1033100", "2026014"),
    "Aidan Corr":       ("294132",  "2026014"),
    "Tom Powell":       ("1010720", "2026014"),
    "Bailey Scott":     ("1008638", "2026014"),
    "Griffin Logue":    ("1005115", "2026014"),
    "Charlie Comben":   ("1013094", "2026014"),
    "Zac Fisher":       ("1001717", "2026014"), # Added Zac Fisher
}

def update_photos():
    client = bigquery.Client()
    
    # Get all players
    query = f"SELECT jumper_no, name FROM `{TABLE_ID}`"
    players = client.query(query).to_dataframe()
    
    print(f"Updating {len(players)} players in {TABLE_ID} using Name Mapping...")
    
    for _, row in players.iterrows():
        jumper_no = int(row['jumper_no'])
        name = row['name'].strip()
        
        # Standardize on Initials Avatars for ALL players (Phase 14 Revert)
        # 2 initials, encoded properly, Hawthorn colors (#4D2004 Brown, #F6B000 Gold)
        encoded_name = urllib.parse.quote(name)
        photo_url = f"https://ui-avatars.com/api/?name={encoded_name}&background=4D2004&color=F6B000&size=200&length=2&font-size=0.4"
            
        update_query = f"""
            UPDATE `{TABLE_ID}`
            SET photo_url = '{photo_url}'
            WHERE jumper_no = {jumper_no}
        """
        client.query(update_query).result()
        print(f"✅ Standardized #{jumper_no} {name} to Initials Avatar")

if __name__ == "__main__":
    update_photos()
