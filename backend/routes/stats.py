import logging
from flask import Blueprint, jsonify, request
from models.stats import get_player_stats_2025

logger = logging.getLogger(__name__)
stats_bp = Blueprint("stats", __name__)

@stats_bp.route("/2025", methods=["GET"])
def get_stats():
    """
    Fetches player stats for the 2025 season.
    Joins with players table to get names and positions.
    Query param: jumper_no (optional)
    """
    jumper_no = request.args.get("jumper_no")
    
    try:
        jumper_no_int = int(jumper_no) if jumper_no else None
        results = get_player_stats_2025(jumper_no_int)
        return jsonify(results), 200
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        return jsonify({"error": "Failed to fetch stats"}), 500
