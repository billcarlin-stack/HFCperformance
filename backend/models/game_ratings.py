"""
The Hawk Hub — Game Ratings model

Captures two separate rating streams that both sit on a 1-5 scale, one per
player per match:

  * source='coach'  → a coach rates a player for their performance in a game.
                      Entered in a weekly bulk-table UI after every match.
  * source='player' → a player self-rates their own performance for the game.
                      A player only ever sees (and submits) their own rating.

This is intentionally separate from the 1-10 CoachRating (IDP) table which is
longitudinal skill development data captured every 6-8 weeks.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, UniqueConstraint
from db.cloudsql_client import Base, get_session


class GameRating(Base):
    __tablename__ = 'game_ratings'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    player_id = Column(Integer, nullable=False, index=True)          # jumper_no
    round_label = Column(String(30), nullable=False, index=True)     # e.g. "R3 2026"
    season = Column(String(10), nullable=False, default="2026")
    rating_value = Column(Integer, nullable=False)                   # 1..5
    source = Column(String(20), nullable=False)                      # 'coach' | 'player'
    rater_id = Column(String(255))                                   # coach email or player jumper_no
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        # One coach rating per (player, round) — re-submits update. The rater_id
        # keeps an audit trail but the uniqueness is deliberately at player-round
        # level for 'coach' so the squad table stays clean.
        UniqueConstraint('player_id', 'round_label', 'source', name='uq_game_rating_player_round_source'),
    )


def _upsert(session, player_id: int, round_label: str, source: str, rating: int,
            rater_id: str | None, notes: str | None, season: str = "2026") -> GameRating:
    existing = session.query(GameRating).filter_by(
        player_id=player_id, round_label=round_label, source=source
    ).first()
    if existing:
        existing.rating_value = rating
        existing.notes = notes
        existing.rater_id = rater_id
        existing.updated_at = datetime.utcnow()
        return existing
    new = GameRating(
        player_id=player_id,
        round_label=round_label,
        season=season,
        rating_value=rating,
        source=source,
        rater_id=rater_id,
        notes=notes,
    )
    session.add(new)
    return new


def submit_coach_game_ratings(round_label: str, ratings: list[dict], rater_id: str,
                              season: str = "2026") -> dict:
    """Bulk-upsert coach game ratings for a single round.

    ratings: [{player_id, rating, notes?}]
    """
    session = get_session()
    try:
        saved = 0
        for r in ratings:
            if r.get("rating") is None:
                continue
            val = int(r["rating"])
            if val < 1 or val > 5:
                continue
            _upsert(
                session,
                player_id=int(r["player_id"]),
                round_label=round_label,
                source="coach",
                rating=val,
                rater_id=rater_id,
                notes=r.get("notes") or None,
                season=season,
            )
            saved += 1
        session.commit()
        return {"saved": saved, "round_label": round_label}
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def submit_self_game_rating(player_id: int, round_label: str, rating: int,
                             notes: str | None = None, season: str = "2026") -> dict:
    if rating < 1 or rating > 5:
        raise ValueError("rating must be between 1 and 5")
    session = get_session()
    try:
        _upsert(
            session,
            player_id=player_id,
            round_label=round_label,
            source="player",
            rating=rating,
            rater_id=str(player_id),
            notes=notes,
            season=season,
        )
        session.commit()
        return {"saved": 1, "round_label": round_label}
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_coach_ratings_for_round(round_label: str) -> list[dict]:
    session = get_session()
    try:
        rows = session.query(GameRating).filter_by(
            round_label=round_label, source="coach"
        ).all()
        return [{
            "player_id": r.player_id,
            "rating": r.rating_value,
            "notes": r.notes,
            "round_label": r.round_label,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        } for r in rows]
    finally:
        session.close()


def get_coach_rating_rounds() -> list[str]:
    session = get_session()
    try:
        rows = session.query(GameRating.round_label).filter_by(source="coach").distinct().all()
        return sorted([r[0] for r in rows], reverse=True)
    finally:
        session.close()


def get_self_rating_history(player_id: int) -> list[dict]:
    session = get_session()
    try:
        rows = session.query(GameRating).filter_by(
            player_id=player_id, source="player"
        ).order_by(GameRating.updated_at.desc()).all()
        return [{
            "round_label": r.round_label,
            "rating": r.rating_value,
            "notes": r.notes,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        } for r in rows]
    finally:
        session.close()


def get_coach_rating_matrix(season: str | None = None) -> dict:
    """Returns the full coach rating grid: rounds (chronological) and a
    {player_id: {round_label: rating}} map for fast frontend rendering."""
    session = get_session()
    try:
        q = session.query(GameRating).filter_by(source="coach")
        if season:
            q = q.filter_by(season=season)
        rows = q.all()
        rounds = sorted({r.round_label for r in rows}, key=_round_sort_key)
        matrix: dict[int, dict[str, int]] = {}
        notes_map: dict[int, dict[str, str]] = {}
        for r in rows:
            matrix.setdefault(r.player_id, {})[r.round_label] = r.rating_value
            if r.notes:
                notes_map.setdefault(r.player_id, {})[r.round_label] = r.notes
        return {"rounds": rounds, "matrix": matrix, "notes": notes_map}
    finally:
        session.close()


def _round_sort_key(label: str):
    """Sort 'R3 2026' style round labels by (season, round number)."""
    import re
    m = re.match(r"R\s*(\d+)\s*(\d{4})?", label.strip(), re.IGNORECASE)
    if m:
        return (int(m.group(2) or 0), int(m.group(1)))
    return (0, label)


def get_latest_round_for_player(player_id: int) -> str | None:
    """Returns the round_label the player most recently self-rated, or None."""
    session = get_session()
    try:
        row = session.query(GameRating).filter_by(
            player_id=player_id, source="player"
        ).order_by(GameRating.updated_at.desc()).first()
        return row.round_label if row else None
    finally:
        session.close()
