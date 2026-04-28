"""
The Hawk Hub — IDP Assessment Periods

An assessment period is a dated snapshot when the whole squad is rated together.
Coaches open a new period (name + optional notes), submit ratings for all players
within it, then close it. Historical periods are read-only.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from db.cloudsql_client import Base, get_session


class IdpAssessmentPeriod(Base):
    __tablename__ = 'idp_assessment_periods'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)          # e.g. "Round 5 2026 Assessment"
    season = Column(String(10), nullable=False, default='2026')
    is_active = Column(Boolean, default=True)           # False once closed/archived
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime)


def create_assessment_period(name: str, season: str = '2026', notes: str | None = None) -> dict:
    session = get_session()
    try:
        period = IdpAssessmentPeriod(name=name, season=season, notes=notes)
        session.add(period)
        session.commit()
        return _period_dict(period)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def list_assessment_periods(season: str | None = None) -> list[dict]:
    session = get_session()
    try:
        q = session.query(IdpAssessmentPeriod).order_by(IdpAssessmentPeriod.created_at.desc())
        if season:
            q = q.filter_by(season=season)
        return [_period_dict(p) for p in q.all()]
    finally:
        session.close()


def close_assessment_period(period_id: str) -> dict:
    session = get_session()
    try:
        period = session.query(IdpAssessmentPeriod).get(period_id)
        if not period:
            raise ValueError(f"Period {period_id} not found")
        period.is_active = False
        period.closed_at = datetime.utcnow()
        session.commit()
        return _period_dict(period)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _period_dict(p: IdpAssessmentPeriod) -> dict:
    return {
        'id': p.id,
        'name': p.name,
        'season': p.season,
        'is_active': p.is_active,
        'notes': p.notes,
        'created_at': p.created_at.isoformat() if p.created_at else None,
        'closed_at': p.closed_at.isoformat() if p.closed_at else None,
    }
