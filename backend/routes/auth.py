"""
The Nest — Auth Routes

Provides a token verification endpoint for the frontend.
The frontend sends its Firebase ID Token; this endpoint verifies it,
looks up the user's role from the database, and returns the session profile.
"""

import logging
from flask import Blueprint, jsonify, request, g
from auth.firebase_admin_init import get_firebase_app
from firebase_admin import auth as firebase_auth
from models.user_roles import get_user_by_email

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/verify", methods=["POST"])
def verify_token():
    """
    Accepts a Firebase ID token, verifies it, and returns the user's role.

    Body: { "idToken": "<firebase_id_token>" }
    Returns: { "role": "coach"|"player", "name": "...", "player_id": null|int, "email": "..." }
    """
    data = request.get_json()
    id_token = (data or {}).get("idToken", "").strip()

    if not id_token:
        return jsonify({"error": "idToken is required"}), 400

    try:
        get_firebase_app()
        decoded = firebase_auth.verify_id_token(id_token)
        email = decoded.get("email", "").lower().strip()
        display_name = decoded.get("name", "")

        if not email:
            return jsonify({"error": "Token does not contain an email address."}), 400

        # Look up the user's role in the DB
        user = get_user_by_email(email)

        if not user:
            logger.warning("Unauthorized login attempt from: %s", email)
            return jsonify({
                "error": "Access Denied",
                "message": f"Your account ({email}) is not authorized to access The Nest. Please contact your administrator."
            }), 403

        return jsonify({
            "authorized": True,
            "email": email,
        }), 200

    except firebase_auth.ExpiredIdTokenError:
        return jsonify({"error": "Session expired. Please sign in again."}), 401
    except firebase_auth.InvalidIdTokenError:
        return jsonify({"error": "Invalid token. Please sign in again."}), 401
    except Exception as e:
        logger.error("Token verification failed: %s", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": "Authentication failed. Please try again.",
            "details": str(e)
        }), 500


@auth_bp.route("/login", methods=["POST"])
def pin_login():
    """
    Validates a PIN for role selection after Google Auth.
    0 = Coach
    1-99 = Player Jumper Number
    """
    data = request.get_json()
    pin = data.get("pin", "").strip()

    if not pin:
        return jsonify({"error": "PIN is required"}), 400

    if pin == "0":
        return jsonify({
            "role": "coach",
            "name": "Coaching Staff",
            "initials": "CS",
            "jumper_no": None,
            "player_id": None
        }), 200

    try:
        from db.alloydb_client import get_session
        from models.players import Player
        session = get_session()
        jumper_no = int(pin)
        
        player = session.query(Player).filter_by(jumper_no=jumper_no).first()
        if not player:
            return jsonify({"error": "Invalid PIN. No player found with that jumper number."}), 401
            
        parts = player.name.split()
        initials = (parts[0][0] + parts[-1][0]).upper() if len(parts) >= 2 else player.name[:2].upper()
            
        return jsonify({
            "role": "player",
            "name": player.name,
            "initials": initials,
            "jumper_no": player.jumper_no,
            "player_id": player.jumper_no
        }), 200
        
    except ValueError:
        return jsonify({"error": "Invalid PIN format."}), 400
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({"error": "An error occurred during login."}), 500
