from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, func
from db.cloudsql_client import Base, get_session
from models.players import Player
import logging

logger = logging.getLogger(__name__)

class WellbeingSurvey(Base):
    __tablename__ = 'wellbeing_surveys'

    id = Column(Integer, primary_key=True, autoincrement=True)
    player_id = Column(Integer, nullable=False)
    sleep_score = Column(Integer, nullable=False)
    soreness_score = Column(Integer, nullable=False)
    stress_score = Column(Integer, nullable=False)
    notes = Column(Text)
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

def submit_survey(data: dict) -> dict:
    """
    Inserts a wellbeing survey record into Cloud SQL.
    """
    session = get_session()
    try:
        record = WellbeingSurvey(
            player_id=int(data["player_id"]),
            sleep_score=int(data["sleep_score"]),
            soreness_score=int(data["soreness_score"]),
            stress_score=int(data["stress_score"]),
            notes=data.get("notes", "")
        )
        session.add(record)
        session.commit()
        return {
            "player_id": record.player_id,
            "sleep_score": record.sleep_score,
            "soreness_score": record.soreness_score,
            "stress_score": record.stress_score,
            "notes": record.notes,
            "submitted_at": record.submitted_at.isoformat()
        }
    except Exception as e:
        session.rollback()
        logger.error("Error submitting wellbeing survey: %s", str(e))
        raise
    finally:
        session.close()

def get_surveys_for_player(jumper_no: int, limit: int = 90) -> list[dict]:
    """
    Retrieves wellbeing survey history for a player from Cloud SQL.
    """
    session = get_session()
    try:
        rows = session.query(WellbeingSurvey).filter(WellbeingSurvey.player_id == jumper_no).order_by(WellbeingSurvey.submitted_at.desc()).limit(limit).all()
        return [{
            "player_id": r.player_id,
            "sleep_score": r.sleep_score,
            "soreness_score": r.soreness_score,
            "stress_score": r.stress_score,
            "notes": r.notes,
            "submitted_at": r.submitted_at.isoformat()
        } for r in rows]
    finally:
        session.close()

def get_surveys_with_notes(limit: int = 20) -> list[dict]:
    """
    Retrieves recent wellbeing surveys that are 'critical' from Cloud SQL.
    """
    session = get_session()
    try:
        # SQLAlchemy equivalent of the BigQuery query
        # Readiness = ((sleep * 0.4) + (soreness * 0.4) + (stress * 0.2)) * 10
        
        query = session.query(
            WellbeingSurvey,
            Player.name.label('player_name'),
            (((WellbeingSurvey.sleep_score * 0.4) + (WellbeingSurvey.soreness_score * 0.4) + (WellbeingSurvey.stress_score * 0.2)) * 10).label('readiness')
        ).join(Player, WellbeingSurvey.player_id == Player.jumper_no)
        
        critical_rows = query.filter(
            (WellbeingSurvey.notes != '') | ((((WellbeingSurvey.sleep_score * 0.4) + (WellbeingSurvey.soreness_score * 0.4) + (WellbeingSurvey.stress_score * 0.2)) * 10) < 60)
        ).order_by(WellbeingSurvey.submitted_at.desc()).limit(limit).all()
        
        results = []
        for w, player_name, readiness in critical_rows:
            d = {
                "player_id": w.player_id,
                "player_name": player_name,
                "sleep_score": w.sleep_score,
                "soreness_score": w.soreness_score,
                "stress_score": w.stress_score,
                "notes": w.notes,
                "submitted_at": w.submitted_at.isoformat(),
                "readiness": float(readiness)
            }
            results.append(d)
        return results
    finally:
        session.close()
