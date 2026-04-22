from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from db.cloudsql_client import Base, get_session
from models.players import Player

class PlayerStats(Base):
    __tablename__ = 'player_stats_2025'

    jumper_no = Column(Integer, ForeignKey('players_2026.jumper_no'), primary_key=True)
    games_played = Column(Integer, default=0)
    af_avg = Column(Float, default=0)
    rating_points = Column(Float, default=0)
    goals_avg = Column(Float, default=0)
    disposals_avg = Column(Float, default=0)
    marks_avg = Column(Float, default=0)
    tackles_avg = Column(Float, default=0)
    clearances_avg = Column(Float, default=0)
    kicks_avg = Column(Float, default=0)
    handballs_avg = Column(Float, default=0)
    hitouts_avg = Column(Float, default=0)

    player = relationship("Player", backref="stats")

    def to_dict(self):
        return {
            "jumper_no": self.jumper_no,
            "games_played": self.games_played or 0,
            "af_avg": self.af_avg or 0,
            "rating_points": self.rating_points or 0,
            "goals_avg": self.goals_avg or 0,
            "disposals_avg": self.disposals_avg or 0,
            "marks_avg": self.marks_avg or 0,
            "tackles_avg": self.tackles_avg or 0,
            "clearances_avg": self.clearances_avg or 0,
            "kicks_avg": self.kicks_avg or 0,
            "handballs_avg": self.handballs_avg or 0,
            "hitouts_avg": self.hitouts_avg or 0
        }

def get_player_stats_2025(jumper_no: int | None = None) -> list[dict]:
    session = get_session()
    try:
        query = session.query(Player, PlayerStats).outerjoin(PlayerStats, Player.jumper_no == PlayerStats.jumper_no)
        
        if jumper_no:
            query = query.filter(Player.jumper_no == jumper_no)
            
        results = query.order_by(PlayerStats.disposals_avg.desc().nullslast()).all()
        
        final_stats = []
        for player, stats in results:
            data = player.to_dict()
            if stats:
                data.update(stats.to_dict())
            else:
                # Fill with defaults
                data.update({
                    "games_played": 0, "af_avg": 0, "rating_points": 0, "goals_avg": 0,
                    "disposals_avg": 0, "marks_avg": 0, "tackles_avg": 0, "clearances_avg": 0,
                    "kicks_avg": 0, "handballs_avg": 0, "hitouts_avg": 0
                })
            final_stats.append(data)
        return final_stats
    finally:
        session.close()
