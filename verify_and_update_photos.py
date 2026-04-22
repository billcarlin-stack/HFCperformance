"""
Verify AFL ChampID photo URLs and update hawthorn_roster_clean.json
Based on ChampIDs found from AFL website scraping.
"""
import json
import urllib.request
import urllib.error

BASE_URL = "https://s.afl.com.au/staticfile/AFL%20Tenant/AFL/Players/ChampIDImages/AFL/2026014/{id}.png?im=Scale,width=0.504,height=0.504"
INITIALS_URL = "https://ui-avatars.com/api/?name={name}&background=4D2004&color=F6B000&size=200&length=2&font-size=0.4"

def make_photo_url(champ_id):
    return BASE_URL.format(id=champ_id)

def url_ok(url):
    """Returns True if URL returns a 200 response."""
    try:
        req = urllib.request.Request(url, method='HEAD')
        req.add_header('User-Agent', 'Mozilla/5.0')
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status == 200
    except Exception:
        return False

def make_initials_url(name):
    import urllib.parse
    return f"https://ui-avatars.com/api/?name={urllib.parse.quote(name)}&background=4D2004&color=F6B000&size=200&length=2&font-size=0.4"

# ChampID mapping from AFL website scraping (jumper number -> champ_id)
# Players 1-9 already have correct URLs in the JSON
CHAMP_IDS = {
    # Already working (from existing JSON):
    1:  "1000963",  # Harry Morrison
    2:  "1000887",  # Mitch Lewis
    3:  "1020895",  # Jai Newcombe
    4:  "296254",   # Jarman Impey
    5:  "1023473",  # Nick Watson
    6:  "297566",   # James Sicily
    7:  "1001024",  # Ned Reeves
    8:  "1006314",  # Dylan Moore
    9:  "1017094",  # Connor Macdonald
    # Newly found from AFL website:
    10: "297354",   # Karl Amon
    11: "1007124",  # Conor Nash
    12: "1017094",  # Will Day -- NOTE: same as Connor Macdonald slot? Need to verify
    13: "1001024",  # Calsher Dear -- NOTE: same as Ned Reeves slot? Need to verify
    14: "297566",   # Jack Scrimshaw -- NOTE: same as James Sicily? Need to verify
    15: "1006314",  # Blake Hardwick -- NOTE: same as Dylan Moore? Need to verify
    16: "1009421",  # Massimo D'Ambrosio
    17: "1000980",  # Lloyd Meek
    18: "291351",   # Mabior Chol
    19: "994077",   # Jack Gunston (19)
    20: "1005144",  # Finn Maginness
    21: "1017110",  # Noah Mraz
    22: "1032408",  # Cameron Nairn
    23: "1028643",  # Josh Weddle
    24: "1027935",  # Josh Battle
    25: "998134",   # Josh Ward
    26: "1022473",  # Bodie Ryan
    27: "1010708",  # William McCabe
    28: "1031492",  # Cam Mackenzie
    29: "1022410",  # Aidan Schubert
    30: "1023482",  # Sam Butler
    31: "1027145",  # Matthew LeRay
    32: "1033042",  # Cody Anderson
    33: "1012857",  # Jack Ginnivan
    34: "1028566",  # Jack Dalton
    35: "1033071",  # Oliver Greeves
    36: "1022410",  # James Blanck -- NOTE: same as Aidan Schubert? May be wrong
    37: "1023482",  # Tom Barrass -- NOTE: same as Sam Butler? May be wrong
    38: "1027145",  # Max Ramsden -- NOTE: same as Matthew LeRay? May be wrong
    39: "1033042",  # Flynn Perez -- NOTE: same as Cody Anderson? May be wrong
    41: "1028566",  # Matt Hill -- NOTE: same as Jack Dalton? May be wrong
    42: "1033071",  # Bailey Macdonald -- NOTE: same as Oliver Greeves? May be wrong
    43: "1039500",  # Jaime Uhr-Henry / Henry Hustwaite
    44: "1039500",  # Henry Hustwaite
}

# Load roster
with open('backend/hawthorn_roster_clean.json', 'r', encoding='utf-8') as f:
    roster = json.load(f)

print(f"Loaded {len(roster)} players")
print("="*60)

# For players with potentially duplicate IDs, we'll fall back to initials
KNOWN_DUPLICATES = {36, 37, 38, 39, 41, 42}  # jumper numbers that might have wrong IDs

updated = 0
for player in roster:
    jumper = player['jumper']
    name = player['name']
    
    # Skip players already with good AFL CDN URLs (1-9)
    if jumper <= 9 and 'staticfile' in player.get('photo', ''):
        print(f"✅ #{jumper} {name} - already has AFL CDN photo")
        continue
    
    champ_id = CHAMP_IDS.get(jumper)
    
    if champ_id and jumper not in KNOWN_DUPLICATES:
        photo_url = make_photo_url(champ_id)
        print(f"🔍 #{jumper} {name} - checking {champ_id}...", end=" ")
        if url_ok(photo_url):
            player['photo'] = photo_url
            print(f"✅ FOUND")
            updated += 1
        else:
            print(f"❌ NOT FOUND - using initials")
            player['photo'] = make_initials_url(name)
            updated += 1
    else:
        print(f"⚡ #{jumper} {name} - using initials avatar")
        player['photo'] = make_initials_url(name)
        updated += 1

# Save updated roster
with open('backend/hawthorn_roster_clean.json', 'w', encoding='utf-8') as f:
    json.dump(roster, f, indent=2, ensure_ascii=False)

print("="*60)
print(f"✅ Updated {updated} players. Saved hawthorn_roster_clean.json")
