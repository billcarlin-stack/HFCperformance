"""
Update photo_url for all Hawthorn players using verified AFL ChampID URLs.
Run from the backend directory: python scripts/update_photos_2026.py
"""
import os, sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.cloudsql_client import get_session
from models.players import Player
from utils.cache import data_cache

BASE = "https://s.afl.com.au/staticfile/AFL%20Tenant/AFL/Players/ChampIDImages/AFL/2026014/{id}.png?im=Scale,width=0.504,height=0.504"

# Full roster: (jumper_no, name, champ_id)
ROSTER = [
    (1,  "Harry Morrison",     "1000963"),
    (2,  "Mitch Lewis",        "1000887"),
    (3,  "Jai Newcombe",       "1020895"),
    (4,  "Jarman Impey",       "296254"),
    (5,  "Nick Watson",        "1023473"),
    (6,  "James Sicily",       "1000922"),
    (7,  "Ned Reeves",         "1000851"),
    (8,  "Dylan Moore",        "298135"),
    (9,  "Connor Macdonald",   "1011311"),
    (10, "Karl Amon",          "297354"),
    (11, "Conor Nash",         "1007124"),
    (12, "Will Day",           "1017094"),
    (13, "Calsher Dear",       "1001024"),
    (14, "Jack Scrimshaw",     "297566"),
    (15, "Blake Hardwick",     "1006314"),
    (16, "Massimo D'Ambrosio", "1009421"),
    (17, "Lloyd Meek",         "1000980"),
    (18, "Mabior Chol",        "291351"),
    (19, "Jack Gunston",       "994077"),
    (20, "Finn Maginness",     "1005144"),
    (21, "Noah Mraz",          "1017110"),
    (22, "Cameron Nairn",      "1032408"),
    (23, "Josh Weddle",        "1028643"),
    (24, "Josh Battle",        "1027935"),
    (25, "Josh Ward",          "998134"),
    (26, "Bodie Ryan",         "1022473"),
    (27, "William Mccabe",     "1010708"),
    (28, "Cam Mackenzie",      "1031492"),
    (29, "Aidan Schubert",     "1022410"),
    (30, "Sam Butler",         "1023482"),
    (31, "Matthew Leray",      "1027145"),
    (32, "Cody Anderson",      "1033042"),
    (33, "Jack Ginnivan",      "1012857"),
    (34, "Jack Dalton",        "1028566"),
    (35, "Oliver Greeves",     "1033071"),
    (36, "James Blanck",       "1011839"),
    (37, "Tom Barrass",        "990290"),
    (38, "Max Ramsden",        "1027965"),
    (39, "Flynn Perez",        "1011771"),
    (41, "Matt Hill",          "1039500"),
    (42, "Bailey Macdonald",   "1029261"),
    (43, "Jaime Uhr-Henry",    "1039499"),
    (44, "Henry Hustwaite",    "1023680"),
]

def update_photos():
    session = get_session()
    updated = 0
    skipped = 0
    try:
        for jumper_no, name, champ_id in ROSTER:
            photo_url = BASE.format(id=champ_id)
            player = session.query(Player).filter(Player.jumper_no == jumper_no).first()
            if player:
                player.photo_url = photo_url
                player.name = name  # Ensure name is consistent
                updated += 1
                print(f"  ✅ #{jumper_no:>2} {name} → {champ_id}")
            else:
                skipped += 1
                print(f"  ⚠️  #{jumper_no:>2} {name} — not found in DB, skipping")
        session.commit()
        print(f"\n✅ Done. Updated {updated} players, skipped {skipped}.")
        # Clear cache so changes are visible immediately
        data_cache.clear()
        print("🗑️  Cache cleared.")
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    print("Updating player photo URLs...\n")
    update_photos()
