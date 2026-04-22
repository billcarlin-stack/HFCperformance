"""
The Nest — Player Engagement Routes

Endpoints:
    GET /api/engagement/<player_id>   — Single player engagement details
    GET /api/engagement/              — All player engagement data
"""

import logging
from flask import Blueprint, jsonify
from models.engagement import get_engagement, get_all_engagement
from auth.middleware import require_role

logger = logging.getLogger(__name__)
engagement_bp = Blueprint("engagement", __name__)


@engagement_bp.route("/<int:player_id>", methods=["GET"])
@require_role("admin", "coach", "medical", "analyst", "player")
def get_player_engagement(player_id):
    """Returns engagement data for a single player."""
    try:
        data = get_engagement(player_id)
        if not data:
            return jsonify({"engagement": None, "message": "No engagement data for this player"}), 200
        return jsonify({"engagement": data}), 200
    except Exception as e:
        logger.error("Error fetching engagement for player %d: %s", player_id, str(e))
        return jsonify({"error": str(e)}), 500


@engagement_bp.route("/", methods=["GET"])
@require_role("admin", "coach", "analyst")
def get_all_engagement_data():
    """Returns engagement data for all players."""
    try:
        data = get_all_engagement()
        return jsonify({"engagement": data}), 200
    except Exception as e:
        logger.error("Error fetching all engagement data: %s", str(e))
        return jsonify({"error": str(e)}), 500
