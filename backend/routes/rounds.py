import logging
from flask import Blueprint, jsonify, request
from models.rounds import get_all_seasons, get_current_season, get_rounds_for_season, get_current_round

logger = logging.getLogger(__name__)
rounds_bp = Blueprint("rounds", __name__)


@rounds_bp.route("/seasons", methods=["GET"])
def list_seasons():
    """GET /api/rounds/seasons — all seasons, newest first."""
    try:
        seasons = get_all_seasons()
        return jsonify(seasons), 200
    except Exception as e:
        logger.error(f"Error fetching seasons: {e}")
        return jsonify({"error": "Failed to fetch seasons"}), 500


@rounds_bp.route("/current-season", methods=["GET"])
def current_season():
    try:
        season = get_current_season()
        if not season:
            return jsonify({"season": None, "rounds": [], "current_round": None}), 200
        rounds = get_rounds_for_season(season["id"])
        current_round = get_current_round()
        return jsonify({
            "season": season,
            "rounds": rounds,
            "current_round": current_round,
        }), 200
    except Exception as e:
        logger.error(f"Error fetching season: {e}")
        return jsonify({"error": "Failed to fetch season data"}), 500


@rounds_bp.route("/seasons/<int:season_id>/rounds", methods=["GET"])
def season_rounds(season_id):
    """GET /api/rounds/seasons/:id/rounds — rounds for a specific season."""
    try:
        rounds = get_rounds_for_season(season_id)
        return jsonify(rounds), 200
    except Exception as e:
        logger.error(f"Error fetching rounds: {e}")
        return jsonify({"error": "Failed to fetch rounds"}), 500
