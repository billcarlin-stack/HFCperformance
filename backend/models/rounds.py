from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, text, ForeignKey
from db.cloudsql_client import Base, get_session
from datetime import date


class Season(Base):
    __tablename__ = 'seasons'
    __table_args__ = {'schema': 'coaching'}
    id = Column(Integer, primary_key=True)
    name = Column(String(20), unique=True, nullable=False)
    is_current = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=text('now()'))

    def to_dict(self):
        return {"id": self.id, "name": self.name, "is_current": self.is_current}


class Round(Base):
    __tablename__ = 'rounds'
    __table_args__ = {'schema': 'coaching'}
    id = Column(Integer, primary_key=True)
    season_id = Column(Integer, ForeignKey('coaching.seasons.id'), nullable=False)
    name = Column(String(50), nullable=False)
    short_name = Column(String(10), nullable=False)
    match_date = Column(Date)
    end_date = Column(Date)
    sort_order = Column(Integer, nullable=False)
    opponent = Column(String(100))
    venue = Column(String(100))
    is_home = Column(Boolean)

    def to_dict(self):
        return {
            "id": self.id,
            "season_id": self.season_id,
            "name": self.name,
            "short_name": self.short_name,
            "match_date": str(self.match_date) if self.match_date else None,
            "end_date": str(self.end_date) if self.end_date else None,
            "sort_order": self.sort_order,
            "opponent": self.opponent,
            "venue": self.venue,
            "is_home": self.is_home,
        }


def get_all_seasons() -> list[dict]:
    session = get_session()
    try:
        seasons = session.query(Season).order_by(Season.name.asc()).all()
        return [s.to_dict() for s in seasons]
    finally:
        session.close()


def get_current_season() -> dict | None:
    session = get_session()
    try:
        season = session.query(Season).filter(Season.is_current == True).first()
        return season.to_dict() if season else None
    finally:
        session.close()


def get_rounds_for_season(season_id: int) -> list[dict]:
    session = get_session()
    try:
        rounds = session.query(Round).filter(Round.season_id == season_id).order_by(Round.sort_order).all()
        return [r.to_dict() for r in rounds]
    finally:
        session.close()


def get_current_round() -> dict | None:
    """Find the round closest to today's date (the round whose match_date <= today and end_date >= today, or the next upcoming round)."""
    session = get_session()
    try:
        today = date.today()
        season = session.query(Season).filter(Season.is_current == True).first()
        if not season:
            return None

        # First try: find round where today falls between match_date and end_date
        current = session.query(Round).filter(
            Round.season_id == season.id,
            Round.match_date <= today,
            Round.end_date >= today
        ).first()
        if current:
            return current.to_dict()

        # Fallback: find the most recent round that has started
        latest = session.query(Round).filter(
            Round.season_id == season.id,
            Round.match_date <= today
        ).order_by(Round.sort_order.desc()).first()
        if latest:
            return latest.to_dict()

        # Before season: return first round
        first = session.query(Round).filter(
            Round.season_id == season.id
        ).order_by(Round.sort_order.asc()).first()
        return first.to_dict() if first else None
    finally:
        session.close()
