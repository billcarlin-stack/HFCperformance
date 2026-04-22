"""
Update all player photos to use real AFL headshots from the Champion Data CDN.

URL pattern: https://s.afl.com.au/staticfile/AFL%20Tenant/AFL/Players/ChampIDImages/AFL/{comp_season}/{cd_id}.png

Champion Data IDs sourced from hawthornfc.com.au/players squad JSON (providerId field).
Maps by player NAME (not jumper number) since the roster reshuffles.
"""
import os
import urllib.parse
import pg8000
import pg8000.dbapi

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", "5432"))
DB_NAME = os.environ.get("DB_NAME", "hfc_dev")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_CONNECTION_NAME = os.environ.get("DB_CONNECTION_NAME", "")

COMP_SEASON = "2026014"  # Current season — includes recent draftees

# player_name (lowercase) -> champion_data_id
# Source: hawthornfc.com.au/players squad JSON, April 2026
CHAMPION_DATA_IDS = {
    # Current Hawthorn roster (from hawthornfc.com.au)
    "harry morrison":       "1000963",
    "mitch lewis":          "1000887",
    "mitchell lewis":       "1000887",
    "lloyd meek":           "1000980",
    "ned reeves":           "1001024",
    "massimo d'ambrosio":   "1005144",
    "dylan moore":          "1006314",
    "conor nash":           "1007124",
    "will day":             "1008550",
    "finn maginness":       "1009421",
    "sam butler":           "1010708",
    "flynn perez":          "1011771",
    "james blanck":         "1011839",
    "jack ginnivan":        "1012857",
    "connor macdonald":     "1017094",
    "josh ward":            "1017110",
    "jai newcombe":         "1020895",
    "william mccabe":       "1022410",
    "will mccabe":          "1022410",
    "bodie ryan":           "1022473",
    "nick watson":          "1023473",
    "cam mackenzie":        "1023482",
    "cameron mackenzie":    "1023482",
    "henry hustwaite":      "1023680",
    "matthew leray":        "1027145",
    "matt leray":           "1027145",
    "josh weddle":          "1027935",
    "max ramsden":          "1027965",
    "cody anderson":        "1028566",
    "noah mraz":            "1028643",
    "aidan schubert":       "1031492",
    "calsher dear":         "1032100",
    "cameron nairn":        "1032408",
    "jack dalton":          "1033042",
    "oliver greeves":       "1033071",
    "jaime uhr-henry":      "1039499",
    "matt hill":            "1039500",
    "jack gunston":         "291351",
    "jarman impey":         "296254",
    "karl amon":            "297354",
    "james sicily":         "297566",
    "tom barrass":          "990290",
    "blake hardwick":       "993794",
    "mabior chol":          "994077",
    "jack scrimshaw":       "998114",
    "josh battle":          "998134",
    "bailey macdonald":     "1028643",
    # Former players (may still be in DB)
    "james worpel":         "1002222",
    "sam frost":            "293738",
    "changkuoth jiath":     "998390",
    "chad wingard":         "295325",
    "luke breust":          "291549",
    "jai serong":           "1017091",
    "jack o'sullivan":      "1023531",
    "ethan phillips":       "1005052",
    "josh bennetts":        "1018106",
    "seamus mitchell":      "1018016",
    "denver grainger-barras": "1010726",
}


def get_connection():
    connect_kwargs = {
        "user": DB_USER,
        "password": DB_PASSWORD,
        "database": DB_NAME,
    }
    if DB_CONNECTION_NAME:
        connect_kwargs["unix_sock"] = f"/cloudsql/{DB_CONNECTION_NAME}/.s.PGSQL.5432"
    else:
        connect_kwargs["host"] = DB_HOST
        connect_kwargs["port"] = DB_PORT

    conn = pg8000.dbapi.connect(**connect_kwargs)
    conn.autocommit = True
    return conn


def update_photos():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT jumper_no, name FROM players_2026 ORDER BY jumper_no")
    players = cursor.fetchall()

    print(f"Updating photos for {len(players)} players...")

    matched = 0
    fallback = 0

    for jumper_no, name in players:
        name_lower = name.strip().lower()
        cd_id = CHAMPION_DATA_IDS.get(name_lower)

        if cd_id:
            photo_url = (
                f"https://s.afl.com.au/staticfile/AFL%20Tenant/"
                f"AFL/Players/ChampIDImages/AFL/{COMP_SEASON}/{cd_id}.png"
            )
            source = "AFL CDN"
            matched += 1
        else:
            encoded_name = urllib.parse.quote(name.strip())
            photo_url = (
                f"https://ui-avatars.com/api/?name={encoded_name}"
                f"&background=221C16&color=C8A951&size=200&length=2&font-size=0.4"
            )
            source = f"Avatar (no CD_I for '{name}')"
            fallback += 1

        cursor.execute(
            "UPDATE players_2026 SET photo_url = %s WHERE jumper_no = %s",
            (photo_url, jumper_no),
        )
        print(f"  #{jumper_no:2d} {name:30s} -> {source}")

    cursor.close()
    conn.close()
    print(f"\nDone! {matched} AFL headshots, {fallback} avatar fallbacks.")


if __name__ == "__main__":
    update_photos()
