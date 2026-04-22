import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from db.cloudsql_client import Base, get_session
from models.players import Player
from config import get_config

_config = get_config()

class InjuryLog(Base):
    __tablename__ = 'injury_logs'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    player_id = Column(Integer, nullable=False)
    injury_type = Column(String(255), nullable=False)
    body_area = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False) # Major, Moderate, Minor
    contact_load = Column(Integer, default=0)
    status = Column(String(50), nullable=False) # Active, Recovering, Cleared
    notes = Column(Text)
    date = Column(String(10)) # YYYY-MM-DD
    created_at = Column(DateTime, default=datetime.utcnow)

def log_injury(data: dict) -> dict:
    """
    Logs an injury and updates the player's status in Cloud SQL.
    """
    session = get_session()
    try:
        # 1. Insert into injury_logs
        record = InjuryLog(
            player_id=int(data["player_id"]),
            injury_type=data["injury_type"],
            body_area=data["body_area"],
            severity=data["severity"],
            contact_load=int(data.get("contact_load", 0)),
            status=data["status"],
            notes=data.get("notes", ""),
            date=datetime.now().strftime("%Y-%m-%d")
        )
        session.add(record)
        
        # 2. Update Player Status
        new_status = "Green"
        injury_status = data["status"]
        severity = data["severity"]
        
        if injury_status == "Active":
            if severity == "Major":
                new_status = "Red"
            else:
                new_status = "Amber"
        elif injury_status == "Recovering":
            new_status = "Amber"
        elif injury_status == "Cleared":
            new_status = "Green"
            
        player = session.query(Player).filter(Player.jumper_no == int(data["player_id"])).first()
        if player:
            player.status = new_status
            
        session.commit()
        return {"message": "Injury logged and status updated", "new_status": new_status}
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

def update_injury(injury_id: str, data: dict) -> dict:
    """Update an existing injury log and recalculate player status."""
    session = get_session()
    try:
        record = session.query(InjuryLog).filter(InjuryLog.id == injury_id).first()
        if not record:
            raise ValueError("Injury not found")

        if 'injury_type' in data: record.injury_type = data['injury_type']
        if 'body_area' in data: record.body_area = data['body_area']
        if 'severity' in data: record.severity = data['severity']
        if 'status' in data: record.status = data['status']
        if 'notes' in data: record.notes = data['notes']
        if 'contact_load' in data: record.contact_load = int(data['contact_load'])

        # Recalculate player status based on their most severe active injury
        player = session.query(Player).filter(Player.jumper_no == record.player_id).first()
        if player:
            active_injuries = session.query(InjuryLog).filter(
                InjuryLog.player_id == record.player_id,
                InjuryLog.status == 'Active'
            ).all()

            if not active_injuries:
                recovering = session.query(InjuryLog).filter(
                    InjuryLog.player_id == record.player_id,
                    InjuryLog.status == 'Recovering'
                ).count()
                player.status = 'Amber' if recovering > 0 else 'Green'
            else:
                has_major = any(i.severity == 'Major' for i in active_injuries)
                player.status = 'Red' if has_major else 'Amber'

        session.commit()
        return {"message": "Injury updated", "new_status": player.status if player else None}
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

def get_injury_history() -> list[dict]:
    """
    Fetches injury history from Cloud SQL.
    """
    session = get_session()
    try:
        results = session.query(
            InjuryLog,
            Player.name.label('player_name')
        ).join(Player, InjuryLog.player_id == Player.jumper_no).order_by(InjuryLog.created_at.desc()).limit(100).all()
        
        history = []
        for i, player_name in results:
            d = {
                "id": i.id,
                "player_id": i.player_id,
                "player_name": player_name,
                "injury_type": i.injury_type,
                "body_area": i.body_area,
                "severity": i.severity,
                "contact_load": i.contact_load,
                "status": i.status,
                "notes": i.notes,
                "date": i.date,
                "created_at": i.created_at.isoformat()
            }
            history.append(d)
        return history
    finally:
        session.close()
