"""
The Hawk Hub — Game Ratings Routes (1-5 weekly)

Two flavours, both on a 1-5 scale, distinct from the longitudinal 1-10 IDP:

  POST /api/game-ratings/coach/bulk  (coach/admin)  bulk-upsert coach ratings
  GET  /api/game-ratings/coach?round= (coach/admin) full squad for a round
  GET  /api/game-ratings/coach/rounds (coach/admin) list of rounds

  POST /api/game-ratings/self        (player)       submit own self-rating
  GET  /api/game-ratings/self        (player)       own history only
"""

import logging
from flask import Blueprint, jsonify, request, g

from auth.middleware import require_role
from models.game_ratings import (
    submit_coach_game_ratings,
    submit_self_game_rating,
    get_coach_ratings_for_round,
    get_coach_rating_rounds,
    get_coach_rating_matrix,
    get_self_rating_history,
)

logger = logging.getLogger(__name__)
game_ratings_bp = Blueprint("game_ratings", __name__)


# ── Coach game ratings (1-5 per player, weekly) ─────────────────────────────

@game_ratings_bp.route("/coach/bulk", methods=["POST"])
@require_role("admin", "coach")
def bulk_submit_coach_game_ratings():
    body = request.get_json() or {}
    round_label = (body.get("round_label") or "").strip()
    ratings = body.get("ratings") or []
    season = body.get("season") or "2026"

    if not round_label:
        return jsonify({"error": "round_label is required"}), 400
    if not isinstance(ratings, list) or len(ratings) == 0:
        return jsonify({"error": "ratings must be a non-empty list"}), 400

    try:
        rater = getattr(g, "user_email", None) or "unknown"
        result = submit_coach_game_ratings(round_label, ratings, rater_id=rater, season=season)
        return jsonify(result), 200
    except Exception as e:
        logger.exception("Failed to submit coach game ratings")
        return jsonify({"error": str(e)}), 500


@game_ratings_bp.route("/coach", methods=["GET"])
@require_role("admin", "coach", "analyst")
def list_coach_game_ratings():
    round_label = (request.args.get("round") or "").strip()
    if not round_label:
        rounds = get_coach_rating_rounds()
        if not rounds:
            return jsonify({"round_label": None, "ratings": []}), 200
        round_label = rounds[0]
    try:
        data = get_coach_ratings_for_round(round_label)
        return jsonify({"round_label": round_label, "ratings": data}), 200
    except Exception as e:
        logger.exception("Failed to load coach game ratings")
        return jsonify({"error": str(e)}), 500


@game_ratings_bp.route("/coach/matrix", methods=["GET"])
@require_role("admin", "coach", "analyst")
def coach_rating_matrix():
    season = request.args.get("season")
    try:
        return jsonify(get_coach_rating_matrix(season)), 200
    except Exception as e:
        logger.exception("Failed to load coach rating matrix")
        return jsonify({"error": str(e)}), 500


@game_ratings_bp.route("/coach/rounds", methods=["GET"])
@require_role("admin", "coach", "analyst")
def list_coach_rating_rounds():
    try:
        return jsonify({"rounds": get_coach_rating_rounds()}), 200
    except Exception as e:
        logger.exception("Failed to list rounds")
        return jsonify({"error": str(e)}), 500


# ── Player self game ratings (1-5, private per player) ──────────────────────

@game_ratings_bp.route("/self", methods=["POST"])
@require_role("admin", "player")
def submit_self_rating():
    body = request.get_json() or {}
    round_label = (body.get("round_label") or "").strip()
    rating = body.get("rating")
    notes = body.get("notes")
    season = body.get("season") or "2026"

    # Admin impersonating a player OR a real player — use the effective player_id.
    player_id = getattr(g, "player_id", None)
    if player_id is None:
        return jsonify({"error": "No player identity bound to this session"}), 403

    if not round_label:
        return jsonify({"error": "round_label is required"}), 400

    try:
        rating_int = int(rating)
    except (TypeError, ValueError):
        return jsonify({"error": "rating must be an integer between 1 and 5"}), 400

    if rating_int < 1 or rating_int > 5:
        return jsonify({"error": "rating must be between 1 and 5"}), 400

    try:
        result = submit_self_game_rating(int(player_id), round_label, rating_int, notes, season)
        return jsonify(result), 200
    except Exception as e:
        logger.exception("Failed to submit self game rating")
        return jsonify({"error": str(e)}), 500


@game_ratings_bp.route("/self", methods=["GET"])
@require_role("admin", "player")
def list_self_ratings():
    player_id = getattr(g, "player_id", None)
    if player_id is None:
        return jsonify({"error": "No player identity bound to this session"}), 403
    try:
        data = get_self_rating_history(int(player_id))
        return jsonify({"ratings": data}), 200
    except Exception as e:
        logger.exception("Failed to load self game ratings")
        return jsonify({"error": str(e)}), 500
