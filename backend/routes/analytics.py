"""
Analytics routes for combined GPS + match stats from cd_player_match_stats.
"""

import logging
from flask import Blueprint, jsonify
from sqlalchemy import text
from db.cloudsql_client import get_session

logger = logging.getLogger(__name__)
analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/matches", methods=["GET"])
def list_matches():
    """Return distinct matches with player counts."""
    session = get_session()
    try:
        rows = session.execute(text("""
            SELECT
                match_id,
                MAX(match_name) AS match_name,
                MAX(match_date) AS match_date,
                MAX(round_name) AS round_name,
                MAX(round_number) AS round_number,
                MAX(venue_name) AS venue_name,
                COUNT(DISTINCT player) AS player_count
            FROM cd_player_match_stats
            GROUP BY match_id
            ORDER BY MAX(match_date) DESC
        """)).fetchall()

        result = [
            {
                "match_id": r[0],
                "match_name": r[1],
                "match_date": r[2],
                "round_name": r[3],
                "round_number": r[4],
                "venue_name": r[5],
                "player_count": r[6],
            }
            for r in rows
        ]
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error fetching matches: {e}")
        return jsonify({"error": "Failed to fetch matches"}), 500
    finally:
        session.close()


@analytics_bp.route("/match/<match_id>/summary", methods=["GET"])
def match_summary(match_id):
    """Per-player summary for a match: aggregated GPS + match stats + quarter breakdown."""
    session = get_session()
    try:
        # Aggregated per-player GPS across all quarters
        agg_rows = session.execute(text("""
            SELECT
                player,
                jersey,
                MAX(position) AS position,
                SUM(gps_distance_m) AS total_distance_m,
                SUM(gps_hs_dist_m) AS total_hs_dist_m,
                SUM(gps_sprints) AS total_sprints,
                SUM(gps_player_load) AS total_player_load,
                MAX(gps_max_vel) AS max_vel,
                AVG(gps_m_per_min) AS avg_m_per_min,
                SUM(gps_hmld) AS total_hmld,
                SUM(gps_accels) AS total_accels,
                SUM(gps_decels) AS total_decels,
                AVG(gps_hr_avg) AS avg_hr_avg,
                MAX(gps_hr_max) AS max_hr_max,
                SUM(gps_field_min) AS total_field_min,
                MAX(disposals) AS disposals,
                MAX(kicks) AS kicks,
                MAX(handballs) AS handballs,
                MAX(marks) AS marks,
                MAX(tackles) AS tackles,
                MAX(clearances) AS clearances,
                MAX(free_kicks) AS free_kicks,
                MAX(pressure_acts) AS pressure_acts,
                MAX(inside_50s) AS inside_50s,
                MAX(rebound_50s) AS rebound_50s,
                MAX(metres_gained) AS metres_gained,
                MAX(turnovers) AS turnovers,
                MAX(goals) AS goals,
                MAX(behinds) AS behinds,
                MAX(time_on_ground) AS time_on_ground
            FROM cd_player_match_stats
            WHERE match_id = :match_id
            GROUP BY player, jersey
            ORDER BY player
        """), {"match_id": match_id}).fetchall()

        # Per-player per-quarter GPS breakdown
        quarter_rows = session.execute(text("""
            SELECT
                player,
                period_name,
                gps_distance_m,
                gps_hs_dist_m,
                gps_sprints,
                gps_player_load,
                gps_max_vel,
                gps_m_per_min,
                gps_hr_avg,
                gps_hr_max,
                gps_accels,
                gps_decels,
                gps_hmld,
                gps_field_min
            FROM cd_player_match_stats
            WHERE match_id = :match_id
            ORDER BY player, period_name
        """), {"match_id": match_id}).fetchall()

        # Group quarters by player
        quarters_by_player = {}
        for r in quarter_rows:
            player = r[0]
            if player not in quarters_by_player:
                quarters_by_player[player] = []
            quarters_by_player[player].append({
                "period_name": r[1],
                "gps_distance_m": _num(r[2]),
                "gps_hs_dist_m": _num(r[3]),
                "gps_sprints": _num(r[4]),
                "gps_player_load": _num(r[5]),
                "gps_max_vel": _num(r[6]),
                "gps_m_per_min": _num(r[7]),
                "gps_hr_avg": _num(r[8]),
                "gps_hr_max": _num(r[9]),
                "gps_accels": _num(r[10]),
                "gps_decels": _num(r[11]),
                "gps_hmld": _num(r[12]),
                "gps_field_min": _num(r[13]),
            })

        result = []
        for r in agg_rows:
            player = r[0]
            result.append({
                "player": player,
                "jersey": r[1],
                "position": r[2],
                "gps": {
                    "total_distance_m": _num(r[3]),
                    "total_hs_dist_m": _num(r[4]),
                    "total_sprints": _num(r[5]),
                    "total_player_load": _num(r[6]),
                    "max_vel": _num(r[7]),
                    "avg_m_per_min": _num(r[8]),
                    "total_hmld": _num(r[9]),
                    "total_accels": _num(r[10]),
                    "total_decels": _num(r[11]),
                    "avg_hr_avg": _num(r[12]),
                    "max_hr_max": _num(r[13]),
                    "total_field_min": _num(r[14]),
                },
                "match_stats": {
                    "disposals": _num(r[15]),
                    "kicks": _num(r[16]),
                    "handballs": _num(r[17]),
                    "marks": _num(r[18]),
                    "tackles": _num(r[19]),
                    "clearances": _num(r[20]),
                    "free_kicks": _num(r[21]),
                    "pressure_acts": _num(r[22]),
                    "inside_50s": _num(r[23]),
                    "rebound_50s": _num(r[24]),
                    "metres_gained": _num(r[25]),
                    "turnovers": _num(r[26]),
                    "goals": _num(r[27]),
                    "behinds": _num(r[28]),
                    "time_on_ground": _num(r[29]),
                },
                "quarters": quarters_by_player.get(player, []),
            })

        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error fetching match summary: {e}")
        return jsonify({"error": "Failed to fetch match summary"}), 500
    finally:
        session.close()


@analytics_bp.route("/match/<match_id>/quarters", methods=["GET"])
def match_quarters(match_id):
    """Per-player per-quarter GPS data for heatmap grid."""
    session = get_session()
    try:
        rows = session.execute(text("""
            SELECT
                player,
                jersey,
                position,
                period_name,
                gps_distance_m,
                gps_hs_dist_m,
                gps_sprints,
                gps_player_load,
                gps_max_vel,
                gps_m_per_min,
                gps_hr_avg,
                gps_hr_max,
                gps_accels,
                gps_decels,
                gps_hmld,
                gps_field_min
            FROM cd_player_match_stats
            WHERE match_id = :match_id
            ORDER BY player, period_name
        """), {"match_id": match_id}).fetchall()

        result = [
            {
                "player": r[0],
                "jersey": r[1],
                "position": r[2],
                "period_name": r[3],
                "gps_distance_m": _num(r[4]),
                "gps_hs_dist_m": _num(r[5]),
                "gps_sprints": _num(r[6]),
                "gps_player_load": _num(r[7]),
                "gps_max_vel": _num(r[8]),
                "gps_m_per_min": _num(r[9]),
                "gps_hr_avg": _num(r[10]),
                "gps_hr_max": _num(r[11]),
                "gps_accels": _num(r[12]),
                "gps_decels": _num(r[13]),
                "gps_hmld": _num(r[14]),
                "gps_field_min": _num(r[15]),
            }
            for r in rows
        ]
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error fetching match quarters: {e}")
        return jsonify({"error": "Failed to fetch match quarters"}), 500
    finally:
        session.close()


@analytics_bp.route("/player/<player_name>/rounds", methods=["GET"])
def player_rounds(player_name):
    """Aggregated stats per match for a given player."""
    session = get_session()
    try:
        rows = session.execute(text("""
            SELECT
                match_id,
                MAX(match_name) AS match_name,
                MAX(match_date) AS match_date,
                MAX(round_name) AS round_name,
                MAX(round_number) AS round_number,
                MAX(venue_name) AS venue_name,
                MAX(position) AS position,
                SUM(gps_distance_m) AS total_distance_m,
                SUM(gps_hs_dist_m) AS total_hs_dist_m,
                SUM(gps_sprints) AS total_sprints,
                SUM(gps_player_load) AS total_player_load,
                MAX(gps_max_vel) AS max_vel,
                AVG(gps_m_per_min) AS avg_m_per_min,
                SUM(gps_hmld) AS total_hmld,
                SUM(gps_accels) AS total_accels,
                SUM(gps_decels) AS total_decels,
                AVG(gps_hr_avg) AS avg_hr_avg,
                MAX(gps_hr_max) AS max_hr_max,
                SUM(gps_field_min) AS total_field_min,
                MAX(disposals) AS disposals,
                MAX(kicks) AS kicks,
                MAX(handballs) AS handballs,
                MAX(marks) AS marks,
                MAX(tackles) AS tackles,
                MAX(clearances) AS clearances,
                MAX(free_kicks) AS free_kicks,
                MAX(pressure_acts) AS pressure_acts,
                MAX(inside_50s) AS inside_50s,
                MAX(rebound_50s) AS rebound_50s,
                MAX(metres_gained) AS metres_gained,
                MAX(turnovers) AS turnovers,
                MAX(goals) AS goals,
                MAX(behinds) AS behinds,
                MAX(time_on_ground) AS time_on_ground
            FROM cd_player_match_stats
            WHERE player = :player_name
            GROUP BY match_id
            ORDER BY MAX(match_date) DESC
        """), {"player_name": player_name}).fetchall()

        result = [
            {
                "match_id": r[0],
                "match_name": r[1],
                "match_date": r[2],
                "round_name": r[3],
                "round_number": r[4],
                "venue_name": r[5],
                "position": r[6],
                "gps": {
                    "total_distance_m": _num(r[7]),
                    "total_hs_dist_m": _num(r[8]),
                    "total_sprints": _num(r[9]),
                    "total_player_load": _num(r[10]),
                    "max_vel": _num(r[11]),
                    "avg_m_per_min": _num(r[12]),
                    "total_hmld": _num(r[13]),
                    "total_accels": _num(r[14]),
                    "total_decels": _num(r[15]),
                    "avg_hr_avg": _num(r[16]),
                    "max_hr_max": _num(r[17]),
                    "total_field_min": _num(r[18]),
                },
                "match_stats": {
                    "disposals": _num(r[19]),
                    "kicks": _num(r[20]),
                    "handballs": _num(r[21]),
                    "marks": _num(r[22]),
                    "tackles": _num(r[23]),
                    "clearances": _num(r[24]),
                    "free_kicks": _num(r[25]),
                    "pressure_acts": _num(r[26]),
                    "inside_50s": _num(r[27]),
                    "rebound_50s": _num(r[28]),
                    "metres_gained": _num(r[29]),
                    "turnovers": _num(r[30]),
                    "goals": _num(r[31]),
                    "behinds": _num(r[32]),
                    "time_on_ground": _num(r[33]),
                },
            }
            for r in rows
        ]
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error fetching player rounds: {e}")
        return jsonify({"error": "Failed to fetch player rounds"}), 500
    finally:
        session.close()


@analytics_bp.route("/efficiency", methods=["GET"])
def efficiency_metrics():
    """Derived efficiency metrics across all players and matches."""
    session = get_session()
    try:
        rows = session.execute(text("""
            SELECT
                player,
                match_id,
                MAX(match_name) AS match_name,
                MAX(match_date) AS match_date,
                MAX(round_name) AS round_name,
                MAX(jersey) AS jersey,
                MAX(position) AS position,
                SUM(gps_distance_m) AS total_distance_m,
                SUM(gps_sprints) AS total_sprints,
                MAX(disposals) AS disposals,
                MAX(pressure_acts) AS pressure_acts,
                MAX(metres_gained) AS metres_gained
            FROM cd_player_match_stats
            GROUP BY player, match_id
            ORDER BY player, MAX(match_date) DESC
        """)).fetchall()

        result = []
        for r in rows:
            total_distance = _num(r[7]) or 0
            total_sprints = _num(r[8]) or 0
            disposals = _num(r[9]) or 0
            pressure_acts = _num(r[10]) or 0
            metres_gained = _num(r[11]) or 0
            km_run = total_distance / 1000.0 if total_distance > 0 else None

            result.append({
                "player": r[0],
                "match_id": r[1],
                "match_name": r[2],
                "match_date": r[3],
                "round_name": r[4],
                "jersey": r[5],
                "position": r[6],
                "total_distance_m": total_distance,
                "disposals": disposals,
                "pressure_acts": pressure_acts,
                "total_sprints": total_sprints,
                "metres_gained": metres_gained,
                "disposals_per_km": round(disposals / km_run, 2) if km_run else None,
                "pressure_acts_per_sprint": round(pressure_acts / total_sprints, 2) if total_sprints > 0 else None,
                "metres_gained_per_km_run": round(metres_gained / km_run, 2) if km_run else None,
            })

        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error fetching efficiency metrics: {e}")
        return jsonify({"error": "Failed to fetch efficiency metrics"}), 500
    finally:
        session.close()


@analytics_bp.route("/season-averages", methods=["GET"])
def season_averages():
    """Per-player season averages across all matches — for comparison in all reports."""
    session = get_session()
    try:
        rows = session.execute(text("""
            SELECT
                player,
                MAX(jersey) AS jersey,
                MAX(position) AS position,
                COUNT(DISTINCT match_id) AS matches_played,
                AVG(match_distance_m) AS avg_distance_m,
                AVG(match_hs_dist_m) AS avg_hs_dist_m,
                AVG(match_sprints) AS avg_sprints,
                AVG(match_player_load) AS avg_player_load,
                AVG(match_m_per_min) AS avg_m_per_min,
                AVG(match_hmld) AS avg_hmld,
                AVG(match_accels) AS avg_accels,
                AVG(match_field_min) AS avg_field_min,
                AVG(match_disposals) AS avg_disposals,
                AVG(match_kicks) AS avg_kicks,
                AVG(match_handballs) AS avg_handballs,
                AVG(match_tackles) AS avg_tackles,
                AVG(match_pressure_acts) AS avg_pressure_acts,
                AVG(match_goals) AS avg_goals,
                AVG(match_metres_gained) AS avg_metres_gained
            FROM (
                SELECT player, match_id,
                    MAX(jersey) AS jersey, MAX(position) AS position,
                    SUM(gps_distance_m) AS match_distance_m,
                    SUM(gps_hs_dist_m) AS match_hs_dist_m,
                    SUM(gps_sprints) AS match_sprints,
                    SUM(gps_player_load) AS match_player_load,
                    AVG(gps_m_per_min) AS match_m_per_min,
                    SUM(gps_hmld) AS match_hmld,
                    SUM(gps_accels) AS match_accels,
                    SUM(gps_field_min) AS match_field_min,
                    MAX(disposals) AS match_disposals,
                    MAX(kicks) AS match_kicks,
                    MAX(handballs) AS match_handballs,
                    MAX(tackles) AS match_tackles,
                    MAX(pressure_acts) AS match_pressure_acts,
                    MAX(goals) AS match_goals,
                    MAX(metres_gained) AS match_metres_gained
                FROM cd_player_match_stats
                GROUP BY player, match_id
            ) per_match
            GROUP BY player
            ORDER BY player
        """)).fetchall()

        result = [
            {
                "player": r[0], "jersey": r[1], "position": r[2],
                "matches_played": r[3],
                "avg_distance_km": round(_num(r[4]) / 1000, 1) if r[4] else None,
                "avg_hs_dist_m": _num(r[5]),
                "avg_sprints": _num(r[6]),
                "avg_player_load": _num(r[7]),
                "avg_m_per_min": _num(r[8]),
                "avg_hmld": _num(r[9]),
                "avg_accels": _num(r[10]),
                "avg_field_min": _num(r[11]),
                "avg_disposals": _num(r[12]),
                "avg_kicks": _num(r[13]),
                "avg_handballs": _num(r[14]),
                "avg_tackles": _num(r[15]),
                "avg_pressure_acts": _num(r[16]),
                "avg_goals": _num(r[17]),
                "avg_metres_gained": _num(r[18]),
            }
            for r in rows
        ]
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error fetching season averages: {e}")
        return jsonify({"error": "Failed to fetch season averages"}), 500
    finally:
        session.close()


def _num(val):
    """Convert Decimal/None to float for JSON serialization."""
    if val is None:
        return None
    return float(val)
