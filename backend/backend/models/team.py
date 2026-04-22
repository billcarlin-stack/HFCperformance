"""
Team Builder — Version-based team selection model.

Each version is a row in saved_squads with the full field state as JSON.
One version per round can be marked is_active (the current working draft).
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, text
from db.cloudsql_client import Base, get_session
from datetime import datetime


class SavedSquad(Base):
    __tablename__ = 'saved_squads'

    id = Column(Integer, primary_key=True)
    round_id = Column(Integer)
    round_name = Column(String(50), nullable=False, default='Round 1')
    name = Column(String(100), nullable=False)
    data = Column(String)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=text('now()'))
    updated_at = Column(DateTime(timezone=True), server_default=text('now()'))

    def to_dict(self):
        return {
            "id": self.id,
            "round_id": self.round_id,
            "round_name": self.round_name,
            "name": self.name,
            "data": self.data,
            "is_active": self.is_active or False,
            "created_at": str(self.created_at) if self.created_at else None,
            "updated_at": str(self.updated_at) if self.updated_at else None,
        }


# Legacy table — kept for backwards compat with init scripts
class TeamSelection(Base):
    __tablename__ = 'team_selections'

    position_id = Column(String(50), primary_key=True)
    player_id = Column(Integer)
    rotation_color = Column(String(50))
    rotation_minutes = Column(Integer)
    notes = Column(String)
    updated_at = Column(DateTime(timezone=True), server_default=text('now()'))

    def to_dict(self):
        return {
            "position_id": self.position_id,
            "player_id": self.player_id,
            "rotation_color": self.rotation_color,
            "rotation_minutes": self.rotation_minutes,
            "notes": self.notes,
        }


# ── Version CRUD ─────────────────────────────────────────────

def get_versions_for_round(round_id: int) -> list[dict]:
    session = get_session()
    try:
        versions = (
            session.query(SavedSquad)
            .filter(SavedSquad.round_id == round_id)
            .order_by(SavedSquad.created_at.asc())
            .all()
        )
        return [v.to_dict() for v in versions]
    finally:
        session.close()


def get_version(version_id: int) -> dict | None:
    session = get_session()
    try:
        v = session.query(SavedSquad).filter(SavedSquad.id == version_id).first()
        return v.to_dict() if v else None
    finally:
        session.close()


def create_version(round_id: int, name: str, data: str = "[]") -> dict:
    session = get_session()
    try:
        session.query(SavedSquad).filter(
            SavedSquad.round_id == round_id
        ).update({"is_active": False})

        version = SavedSquad(
            round_id=round_id,
            name=name,
            data=data,
            is_active=True,
        )
        session.add(version)
        session.commit()
        session.refresh(version)
        return version.to_dict()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def set_active_version(version_id: int) -> dict | None:
    session = get_session()
    try:
        version = session.query(SavedSquad).filter(SavedSquad.id == version_id).first()
        if not version:
            return None

        session.query(SavedSquad).filter(
            SavedSquad.round_id == version.round_id
        ).update({"is_active": False})

        version.is_active = True
        session.commit()
        session.refresh(version)
        return version.to_dict()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def update_version_data(version_id: int, data: str) -> bool:
    session = get_session()
    try:
        version = session.query(SavedSquad).filter(SavedSquad.id == version_id).first()
        if not version:
            return False
        version.data = data
        version.updated_at = datetime.now()
        session.commit()
        return True
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def rename_version(version_id: int, name: str) -> dict | None:
    session = get_session()
    try:
        version = session.query(SavedSquad).filter(SavedSquad.id == version_id).first()
        if not version:
            return None
        version.name = name
        version.updated_at = datetime.now()
        session.commit()
        session.refresh(version)
        return version.to_dict()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def duplicate_version(version_id: int, new_name: str | None = None) -> dict | None:
    session = get_session()
    try:
        original = session.query(SavedSquad).filter(SavedSquad.id == version_id).first()
        if not original:
            return None

        session.query(SavedSquad).filter(
            SavedSquad.round_id == original.round_id
        ).update({"is_active": False})

        copy = SavedSquad(
            round_id=original.round_id,
            name=new_name or f"{original.name} (copy)",
            data=original.data,
            is_active=True,
        )
        session.add(copy)
        session.commit()
        session.refresh(copy)
        return copy.to_dict()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def copy_version_to_round(version_id: int, target_round_id: int, new_name: str | None = None) -> dict | None:
    session = get_session()
    try:
        original = session.query(SavedSquad).filter(SavedSquad.id == version_id).first()
        if not original:
            return None

        session.query(SavedSquad).filter(
            SavedSquad.round_id == target_round_id
        ).update({"is_active": False})

        copy = SavedSquad(
            round_id=target_round_id,
            name=new_name or f"{original.name} (copy)",
            data=original.data,
            is_active=True,
        )
        session.add(copy)
        session.commit()
        session.refresh(copy)
        return copy.to_dict()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def delete_version(version_id: int) -> bool:
    session = get_session()
    try:
        version = session.query(SavedSquad).filter(SavedSquad.id == version_id).first()
        if not version:
            return False
        session.delete(version)
        session.commit()
        return True
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
