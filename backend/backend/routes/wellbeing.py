"""
The Hawk Hub — Wellbeing Survey API Routes

Endpoints:
    POST /api/wellbeing                — Submit a wellbeing survey
    GET  /api/wellbeing/<jumper_no>    — Get survey history for a player
"""

import logging

from flask import Blueprint, jsonify, request

from models.wellbeing import submit_survey, get_surveys_for_player
from utils.readiness import ReadinessEngine
from auth.middleware import require_role

logger = logging.getLogger(__name__)

wellbeing_bp = Blueprint("wellbeing", __name__)


@wellbeing_bp.route("/api/wellbeing", methods=["POST"])
@require_role("admin", "coach", "medical", "player")
def post_wellbeing():
    """
    Submits a wellbeing survey for a player.
    """
    data = request.get_json()
    from flask import g
    if g.user_role == 'player' and data.get("player_id") != g.player_id:
        return jsonify({"error": "Forbidden", "message": "Players can only submit surveys for themselves"}), 403

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    try:
        record = submit_survey(data)

        # Calculate readiness from the submitted scores
        readiness = ReadinessEngine.calculate_readiness(
            record["sleep_score"],
            record["soreness_score"],
            record["stress_score"],
        )
        record["readiness"] = readiness

        return jsonify(record), 201

    except ValueError as e:
        return jsonify({"error": "Validation error", "detail": str(e)}), 400

    except Exception as e:
        logger.error("Error submitting wellbeing survey: %s", str(e))
        return (
            jsonify({"error": "Failed to submit survey", "detail": str(e)}),
            500,
        )


@wellbeing_bp.route("/api/wellbeing/<int:jumper_no>", methods=["GET"])
@require_role("admin", "coach", "medical", "player")
def get_wellbeing(jumper_no):
    """
    Returns the wellbeing survey history for a player.
    """
    from flask import g
    if g.user_role == 'player' and g.player_id != jumper_no:
        return jsonify({"error": "Forbidden", "message": "Players can only view their own history"}), 403
    try:
        limit = min(int(request.args.get("limit", 30)), 100)
        surveys = get_surveys_for_player(jumper_no, limit=limit)
        return jsonify(surveys), 200

    except Exception as e:
        logger.error(
            "Error fetching wellbeing surveys for player %d: %s",
            jumper_no,
            str(e),
        )
        return (
            jsonify({"error": "Failed to fetch surveys", "detail": str(e)}),
            500,
        )


@wellbeing_bp.route("/api/wellbeing/alerts", methods=["GET"])
@require_role("admin", "coach", "medical")
def get_wellbeing_alerts():
    """
    Returns recent wellbeing surveys that have non-empty notes.
    Used for the coaching alerts panel.
    """
    try:
        limit = min(int(request.args.get("limit", 10)), 50)
        from models.wellbeing import get_surveys_with_notes
        surveys = get_surveys_with_notes(limit=limit)
        return jsonify(surveys), 200
    except Exception as e:
        logger.error("Error fetching wellbeing alerts: %s", str(e))
        return (
            jsonify({"error": "Failed to fetch alerts", "detail": str(e)}),
            500,
        )
