"""
Box Hill Hawks — API Route

GET /api/players/box-hill
    Returns all Box Hill listed players.
    Note: AFL-listed Hawthorn players can also appear in Box Hill
    matches but are sourced from the main players_2026 table.
    This endpoint returns VFL-only listed players.
"""

import logging
from flask import Blueprint, jsonify
from models.box_hill_players import get_all_box_hill_players

logger = logging.getLogger(__name__)

box_hill_bp = Blueprint("box_hill", __name__)


@box_hill_bp.route("/box-hill", methods=["GET"])
def list_box_hill_players():
    """Returns all Box Hill VFL-listed players."""
    try:
        players = get_all_box_hill_players()
        return jsonify(players), 200
    except Exception as e:
        logger.error("Error fetching Box Hill players: %s", str(e))
        return jsonify({"error": "Failed to fetch Box Hill players", "detail": str(e)}), 500
