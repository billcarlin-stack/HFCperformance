import json
import re
import os

with open('scraped_hawthorn_players.json', 'r') as f:
    players = json.load(f)

# Update seed_cloudsql_players.py
cloudsql_file = r'backend/seeds/seed_cloudsql_players.py'
with open(cloudsql_file, 'r') as f:
    content = f.read()

players_data_str = "PLAYERS_DATA = [\n"
for p in players:
    # Set default status or keep Green
    status = "Green"
    pd = {
        'jumper_no': p['jumper_no'],
        'name': p['name'],
        'age': p['age'],
        'height_cm': p['height_cm'],
        'games': p['games'],
        'position': p['position'],
        'status': status
    }
    players_data_str += f"    {pd},\n"
players_data_str += "]"

new_content = re.sub(r'PLAYERS_DATA\s*=\s*\[.*?\]', players_data_str, content, flags=re.DOTALL)
with open(cloudsql_file, 'w') as f:
    f.write(new_content)

# Update seed_player_stats_2025.py
stats_file = r'backend/seeds/seed_player_stats_2025.py'
with open(stats_file, 'r') as f:
    content = f.read()

stats_data_str = "SCRAPED_STATS = {\n"
for p in players:
    stats_data_str += f"    {p['jumper_no']}: {p['stats']},\n"
stats_data_str += "}\n"

# We must replace the random insert logic with using SCRAPED_STATS
stats_logic = """
    rows_to_insert = []
    for jn in players:
        stats = SCRAPED_STATS.get(jn, {})
        rows_to_insert.append({
            "jumper_no": jn,
            "games_played": stats.get("games_played", 0),
            "af_avg": round(stats.get("af_avg", 0), 1),
            "rating_points": round(stats.get("rating_points", 0), 1),
            "goals_avg": round(stats.get("goals_avg", 0), 1),
            "disposals_avg": round(stats.get("disposals_avg", 0), 1),
            "marks_avg": round(stats.get("marks_avg", 0), 1),
            "tackles_avg": round(stats.get("tackles_avg", 0), 1),
            "clearances_avg": round(stats.get("clearances_avg", 0), 1),
            "kicks_avg": round(stats.get("kicks_avg", 0), 1),
            "handballs_avg": round(stats.get("handballs_avg", 0), 1),
            "hitouts_avg": round(stats.get("hitouts_avg", 0), 1),
        })
"""

# Insert SCRAPED_STATS dictionary right after schema definition
content = re.sub(r'    # Fetch all current players', stats_data_str + '\n    # Fetch all current players', content)

# Replace the loop
content = re.sub(r'    rows_to_insert = \[\]\n    for jn in players:.*?(?=    errors = client\.insert_rows_json)', stats_logic, content, flags=re.DOTALL)

with open(stats_file, 'w') as f:
    f.write(content)

print("Seed files updated successfully!")
