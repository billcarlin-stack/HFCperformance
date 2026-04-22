import json
import re

with open('scraped_hawthorn_players.json', 'r', encoding='utf-8') as f:
    players = json.load(f)

seed_all_file = r'backend/seeds/seed_all.py'
with open(seed_all_file, 'r', encoding='utf-8') as f:
    content = f.read()

hfc_players_str = "HFC_PLAYERS = {\n"
for p in players:
    hfc_players_str += f'    {p["jumper_no"]}: "{p["name"]}",\n'
hfc_players_str += "}"

new_content = re.sub(r'HFC_PLAYERS\s*=\s*\{.*?\}', hfc_players_str, content, flags=re.DOTALL)
with open(seed_all_file, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("seed_all.py updated successfully!")
