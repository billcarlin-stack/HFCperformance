import logging
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from db.cloudsql_client import Base, get_session

logger = logging.getLogger(__name__)

class CalendarEvent(Base):
    __tablename__ = 'calendar_events'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    description = Column(Text)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    player_ids = Column(JSON) # Store as list of IDs
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

def create_event(data: dict) -> dict:
    """Inserts a calendar event record into Cloud SQL."""
    session = get_session()
    try:
        record = CalendarEvent(
            title=data["title"],
            type=data["type"],
            description=data.get("description", ""),
            start_time=data["start_time"],
            end_time=data["end_time"],
            player_ids=data.get("player_ids", [])
        )
        session.add(record)
        session.commit()
        return {
            "id": record.id,
            "title": record.title,
            "type": record.type,
            "description": record.description,
            "start_time": record.start_time.isoformat(),
            "end_time": record.end_time.isoformat(),
            "player_ids": record.player_ids,
            "created_at": record.created_at.isoformat()
        }
    except Exception as e:
        session.rollback()
        logger.error("Error creating calendar event: %s", str(e))
        raise
    finally:
        session.close()

def get_events(start_date: str = None, end_date: str = None, player_id: int = None) -> list[dict]:
    """Retrieves calendar events from Cloud SQL."""
    session = get_session()
    try:
        query = session.query(CalendarEvent)
        
        if start_date:
            query = query.filter(CalendarEvent.start_time >= start_date)
        if end_date:
            query = query.filter(CalendarEvent.start_time <= end_date)
            
        events_objs = query.order_by(CalendarEvent.start_time.asc()).all()
        
        events = []
        for e in events_objs:
            # Filter by player_id
            if player_id:
                if e.player_ids and player_id not in e.player_ids:
                    continue
            
            events.append({
                "id": e.id,
                "title": e.title,
                "type": e.type,
                "description": e.description,
                "start_time": e.start_time.isoformat(),
                "end_time": e.end_time.isoformat(),
                "player_ids": e.player_ids,
                "created_at": e.created_at.isoformat()
            })
        return events
    finally:
        session.close()

def delete_event(event_id: str):
    """Deletes a calendar event from Cloud SQL."""
    session = get_session()
    try:
        event = session.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
        if event:
            session.delete(event)
            session.commit()
    except Exception as e:
        session.rollback()
        logger.error("Error deleting calendar event: %s", str(e))
        raise
    finally:
        session.close()
