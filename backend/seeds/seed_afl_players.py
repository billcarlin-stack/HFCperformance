"""Seed all AFL opponent team rosters into afl_players table."""
import os
import pg8000
import pg8000.dbapi

DB_HOST = os.environ.get("DB_HOST", "34.40.183.18")
DB_PORT = int(os.environ.get("DB_PORT", "5432"))
DB_NAME = os.environ.get("DB_NAME", "hfc_prod")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "HfcNest2026!")

COMP_SEASON = "2026014"

TEAMS = {
    "Essendon": [
        ("Zach Merrett", 7, "Midfielder", "992016"), ("Darcy Parish", 3, "Midfielder", "993817"),
        ("Andrew McGrath", 1, "Defender", "998102"), ("Kyle Langford", 4, "Forward", "298630"),
        ("Elijah Tsatas", 5, "Midfielder", "1023785"), ("Jye Caldwell", 6, "Midfielder", "1006103"),
        ("Isaac Kako", 10, "Forward", "1028554"), ("Nik Cox", 13, "Midfielder", "1015827"),
        ("Archie Perkins", 16, "Forward", "1015873"), ("Peter Wright", 20, "Forward", "298289"),
        ("Sam Durham", 22, "Midfielder", "1015810"), ("Nick Bryan", 24, "Ruck", "1011954"),
        ("Nate Caddy", 30, "Forward", "1027899"), ("Xavier Duursma", 28, "Midfielder", "1006096"),
    ],
    "Sydney": [
        ("Isaac Heeney", 5, "Midfielder", "298539"), ("Chad Warner", 1, "Midfielder", "1012014"),
        ("Errol Gulden", 21, "Midfielder", "1013128"), ("Nick Blakey", 22, "Defender", "1006028"),
        ("Logan McDonald", 6, "Forward", "1013230"), ("Tom Papley", 11, "Forward", "996765"),
        ("Callum Mills", 14, "Defender", "993905"), ("Brodie Grundy", 4, "Ruck", "293957"),
        ("Charlie Curnow", 35, "Forward", "996731"), ("Dane Rampe", 24, "Defender", "290307"),
        ("Max King", 31, "Forward", "1029015"), ("Jai Serong", 13, "Midfielder", "1017091"),
    ],
    "Geelong": [
        ("Patrick Dangerfield", 35, "Forward", "270917"), ("Jeremy Cameron", 5, "Forward", "293845"),
        ("Tom Stewart", 44, "Defender", "291800"), ("Tyson Stengle", 18, "Forward", "997230"),
        ("Max Holmes", 9, "Midfielder", "1015889"), ("Sam De Koning", 16, "Defender", "1009229"),
        ("Bailey Smith", 3, "Midfielder", "1006130"), ("Jhye Clark", 13, "Midfielder", "1023537"),
        ("Toby Conway", 6, "Ruck", "1017063"), ("James Worpel", 29, "Midfielder", "1002222"),
        ("Mark Blicavs", 46, "Ruck", "296733"), ("Jack Bowes", 12, "Midfielder", "998260"),
    ],
    "Western Bulldogs": [
        ("Marcus Bontempelli", 4, "Midfielder", "297373"), ("Adam Treloar", 1, "Midfielder", "291790"),
        ("Aaron Naughton", 33, "Forward", "1002404"), ("Tim English", 44, "Ruck", "1004592"),
        ("Sam Darcy", 10, "Forward", "1017126"), ("Cody Weightman", 3, "Forward", "1011803"),
        ("Bailey Dale", 31, "Defender", "996708"), ("Ed Richards", 20, "Midfielder", "1008280"),
        ("Ryley Sanders", 9, "Midfielder", "1017939"), ("Jedd Busslinger", 5, "Defender", "1023017"),
        ("Tom Liberatore", 21, "Midfielder", "290799"), ("Rory Lobb", 7, "Defender", "990740"),
    ],
    "Port Adelaide": [
        ("Connor Rozee", 1, "Midfielder", "1001299"), ("Zak Butters", 9, "Midfielder", "1006121"),
        ("Ollie Wines", 16, "Midfielder", "294318"), ("Jason Horne-Francis", 18, "Midfielder", "1012002"),
        ("Mitch Georgiades", 19, "Forward", "1010174"), ("Todd Marshall", 4, "Defender", "1004998"),
        ("Aliir Aliir", 21, "Defender", "294469"), ("Jack Lukosius", 12, "Forward", "1004095"),
        ("Miles Bergman", 14, "Defender", "1009191"), ("Ivan Soldo", 13, "Ruck", "998529"),
        ("Jase Burgoyne", 7, "Midfielder", "1013462"), ("Willem Drew", 28, "Midfielder", "1000972"),
    ],
    "Gold Coast": [
        ("Matt Rowell", 18, "Midfielder", "1009208"), ("Noah Anderson", 15, "Midfielder", "1009199"),
        ("Ben King", 34, "Forward", "1006087"), ("Touk Miller", 11, "Midfielder", "298272"),
        ("Christian Petracca", 3, "Midfielder", "298210"), ("Mac Andrew", 1, "Defender", "1017396"),
        ("Bailey Humphrey", 19, "Forward", "1023500"), ("Jarrod Witts", 28, "Ruck", "291975"),
        ("Jed Walter", 4, "Forward", "1023736"), ("Sam Collins", 25, "Defender", "295446"),
        ("Jamarra Ugle-Hagan", 9, "Forward", "1009301"), ("Bodhi Uwland", 6, "Defender", "1017665"),
    ],
    "Collingwood": [
        ("Nick Daicos", 35, "Midfielder", "1023261"), ("Scott Pendlebury", 10, "Midfielder", "260257"),
        ("Jordan De Goey", 2, "Midfielder", "994295"), ("Darcy Moore", 30, "Defender", "298288"),
        ("Josh Daicos", 7, "Defender", "1005054"), ("Jamie Elliott", 5, "Forward", "293801"),
        ("Jack Crisp", 25, "Midfielder", "293871"), ("Bobby Hill", 23, "Forward", "1006148"),
        ("Brayden Maynard", 4, "Defender", "992010"), ("Darcy Cameron", 14, "Ruck", "990291"),
        ("Dan Houston", 9, "Defender", "993979"), ("Tim Membrey", 28, "Forward", "294596"),
    ],
    "Fremantle": [
        ("Andrew Brayshaw", 8, "Midfielder", "1002232"), ("Caleb Serong", 3, "Midfielder", "1009420"),
        ("Hayden Young", 26, "Midfielder", "1009256"), ("Shai Bolton", 10, "Midfielder", "993993"),
        ("Luke Jackson", 9, "Ruck", "1009399"), ("Alex Pearce", 25, "Defender", "298409"),
        ("Jye Amiss", 24, "Forward", "1020594"), ("Heath Chapman", 5, "Defender", "1013224"),
        ("Josh Treacy", 35, "Forward", "1012819"), ("Sean Darcy", 4, "Ruck", "998145"),
        ("Luke Ryan", 13, "Defender", "998659"), ("Jaeger O'Meara", 2, "Midfielder", "294613"),
    ],
    "Melbourne": [
        ("Max Gawn", 11, "Ruck", "290528"), ("Jack Viney", 7, "Midfielder", "291902"),
        ("Jake Lever", 8, "Defender", "298281"), ("Steven May", 1, "Defender", "281085"),
        ("Jack Steele", 9, "Midfielder", "296205"), ("Caleb Windsor", 6, "Midfielder", "1027821"),
        ("Harvey Langford", 4, "Midfielder", "1028546"), ("Jacob van Rooyen", 2, "Forward", "1017720"),
        ("Bayley Fritsch", 31, "Forward", "1001438"), ("Changkuoth Jiath", 14, "Defender", "998390"),
        ("Christian Salem", 3, "Defender", "296359"), ("Ed Langdon", 15, "Midfielder", "298264"),
    ],
    "Adelaide": [
        ("Jordan Dawson", 12, "Midfielder", "992242"), ("Rory Laird", 29, "Defender", "293222"),
        ("Josh Rachele", 8, "Midfielder", "1017051"), ("Izak Rankine", 23, "Forward", "1001195"),
        ("Jake Soligo", 14, "Midfielder", "1017109"), ("Riley Thilthorpe", 7, "Forward", "1008384"),
        ("Taylor Walker", 13, "Forward", "280506"), ("Reilly O'Brien", 43, "Ruck", "297523"),
        ("Daniel Curtin", 6, "Midfielder", "1024023"), ("Sid Draper", 5, "Midfielder", "1022607"),
        ("Sam Berry", 3, "Midfielder", "1012807"), ("Ben Keays", 2, "Forward", "993946"),
    ],
    "St Kilda": [
        ("Jack Macrae", 6, "Midfielder", "295467"), ("Jack Higgins", 1, "Forward", "1002227"),
        ("Max King", 12, "Forward", "1006143"), ("Rowan Marshall", 19, "Ruck", "992468"),
        ("Sam Flanders", 9, "Midfielder", "1009260"), ("Mattaes Phillipou", 25, "Midfielder", "1020137"),
        ("Nasiah Wanganeen-Milera", 7, "Midfielder", "1015507"), ("Jack Sinclair", 35, "Defender", "994389"),
        ("Mitch Owens", 10, "Forward", "1023272"), ("Tom De Koning", 21, "Ruck", "1004912"),
        ("Hunter Clark", 11, "Midfielder", "1002264"), ("Bradley Hill", 8, "Midfielder", "295584"),
    ],
    "North Melbourne": [
        ("Harry Sheezel", 3, "Midfielder", "1023518"), ("George Wardlaw", 6, "Midfielder", "1023477"),
        ("Luke Davies-Uniacke", 9, "Midfielder", "1002267"), ("Colby McKercher", 10, "Defender", "1024272"),
        ("Nick Larkey", 20, "Forward", "1001017"), ("Zane Duursma", 7, "Forward", "1023494"),
        ("Jy Simpkin", 12, "Midfielder", "993998"), ("Caleb Daniel", 5, "Defender", "295136"),
        ("Aidan Corr", 4, "Defender", "294508"), ("Luke Parker", 26, "Defender", "290778"),
        ("Jack Darling", 27, "Forward", "290838"), ("Tristan Xerri", 38, "Ruck", "1004965"),
    ],
    "Carlton": [
        ("Patrick Cripps", 9, "Midfielder", "990704"), ("Sam Walsh", 18, "Midfielder", "1006094"),
        ("Harry McKay", 10, "Forward", "1000953"), ("Jacob Weitering", 23, "Defender", "993832"),
        ("Adam Cerra", 5, "Midfielder", "1002239"), ("Blake Acres", 13, "Midfielder", "296294"),
        ("Jagga Smith", 7, "Midfielder", "1028515"), ("Jesse Motlop", 3, "Forward", "1017700"),
        ("Brodie Kemp", 17, "Forward", "1009241"), ("Nick Haynes", 26, "Defender", "295265"),
        ("George Hewett", 29, "Midfielder", "294036"), ("Marc Pittonet", 27, "Ruck", "298290"),
    ],
    "Richmond": [
        ("Tim Taranto", 14, "Midfielder", "998172"), ("Jacob Hopper", 2, "Midfielder", "993903"),
        ("Dion Prestia", 3, "Midfielder", "290627"), ("Tom Lynch", 19, "Forward", "293813"),
        ("Nick Vlastuin", 1, "Defender", "294674"), ("Noah Balta", 21, "Defender", "1002245"),
        ("Jack Ross", 5, "Midfielder", "1006133"), ("Sam Lalor", 4, "Midfielder", "1028491"),
        ("Jonty Faull", 8, "Forward", "1028498"), ("Toby Nankervis", 25, "Ruck", "298174"),
        ("Josh Gibcus", 18, "Defender", "1017059"), ("Tyler Sonsie", 40, "Midfielder", "1017114"),
    ],
    "Brisbane": [
        ("Lachie Neale", 9, "Midfielder", "293535"), ("Josh Dunkley", 5, "Midfielder", "993834"),
        ("Harris Andrews", 31, "Defender", "996059"), ("Hugh McCluggage", 6, "Midfielder", "1000978"),
        ("Eric Hipwood", 30, "Forward", "993953"), ("Oscar Allen", 4, "Forward", "1004385"),
        ("Will Ashcroft", 8, "Midfielder", "1023517"), ("Charlie Cameron", 23, "Forward", "990609"),
        ("Dayne Zorko", 15, "Defender", "261224"), ("Kai Lohmann", 1, "Forward", "1014026"),
        ("Levi Ashcroft", 10, "Midfielder", "1028560"), ("Jarrod Berry", 7, "Midfielder", "998133"),
    ],
    "West Coast": [
        ("Harley Reid", 9, "Midfielder", "1023492"), ("Jake Waterman", 2, "Forward", "996554"),
        ("Tim Kelly", 11, "Midfielder", "295898"), ("Elliot Yeo", 6, "Midfielder", "292128"),
        ("Liam Baker", 3, "Defender", "1000223"), ("Reuben Ginbey", 7, "Defender", "1023025"),
        ("Jamie Cripps", 15, "Forward", "290826"), ("Elijah Hewett", 8, "Midfielder", "1020670"),
        ("Matt Flynn", 25, "Ruck", "993902"), ("Willem Duursma", 1, "Midfielder", "1033115"),
        ("Noah Long", 13, "Forward", "1023496"), ("Liam Duggan", 14, "Defender", "298268"),
    ],
    "GWS Giants": [
        ("Toby Greene", 4, "Midfielder", "295344"), ("Josh Kelly", 22, "Midfielder", "296347"),
        ("Tom Green", 12, "Midfielder", "1009528"), ("Jesse Hogan", 23, "Forward", "296324"),
        ("Sam Taylor", 15, "Defender", "1005247"), ("Lachie Whitfield", 6, "Defender", "294305"),
        ("Clayton Oliver", 10, "Midfielder", "996701"), ("Aaron Cadman", 5, "Forward", "1019038"),
        ("Finn Callaghan", 17, "Midfielder", "1023266"), ("Stephen Coniglio", 3, "Midfielder", "291969"),
        ("Jake Stringer", 20, "Forward", "293884"), ("Harvey Thomas", 1, "Midfielder", "1027925"),
    ],
}


def seed():
    conn = pg8000.dbapi.connect(host=DB_HOST, port=DB_PORT, database=DB_NAME, user=DB_USER, password=DB_PASSWORD)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS afl_players (
        id SERIAL PRIMARY KEY,
        team VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        jumper_no INT,
        position VARCHAR(50),
        champion_data_id VARCHAR(20),
        photo_url TEXT,
        season VARCHAR(10) DEFAULT '2026'
    )""")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_afl_players_team ON afl_players(team)")
    cur.execute("DELETE FROM afl_players WHERE season='2026'")

    count = 0
    for team, players in TEAMS.items():
        for name, jumper, position, cd_id in players:
            photo_url = f"https://s.afl.com.au/staticfile/AFL%20Tenant/AFL/Players/ChampIDImages/AFL/{COMP_SEASON}/{cd_id}.png"
            cur.execute(
                "INSERT INTO afl_players (team, name, jumper_no, position, champion_data_id, photo_url, season) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (team, name, jumper, position, cd_id, photo_url, '2026')
            )
            count += 1

    print(f"Inserted {count} players across {len(TEAMS)} teams")
    cur.execute("SELECT team, COUNT(*) FROM afl_players GROUP BY team ORDER BY team")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")
    conn.close()


if __name__ == "__main__":
    seed()
