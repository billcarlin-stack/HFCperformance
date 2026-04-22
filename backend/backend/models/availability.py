import logging
from sqlalchemy import func, case
from db.cloudsql_client import get_session
from models.players import Player

logger = logging.getLogger(__name__)

def get_team_availability() -> dict:
    """
    Returns a squad-wide availability summary from Cloud SQL.
    """
    session = get_session()
    try:
        # Summary by status
        summary_results = session.query(
            Player.status,
            func.count(Player.jumper_no).label('count')
        ).group_by(Player.status).all()

        # Position breakdown
        position_results = session.query(
            Player.position,
            Player.status,
            func.count(Player.jumper_no).label('count')
        ).group_by(Player.position, Player.status).all()

        # Flagged players (not Green)
        flagged_results = session.query(Player).filter(Player.status != 'Green').order_by(
            case(
                (Player.status == 'Red', 1),
                (Player.status == 'Amber', 2),
                else_=3
            ),
            Player.name
        ).all()

        # Build summary
        status_counts = {row.status: row.count for row in summary_results}
        total = sum(status_counts.values())
        green = status_counts.get("Green", 0)

        # Build position breakdown
        position_breakdown = {}
        for row in position_results:
            pos = row.position
            if not pos: continue
            if pos not in position_breakdown:
                position_breakdown[pos] = {"Green": 0, "Amber": 0, "Red": 0}
            position_breakdown[pos][row.status] = row.count

        return {
            "total_players": total,
            "available": green,
            "availability_pct": round((green / total) * 100, 1) if total > 0 else 0,
            "status_breakdown": status_counts,
            "position_breakdown": position_breakdown,
            "flagged_players": [p.to_dict() for p in flagged_results],
        }

    except Exception as e:
        logger.error("Error fetching team availability: %s", str(e))
        raise
    finally:
        session.close()
