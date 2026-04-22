import json
import re

# Load scraped data
with open('scraped_hawthorn_players.json', 'r', encoding='utf-8') as f:
    scraped = json.load(f)

# Load current roster for photos (if any real ones exist)
try:
    with open('backend/hawthorn_roster_clean.json', 'r', encoding='utf-8') as f:
        current_roster = json.load(f)
    photo_map = {p['jumper']: p['photo'] for p in current_roster}
except:
    photo_map = {}

# 1. Update hawthorn_roster_clean.json
new_roster = []
for p in scraped:
    j = p['jumper_no']
    new_roster.append({
        "name": p['name'],
        "jumper": j,
        "photo": photo_map.get(j, "https://www.hawthornfc.com.au/resources/club-watermarks/11861/haw-left.png")
    })

with open('backend/hawthorn_roster_clean.json', 'w', encoding='utf-8') as f:
    json.dump(new_roster, f, indent=2)

print("Updated hawthorn_roster_clean.json")

# 2. Update database_utils.py
with open('backend/database_utils.py', 'r', encoding='utf-8') as f:
    db_utils = f.read()

# Generate KNOWN_PROFILES
known_profiles = "KNOWN_PROFILES = {\n"
for p in scraped:
    known_profiles += f"    {p['jumper_no']}: {{'age': {p['age']}, 'height_cm': {p['height_cm']}, 'games': {p['games']}, 'position': '{p['position']}', 'status': 'Green'}},\n"
known_profiles += "}"

db_utils = re.sub(r'KNOWN_PROFILES\s*=\s*\{.*?\}', known_profiles, db_utils, flags=re.DOTALL)

# Generate REAL_STATS
real_stats = "REAL_STATS = {\n"
for p in scraped:
    s = p['stats']
    real_stats += f"    {p['jumper_no']}: {{'games_played': {p['games']}, 'af_avg': {s.get('af_avg', 0)}, 'goals_avg': {s.get('goals_avg', 0)}, 'disposals_avg': {s.get('disposals_avg', 0)}, 'marks_avg': {s.get('marks_avg', 0)}, 'tackles_avg': {s.get('tackles_avg', 0)}, 'clearances_avg': {s.get('clearances_avg', 0)}, 'kicks_avg': {s.get('kicks_avg', 0)}, 'handballs_avg': {s.get('handballs_avg', 0)}}},\n"
real_stats += "}"

db_utils = re.sub(r'REAL_STATS\s*=\s*\{.*?\}', real_stats, db_utils, flags=re.DOTALL)

with open('backend/database_utils.py', 'w', encoding='utf-8') as f:
    f.write(db_utils)

print("Updated database_utils.py")
