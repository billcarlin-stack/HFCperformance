"""
The Shinboner Hub — Rating Routes
"""

from flask import Blueprint, request, jsonify
from models.ratings import submit_rating, get_player_ratings

from auth.middleware import require_role

ratings_bp = Blueprint('ratings', __name__)

@ratings_bp.route('/ratings/<int:player_id>', methods=['GET'])
@require_role("admin", "coach", "medical", "analyst", "player")
def get_ratings(player_id):
    from flask import g
    if g.user_role == 'player' and g.player_id != player_id:
        return jsonify({"error": "Forbidden", "message": "Players can only view their own ratings"}), 403
    try:
        data = get_player_ratings(player_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ratings_bp.route('/ratings', methods=['POST'])
def save_rating():
    try:
        data = request.json
        result = submit_rating(data)
        return jsonify(result), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
