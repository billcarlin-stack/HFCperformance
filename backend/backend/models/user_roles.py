"""
The Nest — User Roles Model

Maps a verified Google account (by email) to an application role (coach / player)
and optionally a player_id (jumper number).

This table is the source of truth for who is allowed to access the system
and what they can see. It is populated by an admin via the /api/admin/seed route
or manually in the database.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from db.cloudsql_client import Base, get_session


class UserRole(Base):
    __tablename__ = 'user_roles'

    id = Column(Integer, primary_key=True, autoincrement=True)
    google_email = Column(String(255), unique=True, nullable=False)
    role = Column(String(20), nullable=False)       # 'coach' or 'player'
    player_id = Column(Integer, nullable=True)       # jumper_no for players, null for coaches
    name = Column(String(255), nullable=True)        # display name
    created_at = Column(DateTime, default=datetime.utcnow)


def get_user_by_email(email: str) -> dict | None:
    """
    Look up a user's role and player_id by their verified Google email.
    Returns None if the email is not in the allowed list.
    """
    session = get_session()
    try:
        user = session.query(UserRole).filter(
            UserRole.google_email == email.lower().strip()
        ).first()
        if not user:
            return None
        return {
            "role": user.role,
            "player_id": user.player_id,
            "name": user.name,
            "email": user.google_email,
        }
    finally:
        session.close()


def create_or_update_user(email: str, role: str, player_id: int | None, name: str) -> None:
    """
    Upsert a user role mapping. Used during seeding and admin management.
    """
    session = get_session()
    try:
        existing = session.query(UserRole).filter(
            UserRole.google_email == email.lower().strip()
        ).first()
        if existing:
            existing.role = role
            existing.player_id = player_id
            existing.name = name
        else:
            new_user = UserRole(
                google_email=email.lower().strip(),
                role=role,
                player_id=player_id,
                name=name,
            )
            session.add(new_user)
        session.commit()
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()
