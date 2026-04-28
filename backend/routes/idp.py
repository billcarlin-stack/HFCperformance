"""
The Hawk Hub — IDP Ratings API Routes

Endpoints:
    GET /api/idp/<jumper_no>       — IDP ratings for a specific player
    GET /api/idp/periods           — list all assessment periods
    POST /api/idp/periods          — create a new assessment period
    POST /api/idp/periods/<id>/close — close/archive a period
"""

import logging

from flask import Blueprint, jsonify, request

from models.idp_ratings import get_idp_for_player
from models.idp_assessment import (
    create_assessment_period,
    list_assessment_periods,
    close_assessment_period,
)
from auth.middleware import require_role

logger = logging.getLogger(__name__)

idp_bp = Blueprint("idp", __name__)


@idp_bp.route("/api/idp/<int:jumper_no>", methods=["GET"])
@require_role("admin", "coach", "analyst", "player")
def get_idp(jumper_no):
    """
    Returns the Individual Development Plan (IDP) ratings for a player.
    """
    from flask import g
    if g.user_role == 'player' and g.player_id != jumper_no:
        return jsonify({"error": "Forbidden", "message": "Players can only view their own IDP"}), 403

    try:
        idp = get_idp_for_player(jumper_no)
        return jsonify(idp), 200

    except Exception as e:
        logger.error("Error fetching IDP for player %d: %s", jumper_no, str(e))
        return (
            jsonify({"error": "Failed to fetch IDP ratings", "detail": str(e)}),
            500,
        )


# ── Assessment Period Endpoints ───────────────────────────────────────────────

@idp_bp.route("/api/idp/periods", methods=["GET"])
@require_role("admin", "coach", "analyst", "player")
def list_periods():
    """List all IDP assessment periods, newest first."""
    try:
        season = request.args.get("season")
        periods = list_assessment_periods(season=season)
        return jsonify(periods), 200
    except Exception as e:
        logger.error("Error listing IDP assessment periods: %s", str(e))
        return jsonify({"error": "Failed to list assessment periods", "detail": str(e)}), 500


@idp_bp.route("/api/idp/periods", methods=["POST"])
@require_role("admin", "coach")
def create_period():
    """Create a new IDP assessment period."""
    try:
        body = request.get_json() or {}
        name = body.get("name", "").strip()
        if not name:
            return jsonify({"error": "name is required"}), 400
        season = body.get("season", "2026")
        notes = body.get("notes")
        period = create_assessment_period(name=name, season=str(season), notes=notes)
        return jsonify(period), 201
    except Exception as e:
        logger.error("Error creating IDP assessment period: %s", str(e))
        return jsonify({"error": "Failed to create assessment period", "detail": str(e)}), 500


@idp_bp.route("/api/idp/periods/<string:period_id>/close", methods=["POST"])
@require_role("admin", "coach")
def close_period(period_id):
    """Mark an IDP assessment period as closed/archived."""
    try:
        period = close_assessment_period(period_id)
        return jsonify(period), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error("Error closing IDP assessment period %s: %s", period_id, str(e))
        return jsonify({"error": "Failed to close assessment period", "detail": str(e)}), 500
