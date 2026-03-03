"""
The Hawk Hub — WOOP Goal Setting Routes

WOOP = Wish, Outcome, Obstacle, Plan
Players set weekly goals; coaches review and track completion.

Endpoints:
    GET  /api/woop/<player_id>   — get all WOOP goals for a player
    POST /api/woop               — create a new WOOP goal
    PATCH /api/woop/<goal_id>    — update a goal's status
"""

import logging
import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from models.woop import get_player_woop_goals, create_woop_goal, update_woop_goal_status

logger = logging.getLogger(__name__)
woop_bp = Blueprint("woop", __name__)


@woop_bp.route("/woop/<int:player_id>", methods=["GET"])
def get_woop(player_id):
    """Get all WOOP goals for a player, newest first."""
    try:
        results = get_player_woop_goals(player_id)
        return jsonify(results), 200
    except Exception as e:
        logger.error(f"Error fetching WOOP goals: {e}")
        return jsonify({"error": "Failed to fetch goals"}), 500


@woop_bp.route("/woop", methods=["POST"])
def create_woop():
    """Create a new WOOP goal."""
    data = request.get_json()
    if not data or not data.get("player_id"):
        return jsonify({"error": "player_id is required"}), 400

    try:
        record = create_woop_goal(data)
        return jsonify(record), 201
    except Exception as e:
        logger.error(f"Error creating WOOP goal: {e}")
        return jsonify({"error": "Failed to create goal"}), 500


@woop_bp.route("/woop/<goal_id>", methods=["PATCH"])
def update_woop(goal_id):
    """Update a WOOP goal's status (e.g., mark as completed)."""
    data = request.get_json()
    new_status = data.get("status", "active") if data else "active"

    try:
        success = update_woop_goal_status(goal_id, new_status)
        if success:
            return jsonify({"status": "success", "id": goal_id, "new_status": new_status}), 200
        else:
            return jsonify({"error": "Goal not found"}), 404
    except Exception as e:
        logger.error(f"Error updating WOOP goal: {e}")
        return jsonify({"error": "Failed to update goal"}), 500
