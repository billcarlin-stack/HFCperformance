"""
The Nest — Fitness Routes

Endpoints:
    GET /api/fitness/session/<player_id>  — Latest GPS/training session
    GET /api/fitness/pbs/<player_id>      — Personal best metrics
"""

import logging
from flask import Blueprint, jsonify, request
from models.fitness import get_latest_session, get_fitness_pbs
from auth.middleware import require_role

logger = logging.getLogger(__name__)
fitness_bp = Blueprint("fitness", __name__)
print("DEBUG: Routes Fitness Blueprint loaded")


@fitness_bp.route("/session/<int:player_id>", methods=["GET"])
@require_role("admin", "coach", "medical", "analyst", "player")
def get_session(player_id):
    """Returns the latest GPS session data for a player."""
    phases_param = request.args.get("phases")
    phases = phases_param.split(",") if phases_param else None

    try:
        session = get_latest_session(player_id, phases)
        if not session:
            return jsonify({"session": None, "message": "No session data available"}), 200
        return jsonify({"session": session}), 200
    except Exception as e:
        logger.error("Error fetching fitness session for player %d: %s", player_id, str(e))
        return jsonify({"error": str(e)}), 500


@fitness_bp.route("/pbs/<int:player_id>", methods=["GET"])
@require_role("admin", "coach", "medical", "analyst", "player")
def get_pbs(player_id):
    """Returns personal best metrics for a player."""
    try:
        pbs = get_fitness_pbs(player_id)
        if not pbs:
            return jsonify({"pbs": None, "message": "No PB data available"}), 200
        return jsonify({"pbs": pbs}), 200
    except Exception as e:
        logger.error("Error fetching fitness PBs for player %d: %s", player_id, str(e))
        return jsonify({"error": str(e)}), 500
