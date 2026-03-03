import logging
from flask import Blueprint, jsonify, request
from models.team import get_all_team_selections, update_team_selection as db_update_team_selection

logger = logging.getLogger(__name__)
team_bp = Blueprint("team", __name__)

@team_bp.route("/builder", methods=["GET"])
def get_team_selections():
    """Fetches current team builder selections."""
    try:
        results = get_all_team_selections()
        return jsonify(results), 200
    except Exception as e:
        logger.error(f"Error fetching team: {e}")
        return jsonify({"error": "Failed to fetch team selections"}), 500

@team_bp.route("/builder", methods=["POST"])
def update_team_selection():
    """Updates a specific position in the team builder."""
    data = request.json
    pos_id = data.get("position_id")
    player_id = data.get("player_id") # Can be None
    notes = data.get("notes", "")
    
    if not pos_id:
        return jsonify({"error": "position_id is required"}), 400
        
    try:
        success = db_update_team_selection(pos_id, player_id, notes)
        if success:
            return jsonify({"status": "success"}), 200
        else:
            return jsonify({"error": "Position not found"}), 404
    except Exception as e:
        logger.error(f"Error updating team: {e}")
        return jsonify({"error": "Failed to update team selection"}), 500
