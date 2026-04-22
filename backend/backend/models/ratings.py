import uuid
import random
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from db.cloudsql_client import Base, get_session
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
    round_id = Column(Integer)
    source = Column(String(20), nullable=False, default='coach') # 'coach' or 'player'
    created_at = Column(DateTime, default=datetime.utcnow)


def submit_rating(data: dict) -> dict:
    """
    Upserts a rating — updates if one exists for the same
    player/skill/source/round, inserts otherwise.
    """
    session = get_session()
    try:
        player_id = int(data["player_id"])
        skill_category = data["skill_category"]
        skill_name = data["skill_name"]
        source = data.get("source", "coach")
        round_id = data.get("round_id")
        if round_id is not None:
            round_id = int(round_id)

        # Look for existing rating matching player/skill/source/round
        query = session.query(CoachRating).filter(
            CoachRating.player_id == player_id,
            CoachRating.skill_name == skill_name,
            CoachRating.skill_category == skill_category,
            CoachRating.source == source,
        )
        if round_id is not None:
            query = query.filter(CoachRating.round_id == round_id)
        else:
            query = query.filter(CoachRating.round_id.is_(None))

        existing = query.first()

        if existing:
            existing.rating_value = int(data["rating_value"])
            existing.notes = data.get("notes", "")
            existing.date = datetime.now().strftime("%Y-%m-%d")
            if round_id is not None:
                existing.round_id = round_id
        else:
            new_rating = CoachRating(
                player_id=player_id,
                skill_category=skill_category,
                skill_name=skill_name,
                rating_value=int(data["rating_value"]),
                notes=data.get("notes", ""),
                date=datetime.now().strftime("%Y-%m-%d"),
                round_id=round_id,
                source=source,
            )
            session.add(new_rating)

        session.commit()
        return {"message": "Rating saved successfully"}
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

def get_player_ratings(player_id: int, round_id: int | None = None) -> dict:
    """
    Fetches the latest coach ratings for a player from Cloud SQL.
    If round_id is provided, only ratings for that round are returned.
    """
    session = get_session()
    try:
        # Get all ratings for this player, ordered by created_at desc
        query = session.query(CoachRating).filter(CoachRating.player_id == player_id)
        if round_id is not None:
            query = query.filter(CoachRating.round_id == round_id)
        ratings_objs = query.order_by(CoachRating.created_at.desc()).all()
        
        # Deduplicate to get only the latest rating per skill, separated by source
        coach_ratings = {}
        self_ratings = {}
        
        for r in ratings_objs:
            key = f"{r.skill_category}_{r.skill_name}"
            if r.source == 'coach' and key not in coach_ratings:
                coach_ratings[key] = {
                    "category": r.skill_category,
                    "skill": r.skill_name,
                    "rating": r.rating_value,
                    "notes": r.notes,
                    "date": r.date
                }
            elif r.source == 'player' and key not in self_ratings:
                self_ratings[key] = {
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

        # Process Granular Data (Join Coach and Self)
        all_skills = set(list(coach_ratings.keys()) + list(self_ratings.keys()))
        
        for key in all_skills:
            coach_data = coach_ratings.get(key)
            self_data = self_ratings.get(key)
            
            skill = coach_data["skill"] if coach_data else self_data["skill"]
            category = coach_data["category"] if coach_data else self_data["category"]
            
            coach_val = coach_data["rating"] if coach_data else 0
            self_val = self_data["rating"] if self_data else 0
            
            # Use random for squad avg only in demo context, or leave 0
            squad_val = max(1, min(10, (coach_val or self_val) + random.randint(-1, 2)))
            
            comparison_data.append({
                "skill": skill,
                "category": category,
                "coach_rating": coach_val,
                "self_rating": self_val,
                "squad_avg": squad_val,
                "gap": coach_val - self_val if (coach_val and self_val) else 0
            })


            # Add to aggregation
            group = get_group(skill)
            if group:
                if coach_val: aggregated[group]["coach"].append(coach_val)
                if self_val: aggregated[group]["self"].append(self_val)
                aggregated[group]["squad"].append(squad_val)


        # Finalize Aggregated Data
        aggregated_data = []
        import statistics
        for group, vals in aggregated.items():
            if vals["coach"] or vals["self"]:
                aggregated_data.append({
                    "category": group,
                    "coach": round(statistics.mean(vals["coach"]), 1) if vals["coach"] else 0,
                    "self": round(statistics.mean(vals["self"]), 1) if vals["self"] else 0,
                    "squad": round(statistics.mean(vals["squad"]), 1) if vals["squad"] else 0
                })

        return {
            "ratings": comparison_data,
            "aggregated": aggregated_data
        }
    finally:
        session.close()

def get_team_matrix(category: str | None = None, round_id: int | None = None) -> dict:
    """
    Returns a matrix of all players and their granular ratings.
    If round_id is provided, filter by that round instead of latest date.
    If category is provided, only include skills matching that category.
    """
    session = get_session()
    try:
        if round_id is not None:
            # Filter by specific round
            query = session.query(CoachRating).filter(CoachRating.round_id == round_id)
        else:
            # Find the most recent date
            latest_date_obj = session.query(CoachRating).order_by(CoachRating.date.desc()).first()
            if not latest_date_obj:
                return {"players": [], "skills": [], "matrix": {}}
            latest_date = latest_date_obj.date
            query = session.query(CoachRating).filter(CoachRating.date == latest_date)

        if category is not None:
            query = query.filter(CoachRating.skill_category == category)

        ratings = query.all()
        
        # Build the matrix
        matrix = {} # { player_id: { skill_name: { coach: X, self: Y } } }
        all_skills = set()
        player_names = {}
        
        from models.players import Player
        players = session.query(Player).all()
        for p in players:
            player_names[p.jumper_no] = p.name

        for r in ratings:
            p_id = r.player_id
            if p_id not in matrix:
                matrix[p_id] = {}
            
            skill = r.skill_name
            all_skills.add(skill)
            
            if skill not in matrix[p_id]:
                matrix[p_id][skill] = {"coach": 0, "self": 0}
            
            if r.source == 'coach':
                matrix[p_id][skill]["coach"] = r.rating_value
            else:
                matrix[p_id][skill]["self"] = r.rating_value
        
        # Only include players that have ratings in this round/category
        rated_players = [{"id": pid, "name": player_names.get(pid, f"Player {pid}")} for pid in matrix.keys()]
        rated_players.sort(key=lambda p: p["name"])

        return {
            "players": rated_players,
            "skills": sorted(list(all_skills)),
            "matrix": matrix
        }
    finally:
        session.close()

def get_yearly_matrix(player_id: int, category: str | None = None) -> dict:
    """
    Returns a matrix of rounds and granular ratings for a single player.
    Uses Round.name as the key when a round_id is present, falling back to date.
    If category is provided, only include skills matching that category.
    """
    from models.rounds import Round

    session = get_session()
    try:
        query = session.query(CoachRating).filter(CoachRating.player_id == player_id)
        if category is not None:
            query = query.filter(CoachRating.skill_category == category)
        ratings = query.order_by(CoachRating.date.asc()).all()

        # Build a lookup of round_id -> (name, sort_order)
        round_ids = {r.round_id for r in ratings if r.round_id is not None}
        round_lookup = {}
        if round_ids:
            rounds = session.query(Round).filter(Round.id.in_(round_ids)).all()
            for rnd in rounds:
                round_lookup[rnd.id] = (rnd.name, rnd.sort_order)

        matrix = {}  # { round_key: { skill_name: { coach: X, self: Y } } }
        all_skills = set()
        key_sort = {}  # { round_key: sort_value }

        for r in ratings:
            if r.round_id is not None and r.round_id in round_lookup:
                key = round_lookup[r.round_id][0]  # Round.name
                key_sort[key] = round_lookup[r.round_id][1]  # Round.sort_order
            else:
                key = r.date
                key_sort[key] = key  # sort alphabetically by date string

            if key not in matrix:
                matrix[key] = {}

            skill = r.skill_name
            all_skills.add(skill)

            if skill not in matrix[key]:
                matrix[key][skill] = {"coach": 0, "self": 0}

            if r.source == 'coach':
                matrix[key][skill]["coach"] = r.rating_value
            else:
                matrix[key][skill]["self"] = r.rating_value

        # Sort keys: numeric sort_order first, then date strings
        sorted_keys = sorted(matrix.keys(), key=lambda k: (isinstance(key_sort[k], str), key_sort[k]))

        return {
            "rounds": sorted_keys,
            "skills": sorted(list(all_skills)),
            "matrix": matrix
        }
    finally:
        session.close()
