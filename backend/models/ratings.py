import uuid
import random
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from db.alloydb_client import Base, get_session
from config import get_config

_config = get_config()

class CoachRating(Base):
    __tablename__ = 'coach_ratings'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    player_id = Column(Integer, nullable=False)
    skill_category = Column(String(100), nullable=False)
    skill_name = Column(String(100), nullable=False)
    rating_value = Column(Integer, nullable=False)
    notes = Column(Text)
    date = Column(String(10)) # YYYY-MM-DD
    created_at = Column(DateTime, default=datetime.utcnow)

def submit_rating(data: dict) -> dict:
    """
    Submits a coach rating for a player skill using AlloyDB.
    """
    session = get_session()
    try:
        new_rating = CoachRating(
            player_id=int(data["player_id"]),
            skill_category=data["skill_category"],
            skill_name=data["skill_name"],
            rating_value=int(data["rating_value"]),
            notes=data.get("notes", ""),
            date=datetime.now().strftime("%Y-%m-%d")
        )
        session.add(new_rating)
        session.commit()
        return {"message": "Rating submitted successfully"}
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

def get_player_ratings(player_id: int) -> dict:
    """
    Fetches the latest coach ratings for a player from AlloyDB.
    """
    session = get_session()
    try:
        # Get all ratings for this player, ordered by created_at desc
        ratings_objs = session.query(CoachRating).filter(CoachRating.player_id == player_id).order_by(CoachRating.created_at.desc()).all()
        
        # Deduplicate to get only the latest rating per skill
        coach_ratings = {}
        for r in ratings_objs:
            key = f"{r.skill_category}_{r.skill_name}"
            if key not in coach_ratings:
                coach_ratings[key] = {
                    "category": r.skill_category,
                    "skill": r.skill_name,
                    "rating": r.rating_value,
                    "notes": r.notes,
                    "date": r.date
                }
                
        comparison_data = []
        
        # ── Aggregation Logic ──────────────────────────────────────────────────
        aggregated = {
            "Kicking": {"coach": [], "self": [], "squad": []},
            "Marking": {"coach": [], "self": [], "squad": []},
            "Contest": {"coach": [], "self": [], "squad": []},
            "Tactical": {"coach": [], "self": [], "squad": []},
            "Physical": {"coach": [], "self": [], "squad": []},
            "Mental": {"coach": [], "self": [], "squad": []}
        }

        mapping = {
            "Kicking": ["Kicking", "Goal Kicking", "Foot Effectiveness"],
            "Marking": ["Marking"],
            "Contest": ["Handball", "Clean Hands", "Ground Ball", "Tackle", "Tackling", "Spoil", "Smother", "Ruck Setup"],
            "Tactical": ["Positioning", "Decision Making", "Reading the Play", "Structure", "Game Sense", "Transition"],
            "Physical": ["Acceleration", "Speed", "Agility", "Endurance", "Strength", "Vertical Jump", "Explosiveness", "Recovery"],
            "Mental": ["Resilience", "Leadership", "Professionalism", "Communication", "Work Rate", "Focus", "Coachability", "Aggression", "Composure", "Drive"]
        }

        def get_group(skill_name):
            for group, keywords in mapping.items():
                if any(k.lower() in skill_name.lower() for k in keywords):
                    return group
            return None

        # Process Granular Data
        for key, data in coach_ratings.items():
            coach_val = data["rating"]
            skill = data["skill"]
            category = data["category"]
            
            # Mock values for Self and Squad
            self_val = max(1, min(10, coach_val + random.randint(-2, 2)))
            squad_val = max(1, min(10, coach_val + random.randint(-1, 2)))
            
            comparison_data.append({
                "skill": skill,
                "category": category,
                "coach_rating": coach_val,
                "self_rating": self_val,
                "squad_avg": squad_val,
                "gap": coach_val - self_val
            })

            # Add to aggregation
            group = get_group(skill)
            if group:
                aggregated[group]["coach"].append(coach_val)
                aggregated[group]["self"].append(self_val)
                aggregated[group]["squad"].append(squad_val)

        # Finalize Aggregated Data
        aggregated_data = []
        import statistics
        for group, vals in aggregated.items():
            if vals["coach"]:
                aggregated_data.append({
                    "category": group,
                    "coach": round(statistics.mean(vals["coach"]), 1),
                    "self": round(statistics.mean(vals["self"]), 1),
                    "squad": round(statistics.mean(vals["squad"]), 1)
                })

        return {
            "ratings": comparison_data,
            "aggregated": aggregated_data
        }
    finally:
        session.close()
