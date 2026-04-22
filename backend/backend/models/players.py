from sqlalchemy import Column, Integer, String, Float, Text
from db.cloudsql_client import Base, get_session
from config import get_config
from utils.cache import data_cache

_config = get_config()

class Player(Base):
    __tablename__ = 'players_2026'

    jumper_no = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    age = Column(Integer)
    height_cm = Column(Integer)
    weight_kg = Column(Integer)
    games = Column(Integer)
    position = Column(String(100))
    originally_from = Column(String(255))
    status = Column(String(50)) # Green, Amber, Red
    photo_url = Column(Text)
    description_weapon = Column(Text)
    description_craft = Column(Text)
    description_pyramid = Column(Text)
    description_mental = Column(Text)

    def to_dict(self):
        return {
            "jumper_no": self.jumper_no,
            "name": self.name,
            "age": self.age,
            "height_cm": self.height_cm,
            "weight_kg": self.weight_kg,
            "games": self.games,
            "position": self.position,
            "originally_from": self.originally_from,
            "status": self.status,
            "photo_url": self.photo_url,
            "description": {
                "weapon": self.description_weapon,
                "craft": self.description_craft,
                "pyramid": self.description_pyramid,
                "mental": self.description_mental
            }
        }

def get_all_players() -> list[dict]:
    """
    Fetches all players from Cloud SQL ordered by jumper number.
    """
    cached = data_cache.get("all_players")
    if cached:
        return cached

    session = get_session()
    try:
        players_objs = session.query(Player).order_by(Player.jumper_no).all()
        players = [p.to_dict() for p in players_objs]
        data_cache.set("all_players", players)
        return players
    finally:
        session.close()

def get_player_by_id(jumper_no: int) -> dict | None:
    """
    Fetches a single player by jumper number.
    """
    cache_key = f"player_{jumper_no}"
    cached = data_cache.get(cache_key)
    if cached:
        return cached

    session = get_session()
    try:
        player_obj = session.query(Player).filter(Player.jumper_no == jumper_no).first()
        if not player_obj:
            return None
        player = player_obj.to_dict()
        data_cache.set(cache_key, player)
        return player
    finally:
        session.close()
