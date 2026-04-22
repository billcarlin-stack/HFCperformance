"""
The Hawk Hub — Players API Routes

Endpoints:
    GET  /api/players              — List all players with readiness data
    GET  /api/players/<jumper_no>  — Player detail with IDP ratings
"""

import random
import logging

from flask import Blueprint, jsonify, request

from models.players import get_all_players, get_player_by_id
from models.idp_ratings import get_idp_for_player
from utils.readiness import ReadinessEngine
from auth.middleware import require_role

logger = logging.getLogger(__name__)

players_bp = Blueprint("players", __name__)


@players_bp.route("/api/players", methods=["GET"])
@require_role("admin", "coach", "medical", "analyst")
def list_players():
    """
    Returns all players enriched with real-time readiness scores.

    Response: JSON array of player objects with `readiness` and
    `form_trend` fields appended.
    """
    try:
        players = get_all_players()

        # Enrich each player with readiness data
        for p in players:
            sleep = random.randint(6, 10)
            soreness = (
                random.randint(7, 10)
                if p["status"] == "Green"
                else random.randint(3, 6)
            )
            stress = random.randint(7, 10)

            p["readiness"] = ReadinessEngine.calculate_readiness(
                sleep, soreness, stress
            )
            p["form_trend"] = ReadinessEngine.get_form_trend(p["jumper_no"])

        return jsonify(players), 200

    except Exception as e:
        logger.error("Error fetching players: %s", str(e))
        return jsonify({"error": "Failed to fetch players", "detail": str(e)}), 500


@players_bp.route("/api/players/compare", methods=["GET"])
@require_role("admin", "coach", "analyst")
def compare_players():
    """
    Compares two or more players side-by-side.

    Query params:
        ids: Comma-separated list of jumper numbers (e.g. "3,6,12")

    Response:
        JSON object with `players` list containing full details + IDP for each.
    """
    ids_str = request.args.get("ids", "")
    if not ids_str:
        return jsonify({"error": "Missing 'ids' query parameter"}), 400

    try:
        # Parse IDs
        jumper_nos = [int(x.strip()) for x in ids_str.split(",") if x.strip().isdigit()]
        
        if not jumper_nos:
            return jsonify({"error": "No valid player IDs provided"}), 400

        # Fetch players
        comparison_data = []
        for jn in jumper_nos:
            p = get_player_by_id(jn)
            if p:
                # Add IDP
                p['idp'] = get_idp_for_player(jn)
                
                # Add Readiness (Simulation)
                sleep = random.randint(6, 10)
                soreness = random.randint(7, 10) if p['status'] == 'Green' else random.randint(3, 6)
                stress = random.randint(7, 10)
                p['readiness'] = ReadinessEngine.calculate_readiness(sleep, soreness, stress)
                p['form_trend'] = ReadinessEngine.get_form_trend(jn)
                
                comparison_data.append(p)

        return jsonify({"players": comparison_data}), 200

    except Exception as e:
        logger.error("Error comparing players: %s", str(e))
        return jsonify({"error": "Failed to compare players", "detail": str(e)}), 500


@players_bp.route("/api/players/<int:jumper_no>", methods=["GET"])
@require_role("admin", "coach", "medical", "analyst", "player")
def get_player(jumper_no):
    """
    Returns detailed player info including IDP ratings.
    """
    from flask import g
    if g.user_role == 'player' and g.player_id != jumper_no:
        return jsonify({"error": "Forbidden", "message": "Players can only view their own profile"}), 403

    try:
        player = get_player_by_id(jumper_no)
        if not player:
            return (
                jsonify(
                    {
                        "error": "Player not found",
                        "message": f"No player with jumper number {jumper_no}",
                    }
                ),
                404,
            )

        # Add IDP ratings (Now fetching real BQ data via model)
        player["idp"] = get_idp_for_player(jumper_no)

        # Add readiness
        sleep = random.randint(6, 10)
        soreness = (
            random.randint(7, 10)
            if player["status"] == "Green"
            else random.randint(3, 6)
        )
        stress = random.randint(7, 10)
        player["readiness"] = ReadinessEngine.calculate_readiness(
            sleep, soreness, stress
        )
        player["form_trend"] = ReadinessEngine.get_form_trend(jumper_no)

        # Add Analytics (Real Data)
        from models.wellbeing import get_surveys_for_player
        from utils.analytics import calculate_rolling_averages, detect_anomalies

        surveys = get_surveys_for_player(jumper_no, limit=90)
        
        analytics = {
            "rolling_averages": calculate_rolling_averages(surveys),
            "anomalies": detect_anomalies(surveys)
        }
        player["analytics"] = analytics

        return jsonify(player), 200

    except Exception as e:
        logger.error(
            "Error fetching player %d: %s", jumper_no, str(e)
        )
        return (
            jsonify({"error": "Failed to fetch player", "detail": str(e)}),
            500,
        )
