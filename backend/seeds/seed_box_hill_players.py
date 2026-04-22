"""
Seed Box Hill Hawks VFL players into the box_hill_players table.

Usage:
    DATABASE_URL=postgresql://... python seeds/seed_box_hill_players.py
"""

import os
import sys
from datetime import datetime

# Add parent dir to path so we can import from models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.cloudsql_client import Base, get_engine, get_session
from models.box_hill_players import BoxHillPlayer


def calculate_age(dob_str: str) -> int | None:
    """Calculate age from a DOB string like '04 Oct 1997'."""
    if not dob_str:
        return None
    try:
        dob = datetime.strptime(dob_str.strip(), "%d %b %Y")
        today = datetime.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except ValueError:
        return None


BOX_HILL_PLAYERS = [
    {
        "jumper_no": 62,
        "name": "Stuart Horner",
        "dob": "04 Oct 1997",
        "height_cm": 185,
        "position": None,
        "community_club": "Shepparton United",
        "sponsor": "David Behan",
        "leadership_role": "Captain",
        "listing_note": None,
    },
    {
        "jumper_no": 53,
        "name": "Kye Declase",
        "dob": "15 Oct 1996",
        "height_cm": 195,
        "position": None,
        "community_club": "Morwell",
        "sponsor": "Lucian, Divya & Jaya Yuvarajah",
        "leadership_role": "Vice-Captain",
        "listing_note": None,
    },
    {
        "jumper_no": 58,
        "name": "Trent Bianco",
        "dob": "20 Jan 2001",
        "height_cm": 180,
        "position": None,
        "community_club": "Bayswater",
        "sponsor": "ESP Services",
        "leadership_role": "Vice-Captain",
        "listing_note": None,
    },
    {
        "jumper_no": 73,
        "name": "Corey Preston",
        "dob": "26 Oct 2006",
        "height_cm": 189,
        "position": None,
        "community_club": "East Ringwood",
        "sponsor": "Spicers Australia",
        "leadership_role": "Leadership Group",
        "listing_note": None,
    },
    {
        "jumper_no": 74,
        "name": "Blake Simondson",
        "dob": "31 Dec 2003",
        "height_cm": 186,
        "position": None,
        "community_club": "South Belgrave",
        "sponsor": "Invouge Door Systems",
        "leadership_role": "Leadership Group",
        "listing_note": None,
    },
    {
        "jumper_no": 57,
        "name": "Justin Currie",
        "dob": "2 Aug 2000",
        "height_cm": 172,
        "position": None,
        "community_club": "Banyule",
        "sponsor": None,
        "leadership_role": "Leadership Group",
        "listing_note": None,
    },
    {
        "jumper_no": 50,
        "name": "Brodie McLaughlin",
        "dob": "20 Nov 1997",
        "height_cm": 194,
        "position": None,
        "community_club": "Montrose",
        "sponsor": "Total Solar Solutions",
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 51,
        "name": "Freddie Leeton",
        "dob": "5 Nov 2004",
        "height_cm": 170,
        "position": None,
        "community_club": "Old Scotch",
        "sponsor": None,
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 52,
        "name": "Griff Julian",
        "dob": "31 May 2004",
        "height_cm": 187,
        "position": None,
        "community_club": "South Belgrave",
        "sponsor": "Maddison Sill",
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 54,
        "name": "Lane Ward",
        "dob": "30 Jun 2005",
        "height_cm": 178,
        "position": None,
        "community_club": "Drouin",
        "sponsor": "Wayne Birney",
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 55,
        "name": "Jye Peacock",
        "dob": "27 Jul 2004",
        "height_cm": 182,
        "position": None,
        "community_club": "Mooroolbark",
        "sponsor": None,
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 56,
        "name": "Beau Tennant",
        "dob": "16 Dec 2001",
        "height_cm": 193,
        "position": None,
        "community_club": "Montrose",
        "sponsor": "Wayne Birney",
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 59,
        "name": "Nick Baring",
        "dob": "13 Aug 2006",
        "height_cm": 168,
        "position": None,
        "community_club": "Old Scotch",
        "sponsor": None,
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 60,
        "name": "Alex Lukic",
        "dob": "7 Jan 2003",
        "height_cm": 182,
        "position": None,
        "community_club": "Collegians",
        "sponsor": None,
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 61,
        "name": "Max Donohue",
        "dob": "19 Mar 2006",
        "height_cm": 180,
        "position": None,
        "community_club": "Mitcham",
        "sponsor": "The Sperling Family",
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 63,
        "name": "Sam Sofronidis",
        "dob": "19 Aug 1999",
        "height_cm": 188,
        "position": None,
        "community_club": "Bayswater",
        "sponsor": None,
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 64,
        "name": "Zac McGown",
        "dob": "26 Oct 2006",
        "height_cm": 188,
        "position": None,
        "community_club": "East Ringwood",
        "sponsor": None,
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 66,
        "name": "Tyler Brown",
        "dob": "9 Dec 1999",
        "height_cm": 188,
        "position": None,
        "community_club": "Bayswater",
        "sponsor": "Quality Linemarking & Bollard Installation",
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 68,
        "name": "Josh Galstians",
        "dob": "20 Jan 2006",
        "height_cm": 170,
        "position": None,
        "community_club": "Park Orchards",
        "sponsor": None,
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 70,
        "name": "Thomas Swainston",
        "dob": "4 May 2007",
        "height_cm": 191,
        "position": None,
        "community_club": "Rowville",
        "sponsor": "Deer Park Oil Tools",
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 71,
        "name": "Kanoa McGrath",
        "dob": None,
        "height_cm": None,
        "position": None,
        "community_club": None,
        "sponsor": "Wanyaari Aboriginal Consultancy",
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 72,
        "name": "Jack Baldwin",
        "dob": "1 Feb 2006",
        "height_cm": 188,
        "position": None,
        "community_club": "Mitcham",
        "sponsor": None,
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 76,
        "name": "Tom Farrer",
        "dob": "3 Feb 2006",
        "height_cm": 182,
        "position": None,
        "community_club": "Old Scotch",
        "sponsor": None,
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 78,
        "name": "Will Kellar",
        "dob": "4 Oct 2005",
        "height_cm": 180,
        "position": None,
        "community_club": "Mitcham",
        "sponsor": None,
        "leadership_role": None,
        "listing_note": None,
    },
    {
        "jumper_no": 79,
        "name": "Will Pewtress",
        "dob": None,
        "height_cm": None,
        "position": None,
        "community_club": None,
        "sponsor": None,
        "leadership_role": None,
        "listing_note": None,
    },
]


def seed():
    # Create table if needed
    engine = get_engine()
    Base.metadata.create_all(engine, tables=[BoxHillPlayer.__table__])

    session = get_session()
    try:
        upserted = 0
        for data in BOX_HILL_PLAYERS:
            age = calculate_age(data["dob"]) if data["dob"] else None
            existing = session.query(BoxHillPlayer).filter_by(jumper_no=data["jumper_no"]).first()
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                existing.age = age
            else:
                player = BoxHillPlayer(
                    jumper_no=data["jumper_no"],
                    name=data["name"],
                    dob=data["dob"],
                    age=age,
                    height_cm=data["height_cm"],
                    position=data["position"],
                    community_club=data["community_club"],
                    sponsor=data["sponsor"],
                    leadership_role=data["leadership_role"],
                    listing_note=data["listing_note"],
                )
                session.add(player)
            upserted += 1

        session.commit()
        print(f"✅ Seeded {upserted} Box Hill players.")
    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding Box Hill players: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed()
