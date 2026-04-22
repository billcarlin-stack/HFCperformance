"""
The Hawk Hub — Team Availability API Routes

Endpoints:
    GET /api/availability  — Squad-wide availability summary
"""

import logging

from flask import Blueprint, jsonify

from models.availability import get_team_availability
from auth.middleware import require_role

logger = logging.getLogger(__name__)

availability_bp = Blueprint("availability", __name__)


@availability_bp.route("/api/availability", methods=["GET"])
@require_role("admin", "coach", "medical", "analyst")
def team_availability():
    """
    Returns a squad-wide availability summary.

    Response:
        {
            "total_players": 44,
            "available": 37,
            "availability_pct": 84.1,
            "status_breakdown": {"Green": 37, "Amber": 4, "Red": 3},
            "position_breakdown": { ... },
            "flagged_players": [ ... ]
        }
    """
    try:
        availability = get_team_availability()
        return jsonify(availability), 200

    except Exception as e:
        logger.error("Error fetching team availability: %s", str(e))
        return (
            jsonify(
                {"error": "Failed to fetch availability", "detail": str(e)}
            ),
            500,
        )
