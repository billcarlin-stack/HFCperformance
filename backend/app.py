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
    from routes.admin import admin_bp
    from routes.opposition import opposition_bp
    from routes.timeline import timeline_bp
    from routes.engagement import engagement_bp
    from routes.squad_builder import squad_builder_bp
    from routes.rounds import rounds_bp
    from routes.analytics import analytics_bp
    from routes.debrief import debrief_bp
    from routes.box_hill import box_hill_bp

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
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(opposition_bp, url_prefix='/api/opposition')
    app.register_blueprint(timeline_bp, url_prefix='/api/timeline')
    app.register_blueprint(engagement_bp, url_prefix='/api/engagement')
    app.register_blueprint(squad_builder_bp, url_prefix='/api/squad-builder')
    app.register_blueprint(rounds_bp, url_prefix='/api/rounds')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(debrief_bp, url_prefix='/api/debrief')
    app.register_blueprint(box_hill_bp, url_prefix='/api/players')

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

    @app.route('/api/admin/seed-champion-data', methods=['GET'])
    def seed_champion_data():
        """Seed Champion Data CSVs into cd_matches, cd_lineups, cd_rotations, cd_gps."""
        try:
            from seeds.seed_champion_data import main as seed_cd
            seed_cd()

            # Return counts
            from db.cloudsql_client import get_session
            from sqlalchemy import text
            session = get_session()
            counts = {}
            for table in ['cd_matches', 'cd_lineups', 'cd_rotations', 'cd_gps']:
                result = session.execute(text(f"SELECT count(*) FROM {table}"))
                counts[table] = result.scalar()
            session.close()

            return jsonify({
                "status": "success",
                "counts": counts
            }), 200
        except Exception as e:
            logger.error(f"Champion Data seeding failed: {str(e)}", exc_info=True)
            return jsonify({
                "status": "error",
                "detail": str(e)
            }), 500

    @app.route('/api/admin/seed-box-hill', methods=['GET'])
    def seed_box_hill():
        """Seed Box Hill Hawks VFL players into the box_hill_players table."""
        try:
            from seeds.seed_box_hill_players import seed
            seed()

            # Return player count
            from db.cloudsql_client import get_session
            from sqlalchemy import text
            session = get_session()
            result = session.execute(text("SELECT count(*) FROM box_hill_players"))
            count = result.scalar()
            session.close()

            return jsonify({
                "status": "success",
                "message": "Box Hill players seeded successfully",
                "count": count
            }), 200
        except Exception as e:
            logger.error(f"Box Hill seeding failed: {str(e)}", exc_info=True)
            return jsonify({
                "status": "error",
                "detail": str(e)
            }), 500

    @app.route('/api/admin/db-fix', methods=['GET'])
    def db_fix():
        """Fix match_status COMP -> Complete and check state."""
        try:
            from db.cloudsql_client import get_session
            from sqlalchemy import text
            session = get_session()

            # Fix match_status
            session.execute(text("UPDATE cd_matches SET match_status = 'Complete' WHERE match_status = 'COMP'"))
            session.commit()

            # Count state
            result = {}
            for table in ['cd_matches', 'cd_lineups', 'cd_rotations', 'cd_gps']:
                r = session.execute(text(f"SELECT count(*) FROM {table}"))
                result[table] = r.scalar()

            # Check lineups per match for new data
            rows = session.execute(text("""
                SELECT m.match_id, m.round_name, m.season_id, m.home_squad_code, m.away_squad_code,
                       (SELECT count(*) FROM cd_lineups l WHERE l.match_id = m.match_id) as lineup_count,
                       (SELECT count(*) FROM cd_rotations r WHERE r.match_id = m.match_id) as rotation_count
                FROM cd_matches m
                WHERE m.home_squad_id = '80' OR m.away_squad_id = '80'
                ORDER BY m.match_date DESC LIMIT 10
            """)).fetchall()
            result['hawk_matches'] = [dict(zip(['match_id','round','season','home','away','lineups','rotations'], r)) for r in rows]

            session.close()
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/api/admin/users/debug', methods=['GET'])
    def debug_users():
        try:
            from models.user_roles import UserRole
            from db.cloudsql_client import get_session
            session = get_session()
            users = session.query(UserRole).all()
            user_list = [{"email": u.google_email, "role": u.role, "name": u.name} for u in users]
            session.close()
            return jsonify(user_list), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

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
