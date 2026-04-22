"""
Team Builder — Version-based routes.

Versions live in saved_squads. Each round has multiple versions,
one of which is the active draft. Drag-and-drop auto-saves to
the active version's data column.
"""

import logging
from flask import Blueprint, jsonify, request
from models.team import (
    get_versions_for_round,
    get_version,
    create_version,
    set_active_version,
    update_version_data,
    rename_version,
    duplicate_version,
    copy_version_to_round,
    delete_version,
)

logger = logging.getLogger(__name__)
team_bp = Blueprint("team", __name__)


@team_bp.route("/versions", methods=["GET"])
def list_versions():
    """GET /api/team/versions?round_id=6"""
    round_id = request.args.get("round_id", type=int)
    if round_id is None:
        return jsonify({"error": "round_id query parameter is required"}), 400
    try:
        versions = get_versions_for_round(round_id)
        return jsonify(versions), 200
    except Exception as e:
        logger.error(f"Error listing versions: {e}")
        return jsonify({"error": "Failed to list versions"}), 500


@team_bp.route("/versions", methods=["POST"])
def create_new_version():
    """POST /api/team/versions — create a new version for a round."""
    data = request.json
    round_id = data.get("round_id")
    if round_id is None:
        return jsonify({"error": "round_id is required"}), 400
    name = data.get("name", "New Version")
    initial_data = data.get("data", "[]")

    try:
        version = create_version(round_id, name, initial_data)
        return jsonify(version), 201
    except Exception as e:
        logger.error(f"Error creating version: {e}")
        return jsonify({"error": "Failed to create version"}), 500


@team_bp.route("/versions/<int:version_id>", methods=["GET"])
def get_single_version(version_id):
    """GET /api/team/versions/:id"""
    try:
        version = get_version(version_id)
        if not version:
            return jsonify({"error": "Version not found"}), 404
        return jsonify(version), 200
    except Exception as e:
        logger.error(f"Error getting version: {e}")
        return jsonify({"error": "Failed to get version"}), 500


@team_bp.route("/versions/<int:version_id>/activate", methods=["POST"])
def activate_version(version_id):
    """POST /api/team/versions/:id/activate — set as active draft."""
    try:
        version = set_active_version(version_id)
        if not version:
            return jsonify({"error": "Version not found"}), 404
        return jsonify(version), 200
    except Exception as e:
        logger.error(f"Error activating version: {e}")
        return jsonify({"error": "Failed to activate version"}), 500


@team_bp.route("/versions/<int:version_id>/data", methods=["PUT"])
def save_version_data(version_id):
    """PUT /api/team/versions/:id/data — auto-save field state."""
    data = request.json
    field_data = data.get("data", "[]")

    try:
        success = update_version_data(version_id, field_data)
        if not success:
            return jsonify({"error": "Version not found"}), 404
        return jsonify({"status": "saved"}), 200
    except Exception as e:
        logger.error(f"Error saving version data: {e}")
        return jsonify({"error": "Failed to save"}), 500


@team_bp.route("/versions/<int:version_id>/rename", methods=["PUT"])
def rename_version_route(version_id):
    """PUT /api/team/versions/:id/rename"""
    data = request.json
    name = data.get("name", "")
    if not name.strip():
        return jsonify({"error": "Name is required"}), 400

    try:
        version = rename_version(version_id, name.strip())
        if not version:
            return jsonify({"error": "Version not found"}), 404
        return jsonify(version), 200
    except Exception as e:
        logger.error(f"Error renaming version: {e}")
        return jsonify({"error": "Failed to rename"}), 500


@team_bp.route("/versions/<int:version_id>/duplicate", methods=["POST"])
def duplicate_version_route(version_id):
    """POST /api/team/versions/:id/duplicate"""
    data = request.json or {}
    new_name = data.get("name")

    try:
        version = duplicate_version(version_id, new_name)
        if not version:
            return jsonify({"error": "Version not found"}), 404
        return jsonify(version), 201
    except Exception as e:
        logger.error(f"Error duplicating version: {e}")
        return jsonify({"error": "Failed to duplicate"}), 500


@team_bp.route("/versions/<int:version_id>/copy-to-round", methods=["POST"])
def copy_to_round_route(version_id):
    """POST /api/team/versions/:id/copy-to-round"""
    data = request.json
    target_round_id = data.get("target_round_id")
    new_name = data.get("name")

    if target_round_id is None:
        return jsonify({"error": "target_round_id is required"}), 400

    try:
        version = copy_version_to_round(version_id, target_round_id, new_name)
        if not version:
            return jsonify({"error": "Version not found"}), 404
        return jsonify(version), 201
    except Exception as e:
        logger.error(f"Error copying version: {e}")
        return jsonify({"error": "Failed to copy"}), 500


@team_bp.route("/versions/<int:version_id>", methods=["DELETE"])
def delete_version_route(version_id):
    """DELETE /api/team/versions/:id"""
    try:
        success = delete_version(version_id)
        if not success:
            return jsonify({"error": "Version not found"}), 404
        return jsonify({"status": "deleted"}), 200
    except Exception as e:
        logger.error(f"Error deleting version: {e}")
        return jsonify({"error": "Failed to delete"}), 500


@team_bp.route("/opponent-players", methods=["GET"])
def get_opponent_players():
    """GET /api/team/opponent-players?team=Essendon"""
    team = request.args.get("team")
    if not team:
        return jsonify({"error": "team query parameter is required"}), 400
    try:
        from db.cloudsql_client import get_session
        from sqlalchemy import text
        session = get_session()
        try:
            result = session.execute(
                text("SELECT name, jumper_no, position, photo_url FROM afl_players WHERE team = :team ORDER BY jumper_no"),
                {"team": team}
            )
            players = [{"name": r[0], "jumper_no": r[1], "position": r[2], "photo_url": r[3]} for r in result]
            return jsonify(players), 200
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Error fetching opponent players: {e}")
        return jsonify({"error": "Failed to fetch opponent players"}), 500


# Squad code mapping
SQUAD_CODES = {
    "Essendon": "ESS", "Sydney": "SYD", "Geelong": "GEEL", "Western Bulldogs": "WB",
    "Port Adelaide": "PA", "Gold Coast": "GCS", "Collingwood": "COLL", "Fremantle": "FREM",
    "Melbourne": "MELB", "Adelaide": "ADEL", "St Kilda": "STK", "North Melbourne": "NM",
    "Carlton": "CARL", "Richmond": "RICH", "Brisbane": "BL", "West Coast": "WCE",
    "GWS Giants": "GWS",
}
SQUAD_IDS = {
    "ESS": "50", "SYD": "160", "GEEL": "70", "WB": "140", "PA": "110", "GCS": "1000",
    "COLL": "40", "FREM": "60", "MELB": "90", "ADEL": "10", "STK": "130", "NM": "100",
    "CARL": "30", "RICH": "120", "BL": "20", "WCE": "150", "GWS": "1010", "HAW": "80",
}


@team_bp.route("/opponent-history", methods=["GET"])
def get_opponent_history():
    """
    GET /api/team/opponent-history?team=Western Bulldogs&limit=3
    Returns the last N head-to-head matches between Hawthorn and the opponent,
    with BOTH teams' lineups.
    """
    team = request.args.get("team")
    limit = request.args.get("limit", 3, type=int)
    if not team:
        return jsonify({"error": "team parameter is required"}), 400

    squad_code = SQUAD_CODES.get(team)
    if not squad_code:
        return jsonify({"error": f"Unknown team: {team}"}), 400

    opp_squad_id = SQUAD_IDS.get(squad_code)
    hawk_squad_id = SQUAD_IDS["HAW"]

    try:
        from db.cloudsql_client import get_session
        from sqlalchemy import text
        session = get_session()
        try:
            # Find last N completed matches between Hawthorn and this opponent
            matches = session.execute(text("""
                SELECT match_id, season_id, round_name, home_squad_code, away_squad_code,
                       home_score, away_score, match_date, venue_code,
                       home_squad_id, away_squad_id
                FROM cd_matches
                WHERE ((home_squad_id = :hawk AND away_squad_id = :opp)
                    OR (home_squad_id = :opp AND away_squad_id = :hawk))
                  AND match_status IN ('Complete', 'COMP')
                ORDER BY match_date DESC
                LIMIT :lim
            """), {"hawk": hawk_squad_id, "opp": opp_squad_id, "lim": limit}).fetchall()

            result = []
            for m in matches:
                match_id = m[0]

                # Get Hawthorn lineup
                hawk_lineups = session.execute(text("""
                    SELECT player_id, jumper_no, position_code, played
                    FROM cd_lineups
                    WHERE match_id = :mid AND squad_id = :sid
                """), {"mid": match_id, "sid": hawk_squad_id}).fetchall()

                # Get opponent lineup
                opp_lineups = session.execute(text("""
                    SELECT player_id, jumper_no, position_code, played
                    FROM cd_lineups
                    WHERE match_id = :mid AND squad_id = :sid
                """), {"mid": match_id, "sid": opp_squad_id}).fetchall()

                hawk_is_home = str(m[9]) == hawk_squad_id

                # Get rotation data for time-on-ground calculation
                rotations = session.execute(text("""
                    SELECT squad_id, period, period_secs, off_player_id, on_player_id, off_reason
                    FROM cd_rotations
                    WHERE match_id = :mid
                    ORDER BY period, period_secs
                """), {"mid": match_id}).fetchall()

                # Calculate time on ground per player per team
                # Returns total time + per-quarter on/off intervals
                QUARTER_LENGTH = 1200  # 20 min quarters in seconds
                def calc_time_on_ground(squad_id, lineup_list):
                    player_ids = {str(l[0]) for l in lineup_list if l[3]}
                    time_on = {pid: 0 for pid in player_ids}
                    rot_count = {pid: 0 for pid in player_ids}
                    injured = set()
                    # intervals: pid -> {1: [{on: 0, off: 521}, ...], 2: [...], ...}
                    intervals = {pid: {1: [], 2: [], 3: [], 4: []} for pid in player_ids}

                    team_rots = [r for r in rotations if str(r[0]) == squad_id]

                    # Determine who starts OFF-field in Q1
                    started_off = set()
                    for r in team_rots:
                        if r[1] == 1 and r[2] == 0:
                            off_pid = str(r[3]) if r[3] else None
                            on_pid = str(r[4]) if r[4] else None
                            if off_pid and off_pid in player_ids and not on_pid:
                                started_off.add(off_pid)

                    on_field = {}
                    for quarter in range(1, 5):
                        q_rots = [r for r in team_rots if r[1] == quarter]

                        if quarter == 1:
                            on_field = {pid: (pid not in started_off) for pid in player_ids}
                        # else: carries over

                        # Track when each player came on in this quarter
                        on_since = {}
                        for pid in player_ids:
                            if on_field.get(pid):
                                on_since[pid] = 0  # on from start of quarter

                        for r in q_rots:
                            secs = r[2]
                            off_pid = str(r[3]) if r[3] else None
                            on_pid = str(r[4]) if r[4] else None
                            reason = r[5] or ''

                            if secs == 0 and quarter == 1 and not on_pid:
                                continue

                            if off_pid and off_pid in player_ids and on_field.get(off_pid):
                                # Player going off — record the interval
                                start = on_since.get(off_pid, 0)
                                intervals[off_pid][quarter].append({"on": start, "off": secs})
                                time_on[off_pid] += secs - start
                                on_field[off_pid] = False
                                if off_pid in on_since:
                                    del on_since[off_pid]
                                rot_count[off_pid] += 1
                                if 'Injur' in reason:
                                    injured.add(off_pid)

                            if on_pid and on_pid in player_ids and not on_field.get(on_pid):
                                on_field[on_pid] = True
                                on_since[on_pid] = secs
                                rot_count[on_pid] += 1

                        # End of quarter: close open intervals
                        for pid in player_ids:
                            if on_field.get(pid) and pid in on_since:
                                start = on_since[pid]
                                intervals[pid][quarter].append({"on": start, "off": QUARTER_LENGTH})
                                time_on[pid] += QUARTER_LENGTH - start

                    total_match = QUARTER_LENGTH * 4
                    result_map = {}
                    for pid in player_ids:
                        result_map[pid] = {
                            "time_on_secs": min(time_on.get(pid, 0), total_match),
                            "time_on_pct": min(100, round(time_on.get(pid, 0) / total_match * 100)) if total_match else 0,
                            "rotations": rot_count.get(pid, 0),
                            "injured": pid in injured,
                            "intervals": intervals.get(pid, {}),
                            "started_on_field": pid not in started_off,
                        }
                    return result_map

                hawk_tog = calc_time_on_ground(hawk_squad_id, hawk_lineups)
                opp_tog = calc_time_on_ground(opp_squad_id, opp_lineups)

                # Build name lookup: champion_data_id -> name
                name_map = {}
                all_names = session.execute(text(
                    "SELECT champion_data_id, name FROM afl_players WHERE champion_data_id IS NOT NULL"
                )).fetchall()
                for row in all_names:
                    name_map[str(row[0])] = row[1]

                # Also check cd_lineups for names not in afl_players
                lineup_names = session.execute(text(
                    "SELECT player_id, player_name FROM cd_lineups WHERE match_id = :mid AND player_name IS NOT NULL AND player_name != ''"
                ), {"mid": match_id}).fetchall()
                for row in lineup_names:
                    pid = str(row[0])
                    if pid not in name_map and row[1]:
                        name_map[pid] = row[1]

                # Fetch GPS data for this match — try match_id first, then by player name
                gps_by_name = {}
                # Match-level GPS (has match_id directly)
                gps_rows = session.execute(text("""
                    SELECT player_name, distance_m, hs_dist_m, sprints, player_load,
                           max_vel, m_per_min, hr_avg, hr_max, accels, decels, hmld, field_min
                    FROM cd_gps
                    WHERE match_id = :mid AND period_id = 'match'
                """), {"mid": match_id}).fetchall()
                for g in gps_rows:
                    gps_by_name[g[0]] = {
                        "distance_m": float(g[1]) if g[1] else None,
                        "hs_dist_m": float(g[2]) if g[2] else None,
                        "sprints": int(g[3]) if g[3] else None,
                        "player_load": float(g[4]) if g[4] else None,
                        "max_vel": float(g[5]) if g[5] else None,
                        "m_per_min": float(g[6]) if g[6] else None,
                        "hr_avg": float(g[7]) if g[7] else None,
                        "hr_max": float(g[8]) if g[8] else None,
                        "accels": int(g[9]) if g[9] else None,
                        "decels": int(g[10]) if g[10] else None,
                        "hmld": float(g[11]) if g[11] else None,
                        "field_min": float(g[12]) if g[12] else None,
                    }

                # Quarter-level GPS — aggregate per player if no match-level data
                if not gps_by_name:
                    gps_quarter_rows = session.execute(text("""
                        SELECT player_name,
                               SUM(distance_m) as total_dist,
                               SUM(hs_dist_m) as total_hs,
                               SUM(sprints) as total_sprints,
                               SUM(player_load) as total_load,
                               MAX(max_vel) as max_vel,
                               AVG(m_per_min) as avg_mpm,
                               SUM(accels) as total_accels,
                               SUM(decels) as total_decels,
                               SUM(hmld) as total_hmld,
                               SUM(field_min) as total_field_min,
                               COUNT(*) as quarters
                        FROM cd_gps
                        WHERE match_id = :mid AND period_id != 'match'
                        GROUP BY player_name
                    """), {"mid": match_id}).fetchall()
                    for g in gps_quarter_rows:
                        gps_by_name[g[0]] = {
                            "distance_m": float(g[1]) if g[1] else None,
                            "hs_dist_m": float(g[2]) if g[2] else None,
                            "sprints": int(g[3]) if g[3] else None,
                            "player_load": float(g[4]) if g[4] else None,
                            "max_vel": float(g[5]) if g[5] else None,
                            "m_per_min": float(g[6]) if g[6] else None,
                            "accels": int(g[7]) if g[7] else None,
                            "decels": int(g[8]) if g[8] else None,
                            "hmld": float(g[9]) if g[9] else None,
                            "field_min": float(g[10]) if g[10] else None,
                            "quarters": int(g[11]),
                        }

                def enrich_lineup(lineups, tog_map):
                    result = []
                    for l in lineups:
                        pid = str(l[0])
                        tog = tog_map.get(pid, {})
                        name = name_map.get(pid, "")
                        last_name = name.split(' ')[-1] if name else ""
                        gps = gps_by_name.get(name, None)
                        entry = {
                            "player_id": pid,
                            "jumper_no": l[1],
                            "position": l[2],
                            "played": l[3],
                            "name": last_name,
                            "full_name": name,
                            "time_on_secs": tog.get("time_on_secs", 0),
                            "time_on_pct": tog.get("time_on_pct", 0),
                            "rotations": tog.get("rotations", 0),
                            "injured": tog.get("injured", False),
                            "intervals": tog.get("intervals", {}),
                            "started_on_field": tog.get("started_on_field", True),
                        }
                        if gps:
                            entry["gps"] = gps
                        result.append(entry)
                    return result

                result.append({
                    "match_id": match_id,
                    "season": m[1],
                    "round": m[2],
                    "home_team": m[3],
                    "away_team": m[4],
                    "home_score": m[5],
                    "away_score": m[6],
                    "hawk_score": m[5] if hawk_is_home else m[6],
                    "opp_score": m[6] if hawk_is_home else m[5],
                    "hawk_is_home": hawk_is_home,
                    "date": str(m[7]) if m[7] else None,
                    "venue": m[8],
                    "hawk_lineup": enrich_lineup(hawk_lineups, hawk_tog),
                    "opp_lineup": enrich_lineup(opp_lineups, opp_tog),
                })

            return jsonify(result), 200
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Error fetching opponent history: {e}")
        return jsonify({"error": "Failed to fetch opponent history"}), 500
