import urllib.request
import pandas as pd
import ssl
import json
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def get_html(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, context=ctx).read()

print("Fetching roster...")
roster_dfs = pd.read_html(get_html('https://www.footywire.com/afl/footy/tp-hawthorn-hawks'))
roster_df = next(df for df in roster_dfs if len(df)>20 and len(df.columns) >= 7)
if str(roster_df.iloc[0, 1]) == 'Name':
    roster_df.columns = roster_df.iloc[0]
    roster_df = roster_df.iloc[1:]

print("Fetching basic stats...")
stats_dfs = pd.read_html(get_html('https://www.footywire.com/afl/footy/ts-hawthorn-hawks'))
stats_df = next(df for df in stats_dfs if len(df)>20 and len(df.columns) >= 12)
if str(stats_df.iloc[1, 2]) == 'Team' or str(stats_df.iloc[1, 3]) == 'Games':
    stats_df.columns = stats_df.iloc[1]
    stats_df = stats_df.iloc[2:]

players = []
for _, row in roster_df.iterrows():
    name = str(row.get('Name', ''))
    if pd.isna(name) or name == 'Name' or not name: continue
    
    if ',' in name:
        parts = name.split(', ')
        clean_name = f"{parts[1]} {parts[0]}"
    else:
        clean_name = name

    age_str = str(row.get('Age', '0'))
    age_match = re.search(r'(\d+)yr', age_str)
    age = int(age_match.group(1)) if age_match else 0

    ht_str = str(row.get('Height', '0'))
    ht = int(re.sub(r'\D', '', ht_str)) if re.sub(r'\D', '', ht_str) else 0

    games = int(row.get('Games', 0)) if str(row.get('Games', '0')).isdigit() else 0
    pos = str(row.get('Position', ''))

    p_data = {
        "jumper_no": int(row.get('No', 0)) if str(row.get('No', '0')).isdigit() else 0,
        "name": clean_name,
        "age": age,
        "height_cm": ht,
        "games": games,
        "position": pos,
        "stats": {
            "goals_avg": 0, "disposals_avg": 0, "marks_avg": 0, "tackles_avg": 0,
            "kicks_avg": 0, "handballs_avg": 0, "hitouts_avg": 0, "clearances_avg": 0,
            "af_avg": 0, "rating_points": 0
        }
    }

    s_row = stats_df[stats_df.iloc[:,2] == name] if len(stats_df.columns)>2 else pd.DataFrame()
    if not s_row.empty:
        s = s_row.iloc[0]
        try:
            p_data['stats'].update({
                "goals_avg": float(s.get('Goals', 0)),
                "disposals_avg": float(s.get('Disposals', 0)),
                "marks_avg": float(s.get('Marks', 0)),
                "tackles_avg": float(s.get('Tackles', 0)),
                "kicks_avg": float(s.get('Kicks', 0)),
                "handballs_avg": float(s.get('Handballs', 0)),
                "hitouts_avg": float(s.get('Hitouts', 0))
            })
        except: pass

    players.append(p_data)

with open('scraped_hawthorn_players.json', 'w') as f:
    json.dump(players, f, indent=4)

print("Saved to scraped_hawthorn_players.json")
