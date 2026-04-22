from sqlalchemy import Column, Integer, String, DateTime, Text, text
from db.cloudsql_client import Base, get_session
from datetime import datetime
import uuid

class WoopGoal(Base):
    __tablename__ = 'woop_goals'

    id = Column(String(50), primary_key=True)
    player_id = Column(Integer, nullable=False)
    wish = Column(Text)
    outcome = Column(Text)
    obstacle = Column(Text)
    plan = Column(Text)
    status = Column(String(50), default='active') # 'active', 'completed'
    week_of = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=text('now()'))

    def to_dict(self):
        return {
            "id": self.id,
            "player_id": self.player_id,
            "wish": self.wish,
            "outcome": self.outcome,
            "obstacle": self.obstacle,
            "plan": self.plan,
            "status": self.status,
            "week_of": self.week_of,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

def get_player_woop_goals(player_id: int) -> list[dict]:
    session = get_session()
    try:
        goals = session.query(WoopGoal).filter(WoopGoal.player_id == player_id).order_by(WoopGoal.created_at.desc()).limit(50).all()
        return [g.to_dict() for g in goals]
    finally:
        session.close()

def create_woop_goal(data: dict) -> dict:
    session = get_session()
    try:
        goal_id = str(uuid.uuid4())[:8]
        new_goal = WoopGoal(
            id=goal_id,
            player_id=data['player_id'],
            wish=data.get('wish', ''),
            outcome=data.get('outcome', ''),
            obstacle=data.get('obstacle', ''),
            plan=data.get('plan', ''),
            status='active',
            week_of=data.get('week_of', datetime.now().strftime("%Y-W%W")),
            created_at=datetime.now()
        )
        session.add(new_goal)
        session.commit()
        return new_goal.to_dict()
    finally:
        session.close()

def update_woop_goal_status(goal_id: str, status: str) -> bool:
    session = get_session()
    try:
        goal = session.query(WoopGoal).filter(WoopGoal.id == goal_id).first()
        if goal:
            goal.status = status
            session.commit()
            return True
        return False
    finally:
        session.close()
