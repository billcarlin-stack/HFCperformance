"""
The Hawk Hub — Auth Routes

PIN-based authentication:
    PIN 0 = Coach (full access)
    PIN = player jersey number = Player (limited access)
"""

import logging
from flask import Blueprint, jsonify, request
from models.players import get_player_by_id, get_all_players

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Validates a PIN and returns the user's role and name.

    Body: { "pin": "0" }
    Returns: { "role": "coach"|"player", "name": "...", "jumper_no": null|int, "initials": "AC" }
    """
    data = request.get_json()
    pin = data.get("pin", "").strip() if data else ""

    if pin == "":
        return jsonify({"error": "PIN is required"}), 400

    try:
        pin_int = int(pin)
    except ValueError:
        return jsonify({"error": "Invalid PIN format"}), 400

    # Coach PIN
    if pin_int == 0:
        return jsonify({
            "role": "coach",
            "name": "Head Coach",
            "jumper_no": None,
            "initials": "HC"
        }), 200

    # Player PIN — lookup by jumper_no
    try:
        player = get_player_by_id(pin_int)
    except Exception as e:
        logger.error("Login database error: %s", str(e))
        return jsonify({"error": "Database connection error. Please check your configuration."}), 500
    
    if not player:
        # Check if database is empty to provide helpful hint
        try:
            all_players = get_all_players()
            if not all_players:
                return jsonify({"error": "Database is currently empty. Please trigger /api/admin/seed to initialize data."}), 401
        except:
            pass
        return jsonify({"error": "Invalid PIN. No player found with that jersey number."}), 401

    name = player.get("name", "Player")
    parts = name.split()
    initials = (parts[0][0] + parts[-1][0]).upper() if len(parts) >= 2 else name[:2].upper()

    return jsonify({
        "role": "player",
        "name": name,
        "jumper_no": pin_int,
        "initials": initials
    }), 200
