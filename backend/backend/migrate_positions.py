import sys
import os

# Add the backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

from db.cloudsql_client import get_session
from models.team import TeamSelection

NEW_POSITIONS = [
    "EXT_1", "EXT_2", "EXT_3", "EXT_4", "EXT_5",
    "COACH_NOTES"
]

def migrate():
    session = get_session()
    try:
        existing = [p.position_id for p in session.query(TeamSelection).all()]
        added = 0
        for pos_id in NEW_POSITIONS:
            if pos_id not in existing:
                session.add(TeamSelection(
                    position_id=pos_id,
                    player_id=None,
                    notes=""
                ))
                added += 1
        
        session.commit()
        print(f"Migration complete. Added {added} new positions.")
    except Exception as e:
        session.rollback()
        print(f"Migration failed: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    migrate()
