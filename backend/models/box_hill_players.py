"""
Box Hill Hawks — Player Model

Box Hill players are VFL-listed only.
Hawthorn (AFL) players can play for Box Hill, but Box Hill players cannot play for Hawthorn.
"""

from sqlalchemy import Column, Integer, String, Float, Text, Date
from db.cloudsql_client import Base, get_session
from utils.cache import data_cache


class BoxHillPlayer(Base):
    __tablename__ = 'box_hill_players'

    jumper_no = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    dob = Column(String(20))           # stored as string e.g. "04 Oct 1997"
    age = Column(Integer)
    height_cm = Column(Integer)
    position = Column(String(100))
    community_club = Column(String(255))
    sponsor = Column(String(255))
    leadership_role = Column(String(100))  # Captain / Vice-Captain / Leadership Group / null
    photo_url = Column(Text)
    listing_note = Column(String(100))     # e.g. "AFL-Listed" if a Hawks player is playing down

    def to_dict(self):
        return {
            "jumper_no": self.jumper_no,
            "name": self.name,
            "dob": self.dob,
            "age": self.age,
            "height_cm": self.height_cm,
            "position": self.position or "—",
            "community_club": self.community_club,
            "sponsor": self.sponsor,
            "leadership_role": self.leadership_role,
            "photo_url": self.photo_url,
            "listing_note": self.listing_note,
            # Convenience fields that match the Hawks Player shape (for TeamBuilder)
            "status": "Green",
            "games": 0,
        }


def get_all_box_hill_players() -> list[dict]:
    """Returns all Box Hill listed players, ordered by jumper number."""
    cached = data_cache.get("box_hill_players")
    if cached:
        return cached

    session = get_session()
    try:
        players = session.query(BoxHillPlayer).order_by(BoxHillPlayer.jumper_no).all()
        result = [p.to_dict() for p in players]
        data_cache.set("box_hill_players", result)
        return result
    except Exception:
        return []
    finally:
        session.close()
