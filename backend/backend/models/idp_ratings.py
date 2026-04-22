import logging
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, DateTime
from db.cloudsql_client import Base, get_session

logger = logging.getLogger(__name__)

class IdpRating(Base):
    __tablename__ = 'idp_ratings'

    player_id = Column(Integer, primary_key=True)
    grit = Column(Float)
    tactical_iq = Column(Float)
    execution = Column(Float)
    resilience = Column(Float)
    leadership = Column(Float)
    composite_score = Column(Float)
    assessed_at = Column(DateTime, primary_key=True, default=lambda: datetime.now(timezone.utc))

def get_idp_for_player(jumper_no: int) -> dict | None:
    """
    Returns IDP ratings for a given player from Cloud SQL.
    """
    session = get_session()
    try:
        row = session.query(IdpRating).filter(IdpRating.player_id == jumper_no).order_by(IdpRating.assessed_at.desc()).first()
        if not row:
            return None
        return {
            "player_id": row.player_id,
            "Grit": row.grit,
            "TacticalIQ": row.tactical_iq,
            "Execution": row.execution,
            "Resilience": row.resilience,
            "Leadership": row.leadership,
            "composite_score": row.composite_score,
            "assessed_at": row.assessed_at.isoformat()
        }
    finally:
        session.close()

def get_idp_for_players(jumper_nos: list[int]) -> list[dict]:
    """
    Returns IDP ratings for multiple players from Cloud SQL.
    """
    session = get_session()
    try:
        rows = session.query(IdpRating).filter(IdpRating.player_id.in_(jumper_nos)).order_by(IdpRating.composite_score.desc()).all()
        return [{
            "player_id": r.player_id,
            "Grit": r.grit,
            "TacticalIQ": r.tactical_iq,
            "Execution": r.execution,
            "Resilience": r.resilience,
            "Leadership": r.leadership,
            "composite_score": r.composite_score,
            "assessed_at": r.assessed_at.isoformat()
        } for r in rows]
    finally:
        session.close()
