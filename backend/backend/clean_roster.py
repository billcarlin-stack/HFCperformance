import json

with open('hawthorn_roster.json', 'r') as f:
    players = json.load(f)

cleaned = []
for p in players:
    name_parts = p['name'].split('\n')
    if len(name_parts) >= 2:
        name = f"{name_parts[0].strip()} {name_parts[1].strip()}".title()
    else:
        name = p['name'].title()
    
    cleaned.append({
        'name': name,
        'jumper': p['jumper'],
        'photo': p['photo']
    })

with open('hawthorn_roster_clean.json', 'w') as f:
    json.dump(cleaned, f, indent=2)

print(f"Cleaned {len(cleaned)} players.")
