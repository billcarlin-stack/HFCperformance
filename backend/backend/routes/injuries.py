"""
The Hawk Hub — Injury Routes
"""

from flask import Blueprint, request, jsonify, g
from models.injuries import log_injury, get_injury_history, update_injury
from auth.middleware import require_role

injuries_bp = Blueprint('injuries', __name__)

@injuries_bp.route('/injuries', methods=['GET'])
@require_role('admin', 'coach', 'medical', 'player')
def get_injuries():
    try:
        history = get_injury_history()
        return jsonify(history), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@injuries_bp.route('/injuries/<injury_id>', methods=['PUT'])
@require_role('admin', 'coach', 'medical')
def update_injury_route(injury_id):
    try:
        data = request.json
        result = update_injury(injury_id, data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@injuries_bp.route('/injuries', methods=['POST'])
@require_role('admin', 'coach', 'medical', 'player')
def create_injury():
    try:
        data = request.json
        
        # Enforce self-logging for players
        if g.user_role == 'player':
            if int(data.get('player_id')) != g.player_id:
                return jsonify({
                    "error": "Forbidden",
                    "message": "Players can only log injuries for themselves."
                }), 403
                
        result = log_injury(data)
        return jsonify(result), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
