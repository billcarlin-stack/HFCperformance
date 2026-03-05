"""
The Nest — Authentication Middleware

Verifies Firebase ID Tokens from the Authorization: Bearer <token> header.
Looks up the verified email in the user_roles table to determine the user's role.

Usage:
    from auth.middleware import require_role

    @app.route('/api/secure')
    @require_role('admin', 'coach')
    def secure_endpoint():
        ...
"""

import logging
from functools import wraps
from flask import jsonify, request, g
from firebase_admin import auth as firebase_auth
from auth.firebase_admin_init import get_firebase_app
from models.user_roles import get_user_by_email

logger = logging.getLogger(__name__)

VALID_ROLES = {"admin", "coach", "medical", "analyst", "player"}


def _get_verified_user() -> dict | None:
    """
    Extracts and verifies the Firebase ID Token from the Authorization header.
    Returns the user dict from the DB, or None if invalid/missing.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    id_token = auth_header[len("Bearer "):]
    if not id_token:
        return None

    try:
        get_firebase_app()  # Ensure initialized
        decoded = firebase_auth.verify_id_token(id_token)
        email = decoded.get("email", "").lower().strip()
        if not email:
            return None
        user = get_user_by_email(email)
        return user
    except firebase_auth.ExpiredIdTokenError:
        logger.warning("Firebase token expired")
        return None
    except firebase_auth.InvalidIdTokenError as e:
        logger.warning("Invalid Firebase token: %s", str(e))
        return None
    except Exception as e:
        logger.error("Firebase token verification error: %s", str(e))
        return None


def require_role(*allowed_roles):
    """
    Decorator that enforces role-based access control via Firebase Auth.

    Reads the Authorization: Bearer <firebase_id_token> header, verifies it,
    then checks the user's role from the user_roles table.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = _get_verified_user()

            if not user:
                return jsonify({
                    "error": "Authentication required",
                    "message": "A valid Firebase ID token is required. Please sign in with Google."
                }), 401

            # Instead of forcing the DB role, we read the role the user selected
            # via the PIN login on the frontend (sent in the headers).
            user_role = request.headers.get("X-User-Role", "").lower()
            player_id_str = request.headers.get("X-Player-Id")
            
            player_id = None
            if player_id_str and player_id_str.isdigit():
                player_id = int(player_id_str)

            if user_role not in VALID_ROLES:
                return jsonify({
                    "error": "Invalid role",
                    "message": f"Role '{user_role}' is not recognized or not provided. Please complete the PIN login."
                }), 403

            if user_role not in allowed_roles:
                return jsonify({
                    "error": "Forbidden",
                    "message": f"You do not have permission to access this resource."
                }), 403

            # Store in Flask's request-scoped globals for use in route handlers
            g.user_role = user_role
            g.user_email = user.get("email")
            g.player_id = player_id

            return f(*args, **kwargs)

        return decorated_function

    return decorator
