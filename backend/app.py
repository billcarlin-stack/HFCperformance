"""
The Hawk Hub — Application Entry Point

Flask application factory for the Hawthorn FC
high-performance analytics platform.

Usage:
    Development:  python app.py
    Production:   gunicorn -c gunicorn.conf.py app:app
"""

import logging
import os

from flask import Flask, jsonify
from flask_cors import CORS

from config import get_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def create_app(config=None):
    """
    Application factory for the Hawk Hub backend.
    """
    app = Flask(__name__)

    # Load configuration
    if config is None:
        config = get_config()
    app.config.from_object(config)

    # Enable CORS
    CORS(app, origins=config.CORS_ORIGINS)

    # ── Health Check (Moved Up) ───────────────────────────────────
    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "Hawk Hub Online",
            "environment": os.environ.get("FLASK_ENV", "production"),
        }), 200

    # ── Register Blueprints ───────────────────────────────────────
    from routes.players import players_bp
    from routes.idp import idp_bp
    from routes.wellbeing import wellbeing_bp
    from routes.availability import availability_bp
    from routes.insights import insights_bp
    from routes.injuries import injuries_bp
    from routes.ratings import ratings_bp
    from routes.ai import ai_bp
    from routes.stats import stats_bp
    from routes.team import team_bp
    from routes.auth import auth_bp
    from routes.woop import woop_bp
    from routes.calendar import calendar_bp
    from routes.fitness import fitness_bp

    app.register_blueprint(players_bp)
    app.register_blueprint(idp_bp)
    app.register_blueprint(wellbeing_bp)
    app.register_blueprint(availability_bp)
    app.register_blueprint(insights_bp)
    app.register_blueprint(injuries_bp, url_prefix='/api')
    app.register_blueprint(ratings_bp, url_prefix='/api')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(stats_bp, url_prefix='/api/stats')
    app.register_blueprint(team_bp, url_prefix='/api/team')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(woop_bp, url_prefix='/api')
    app.register_blueprint(calendar_bp, url_prefix='/api')
    app.register_blueprint(fitness_bp, url_prefix='/api/v1/fitness')

    # ── Temporary Admin/Seed Route ────────────────────────────────
    @app.route('/api/admin/seed', methods=['GET'])
    def admin_seed():
        """Synchronous seeding route using consolidated database_utils.
        """
        try:
            from database_utils import initialize_and_seed
            initialize_and_seed()
            
            return jsonify({
                "status": "success", 
                "message": "Database initialized and seeded successfully (Simplified Version)"
            }), 200
            
        except Exception as e:
            logger.error(f"Seeding failed: {str(e)}", exc_info=True)
            return jsonify({
                "status": "error",
                "message": "Seeding failed. Check server logs.",
                "detail": str(e)
            }), 500

    # ── Global Error Handlers ─────────────────────────────────────
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not Found"}), 404

    return app


# Create the app instance (used by Gunicorn: `gunicorn app:app`)
app = create_app()


if __name__ == "__main__":
    # Use PORT from environment (Cloud Run requirement)
    port = int(os.environ.get("PORT", 5000))
    # Disable debug if we have a PORT set (likely production)
    app.run(debug=(port == 5000), host="0.0.0.0", port=port)
