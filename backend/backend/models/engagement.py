"""
The Nest — Player Engagement Model

Stores AFL Player Engagement 2026 fields:
  - Education, study days, certificates
  - Body load tier + goal
  - Community/engagement status
  - Listing type, state, family info
"""

import logging
from sqlalchemy import Column, Integer, String, Boolean, Date, Text
from db.cloudsql_client import Base, get_session

logger = logging.getLogger(__name__)


class PlayerEngagement(Base):
    __tablename__ = 'player_engagement'

    jumper_no         = Column(Integer, primary_key=True)
    listing           = Column(String(50))     # e.g. List, Father-Son, Cat B
    dob               = Column(String(20))     # ISO date string
    state             = Column(String(50))     # VIC, QLD, NSW, WA, SA, TAS, NT, ACT
    has_children      = Column(Boolean, default=False)
    program           = Column(String(100))    # State-level program affiliation

    # Education
    area_of_schooling = Column(String(100))
    education_study   = Column(String(255))    # Degree / course name
    university        = Column(String(100))
    study_monday      = Column(Boolean, default=False)
    study_wednesday   = Column(Boolean, default=False)
    study_thursday    = Column(Boolean, default=False)
    certificate_1     = Column(String(100))
    certificate_2     = Column(String(100))

    # Physical / Body
    body_load_tier    = Column(Integer)        # 1-4
    body_goal         = Column(String(100))    # e.g. Gain muscle, Maintain, Lose weight

    # Community & Engagement
    community_engaged = Column(Boolean, default=False)
    engagement_notes  = Column(Text)

    def to_dict(self):
        return {
            "jumper_no":         self.jumper_no,
            "listing":           self.listing,
            "dob":               self.dob,
            "state":             self.state,
            "has_children":      self.has_children,
            "program":           self.program,
            "area_of_schooling": self.area_of_schooling,
            "education_study":   self.education_study,
            "university":        self.university,
            "study_monday":      self.study_monday,
            "study_wednesday":   self.study_wednesday,
            "study_thursday":    self.study_thursday,
            "certificate_1":     self.certificate_1,
            "certificate_2":     self.certificate_2,
            "body_load_tier":    self.body_load_tier,
            "body_goal":         self.body_goal,
            "community_engaged": self.community_engaged,
            "engagement_notes":  self.engagement_notes,
        }


def get_engagement(jumper_no: int) -> dict | None:
    """Return the engagement record for a single player."""
    session = get_session()
    try:
        row = session.query(PlayerEngagement).filter(
            PlayerEngagement.jumper_no == jumper_no
        ).first()
        return row.to_dict() if row else None
    finally:
        session.close()


def get_all_engagement() -> list[dict]:
    """Return engagement records for all players."""
    session = get_session()
    try:
        rows = session.query(PlayerEngagement).all()
        return [r.to_dict() for r in rows]
    finally:
        session.close()
