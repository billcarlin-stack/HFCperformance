"""
Analytics routes — reads from analysis.player_period_analysis_catapult_and_champion.

Table shape (one row per match × player × period, plus lineup rows with period=NULL):
- Hawks rows: squad_id = 80. Other teams present for the same match_id.
- period 1-4 rows carry GPS (Hawks only) + per-period Champion Data stats.
- period=NULL rows are lineup/bench entries with no GPS and no stats — skipped when
  summing match totals.
- No duplicate rows (unlike the previous catapult_champion_match_analysis table).
"""

import logging
from flask import Blueprint, jsonify, request
from sqlalchemy import text
from db.cloudsql_client import get_session

logger = logging.getLogger(__name__)
analytics_bp = Blueprint("analytics", __name__)

HAWKS_SQUAD_ID = 80

# Column aliasing in SQL — keeps the API response shape backward-compatible.
PLAYER_NAME_SQL = "person_fullname"


@analytics_bp.route("/matches", methods=["GET"])
def list_matches():
    """List Hawks matches with player counts, season and competition metadata."""
    session = get_session()
    try:
        rows = session.execute(text(f"""
            SELECT
                match_id,
                MAX(match_name) AS match_name,
                MAX(match_date) AS match_date,
                MAX(round_name) AS round_name,
                MAX(round_number) AS round_number,
                MAX(venue_name) AS venue_name,
                COUNT(DISTINCT CASE
                    WHEN period IS NOT NULL AND gps_distance_m IS NOT NULL
                    THEN person_id END) AS player_count,
                EXTRACT(YEAR FROM MAX(match_date))::int AS season,
                NULL::integer AS league_id,
                NULL::text AS match_type
            FROM analysis.player_period_analysis_catapult_and_champion
            WHERE squad_id = {HAWKS_SQUAD_ID}
            GROUP BY match_id
            ORDER BY MAX(match_date) DESC
        """)).fetchall()

        result = [
            {
                "match_id": r[0],
                "match_name": r[1],
                "match_date": r[2].isoformat() if r[2] else None,
                "round_name": r[3],
                "round_number": r[4],
                "venue_name": r[5],
                "player_count": r[6],
                "season": r[7],
                "league_id": r[8],
                "match_type": r[9],
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
    """Per-player summary for a match: aggregated GPS + match stats + per-period breakdown.

    Query params:
      include_opposition=1: also return the opposing team's players (stats only, no GPS).
        Each entry gets squad_id, squad_name, is_hawks flag.
    """
    session = get_session()
    try:
        include_opposition = request.args.get("include_opposition", "").lower() in ("1", "true", "yes")
        # Hawks rows are always Hawks-only on the analysis table; opposition has no per-period
        # rows there (ETL only populates per-period for Hawks), so we fetch opposition
        # separately from snowflake_champion_data.match_player_stats below.
        squad_filter = f"AND squad_id = {HAWKS_SQUAD_ID}"

        agg_rows = session.execute(text(f"""
            SELECT
                person_id,
                MAX(squad_id) AS squad_id,
                MAX(squad_code) AS squad_name,
                MAX({PLAYER_NAME_SQL}) AS player,
                MAX(jumpernumber) AS jersey,
                MAX(COALESCE(selected_position_code, position)) AS position,
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
                SUM(disposals) AS disposals, SUM(kicks) AS kicks, SUM(handballs) AS handballs,
                SUM(marks) AS marks, SUM(tackles) AS tackles, SUM(clearances) AS clearances,
                SUM(free_kicks) AS free_kicks, SUM(pressure_acts) AS pressure_acts,
                SUM(inside_50s) AS inside_50s, SUM(rebound_50s) AS rebound_50s,
                SUM(metres_gained) AS metres_gained, SUM(turnovers) AS turnovers,
                SUM(goals) AS goals, SUM(behinds) AS behinds,
                SUM(time_on_ground) AS time_on_ground
            FROM analysis.player_period_analysis_catapult_and_champion
            WHERE match_id = :match_id
              {squad_filter}
              AND period IS NOT NULL
            GROUP BY person_id
            HAVING MAX({PLAYER_NAME_SQL}) IS NOT NULL
            ORDER BY MAX(squad_id) = {HAWKS_SQUAD_ID} DESC, MAX({PLAYER_NAME_SQL})
        """), {"match_id": match_id}).fetchall()

        quarter_rows = session.execute(text(f"""
            SELECT person_id, period,
                gps_distance_m, gps_hs_dist_m, gps_sprints, gps_player_load,
                gps_max_vel, gps_m_per_min, gps_hr_avg, gps_hr_max,
                gps_accels, gps_decels, gps_hmld, gps_field_min,
                disposals, kicks, handballs, marks, tackles, clearances,
                free_kicks, pressure_acts, inside_50s, rebound_50s,
                metres_gained, turnovers, goals, behinds
            FROM analysis.player_period_analysis_catapult_and_champion
            WHERE match_id = :match_id
              {squad_filter}
              AND period IS NOT NULL
            ORDER BY person_id, period
        """), {"match_id": match_id}).fetchall()

        quarters_by_person: dict = {}
        for r in quarter_rows:
            person_id = r[0]
            quarters_by_person.setdefault(person_id, []).append({
                "period_name": f"Quarter {r[1]}",
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
                "stat_disposals": _num(r[14]),
                "stat_kicks": _num(r[15]),
                "stat_handballs": _num(r[16]),
                "stat_marks": _num(r[17]),
                "stat_tackles": _num(r[18]),
                "stat_clearances": _num(r[19]),
                "stat_free_kicks": _num(r[20]),
                "stat_pressure_acts": _num(r[21]),
                "stat_inside_50s": _num(r[22]),
                "stat_rebound_50s": _num(r[23]),
                "stat_metres_gained": _num(r[24]),
                "stat_turnovers": _num(r[25]),
                "stat_goals": _num(r[26]),
                "stat_behinds": _num(r[27]),
            })

        result = []
        for r in agg_rows:
            person_id = r[0]
            squad_id = r[1]
            result.append({
                "squad_id": squad_id,
                "squad_name": r[2],
                "is_hawks": squad_id == HAWKS_SQUAD_ID,
                "player": r[3],
                "jersey": r[4],
                "position": r[5],
                "gps": {
                    "total_distance_m": _num(r[6]),
                    "total_hs_dist_m": _num(r[7]),
                    "total_sprints": _num(r[8]),
                    "total_player_load": _num(r[9]),
                    "max_vel": _num(r[10]),
                    "avg_m_per_min": _num(r[11]),
                    "total_hmld": _num(r[12]),
                    "total_accels": _num(r[13]),
                    "total_decels": _num(r[14]),
                    "avg_hr_avg": _num(r[15]),
                    "max_hr_max": _num(r[16]),
                    "total_field_min": _num(r[17]),
                },
                "match_stats": {
                    "disposals": _num(r[18]),
                    "kicks": _num(r[19]),
                    "handballs": _num(r[20]),
                    "marks": _num(r[21]),
                    "tackles": _num(r[22]),
                    "clearances": _num(r[23]),
                    "free_kicks": _num(r[24]),
                    "pressure_acts": _num(r[25]),
                    "inside_50s": _num(r[26]),
                    "rebound_50s": _num(r[27]),
                    "metres_gained": _num(r[28]),
                    "turnovers": _num(r[29]),
                    "goals": _num(r[30]),
                    "behinds": _num(r[31]),
                    "time_on_ground": _num(r[32]),
                },
                "quarters": quarters_by_person.get(person_id, []),
            })

        if include_opposition:
            result.extend(_opposition_summary_from_match_player_stats(session, match_id))

        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error fetching match summary: {e}")
        return jsonify({"error": "Failed to fetch match summary"}), 500
    finally:
        session.close()


_METRIC_MAP = {
    "DISPOSAL": "disposals", "KICK": "kicks", "HANDBALL": "handballs",
    "MARK": "marks", "TACKLE": "tackles", "PRESSURE_ACT": "pressure_acts",
    "GOAL": "goals", "BEHIND": "behinds", "INSIDE_50": "inside_50s",
    "REBOUND_50": "rebound_50s", "METRES_GAINED": "metres_gained",
    "TURNOVER": "turnovers",
}
_STAT_KEYS = list(_METRIC_MAP.values())


def _opposition_summary_from_match_player_stats(session, match_id: str) -> list:
    """Build per-player opposition summaries directly from match_player_stats.

    The new analysis table only populates per-period rows for Hawks (squad_id=80);
    opposing squads have lineup rows only. This fallback pulls per-period stats
    straight from snowflake_champion_data.match_player_stats + matches + players
    so the Opposition Player Review still has per-quarter disposals/tackles/etc."""
    # Find the opposing squad for this match (any squad_id != 80 on the match).
    opp_row = session.execute(text(f"""
        SELECT DISTINCT squad_id, squad_code
        FROM analysis.player_period_analysis_catapult_and_champion
        WHERE match_id = :match_id AND squad_id != {HAWKS_SQUAD_ID} AND squad_id IS NOT NULL
        LIMIT 1
    """), {"match_id": match_id}).fetchone()
    if not opp_row:
        return []
    opp_squad_id, opp_squad_name = int(opp_row[0]), opp_row[1]

    # Pull per-player per-period per-metric totals from match_player_stats.
    rows = session.execute(text("""
        SELECT s.player_id, p.player_fullname, p.player_displayname,
               s.period, s.metric, SUM(s.total) AS v
        FROM snowflake_champion_data.match_player_stats s
        JOIN snowflake_champion_data.players p ON p.player_id = s.player_id
        WHERE s.match_id = :match_id
          AND s.squad_id = :opp_squad_id
          AND s.metric IN ('DISPOSAL','KICK','HANDBALL','MARK','TACKLE',
                           'PRESSURE_ACT','GOAL','BEHIND','INSIDE_50',
                           'REBOUND_50','METRES_GAINED','TURNOVER')
        GROUP BY s.player_id, p.player_fullname, p.player_displayname, s.period, s.metric
    """), {"match_id": int(match_id), "opp_squad_id": opp_squad_id}).fetchall()

    # person_id → {"name":..., "quarters": {1: {disposals:..,}}, "totals": {disposals:..}}
    by_person: dict = {}
    for pid, fullname, shortname, period, metric, v in rows:
        stat_key = _METRIC_MAP.get(metric)
        if not stat_key:
            continue
        val = _num(v)
        if val is None:
            continue
        entry = by_person.setdefault(pid, {"name": fullname, "short": shortname,
                                           "quarters": {}, "totals": {k: 0.0 for k in _STAT_KEYS}})
        entry["totals"][stat_key] = entry["totals"].get(stat_key, 0.0) + val
        if period is None:
            continue
        q = entry["quarters"].setdefault(int(period), {"period_name": f"Quarter {int(period)}"})
        q[f"stat_{stat_key}"] = val

    opposition = []
    for pid, entry in by_person.items():
        quarters = [entry["quarters"].get(q, {"period_name": f"Quarter {q}"}) for q in range(1, 5)]
        opposition.append({
            "squad_id": opp_squad_id,
            "squad_name": opp_squad_name,
            "is_hawks": False,
            "player": entry["name"] or entry["short"] or f"#{pid}",
            "jersey": None,
            "position": None,
            "gps": {k: None for k in [
                "total_distance_m", "total_hs_dist_m", "total_sprints", "total_player_load",
                "max_vel", "avg_m_per_min", "total_hmld", "total_accels", "total_decels",
                "avg_hr_avg", "max_hr_max", "total_field_min",
            ]},
            "match_stats": {
                **{k: entry["totals"].get(k, 0.0) for k in _STAT_KEYS},
                "clearances": None, "free_kicks": None, "time_on_ground": None,
            },
            "quarters": quarters,
        })
    opposition.sort(key=lambda p: p["player"])
    return opposition


@analytics_bp.route("/match/<match_id>/quarters", methods=["GET"])
def match_quarters(match_id):
    """Per-player per-quarter GPS data for heatmap grid."""
    session = get_session()
    try:
        rows = session.execute(text(f"""
            SELECT
                {PLAYER_NAME_SQL} AS player,
                jumpernumber AS jersey,
                COALESCE(selected_position_code, position) AS position,
                'Quarter ' || period AS period_name,
                gps_distance_m, gps_hs_dist_m, gps_sprints, gps_player_load,
                gps_max_vel, gps_m_per_min, gps_hr_avg, gps_hr_max,
                gps_accels, gps_decels, gps_hmld, gps_field_min
            FROM analysis.player_period_analysis_catapult_and_champion
            WHERE match_id = :match_id
              AND squad_id = {HAWKS_SQUAD_ID}
              AND period IS NOT NULL
            ORDER BY person_fullname, period
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
    """Aggregated stats per match for a given Hawks player."""
    session = get_session()
    try:
        rows = session.execute(text(f"""
            SELECT
                match_id,
                MAX(match_name) AS match_name,
                MAX(match_date) AS match_date,
                MAX(round_name) AS round_name,
                MAX(round_number) AS round_number,
                MAX(venue_name) AS venue_name,
                MAX(COALESCE(selected_position_code, position)) AS position,
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
                SUM(disposals) AS disposals, SUM(kicks) AS kicks, SUM(handballs) AS handballs,
                SUM(marks) AS marks, SUM(tackles) AS tackles, SUM(clearances) AS clearances,
                SUM(free_kicks) AS free_kicks, SUM(pressure_acts) AS pressure_acts,
                SUM(inside_50s) AS inside_50s, SUM(rebound_50s) AS rebound_50s,
                SUM(metres_gained) AS metres_gained, SUM(turnovers) AS turnovers,
                SUM(goals) AS goals, SUM(behinds) AS behinds,
                SUM(time_on_ground) AS time_on_ground
            FROM analysis.player_period_analysis_catapult_and_champion
            WHERE {PLAYER_NAME_SQL} = :player_name
              AND squad_id = {HAWKS_SQUAD_ID}
              AND period IS NOT NULL
            GROUP BY match_id
            ORDER BY MAX(match_date) DESC
        """), {"player_name": player_name}).fetchall()

        result = [
            {
                "match_id": r[0],
                "match_name": r[1],
                "match_date": r[2].isoformat() if r[2] else None,
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
    """Derived per-km / per-sprint efficiency metrics for each Hawks player × match."""
    session = get_session()
    try:
        rows = session.execute(text(f"""
            SELECT
                {PLAYER_NAME_SQL} AS player, match_id,
                MAX(match_name) AS match_name,
                MAX(match_date) AS match_date,
                MAX(round_name) AS round_name,
                MAX(jumpernumber) AS jersey,
                MAX(COALESCE(selected_position_code, position)) AS position,
                SUM(gps_distance_m) AS total_distance_m,
                SUM(gps_sprints) AS total_sprints,
                SUM(disposals) AS disposals,
                SUM(pressure_acts) AS pressure_acts,
                SUM(metres_gained) AS metres_gained
            FROM analysis.player_period_analysis_catapult_and_champion
            WHERE squad_id = {HAWKS_SQUAD_ID}
              AND period IS NOT NULL
            GROUP BY {PLAYER_NAME_SQL}, match_id
            HAVING {PLAYER_NAME_SQL} IS NOT NULL
            ORDER BY {PLAYER_NAME_SQL}, MAX(match_date) DESC
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
                "match_date": r[3].isoformat() if r[3] else None,
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


@analytics_bp.route("/player/<player_name>/season-quarters", methods=["GET"])
def player_season_quarters(player_name):
    """Per-quarter averages for a Hawks player across one or more seasons.
    Used by Player Match Review to overlay season baselines on the current match.
    Query params:
      seasons: comma-separated (default = all seasons the player has data for)
    Returns: { "seasons": { "2025": {matches_played, quarters: [...]}, ... } }"""
    session = get_session()
    try:
        seasons_arg = request.args.get("seasons", "").strip()
        if seasons_arg:
            seasons = [int(s) for s in seasons_arg.split(",") if s.strip().isdigit()]
        else:
            # Auto-detect: all seasons this player has quarter-level data for.
            season_rows = session.execute(text(f"""
                SELECT DISTINCT EXTRACT(YEAR FROM match_date)::int AS season
                FROM analysis.player_period_analysis_catapult_and_champion
                WHERE {PLAYER_NAME_SQL} = :pname
                  AND squad_id = {HAWKS_SQUAD_ID}
                  AND period IS NOT NULL
                ORDER BY season DESC
            """), {"pname": player_name}).fetchall()
            seasons = [int(r[0]) for r in season_rows if r[0] is not None]

        if not seasons:
            return jsonify({"player": player_name, "seasons": {}}), 200

        seasons_sql = ",".join(str(s) for s in seasons)

        # Inner query: per (season, match, quarter) metrics for this player.
        # Outer: average across matches within each (season, quarter).
        rows = session.execute(text(f"""
            SELECT season, period, COUNT(DISTINCT match_id) AS matches,
                AVG(gps_distance_m) AS gps_distance_m,
                AVG(gps_hs_dist_m) AS gps_hs_dist_m,
                AVG(gps_sprints) AS gps_sprints,
                AVG(gps_player_load) AS gps_player_load,
                AVG(gps_m_per_min) AS gps_m_per_min,
                AVG(gps_hmld) AS gps_hmld,
                AVG(gps_accels) AS gps_accels,
                AVG(gps_decels) AS gps_decels,
                AVG(gps_field_min) AS gps_field_min,
                AVG(disposals) AS stat_disposals,
                AVG(kicks) AS stat_kicks,
                AVG(handballs) AS stat_handballs,
                AVG(marks) AS stat_marks,
                AVG(tackles) AS stat_tackles,
                AVG(pressure_acts) AS stat_pressure_acts,
                AVG(metres_gained) AS stat_metres_gained,
                AVG(goals) AS stat_goals
            FROM (
                SELECT EXTRACT(YEAR FROM match_date)::int AS season, match_id, period,
                    gps_distance_m, gps_hs_dist_m, gps_sprints, gps_player_load,
                    gps_m_per_min, gps_hmld, gps_accels, gps_decels, gps_field_min,
                    disposals, kicks, handballs, marks, tackles, pressure_acts,
                    metres_gained, goals
                FROM analysis.player_period_analysis_catapult_and_champion
                WHERE {PLAYER_NAME_SQL} = :pname
                  AND squad_id = {HAWKS_SQUAD_ID}
                  AND period IS NOT NULL
                  AND EXTRACT(YEAR FROM match_date)::int IN ({seasons_sql})
            ) per_match_q
            GROUP BY season, period
            ORDER BY season, period
        """), {"pname": player_name}).fetchall()

        # Initialise output: every requested season with placeholder Q1-Q4
        seasons_out: dict = {
            str(s): {
                "matches_played": 0,
                "quarters": [{"period_name": f"Quarter {i}"} for i in range(1, 5)],
            }
            for s in seasons
        }

        gps_keys = ["gps_distance_m", "gps_hs_dist_m", "gps_sprints", "gps_player_load",
                    "gps_m_per_min", "gps_hmld", "gps_accels", "gps_decels", "gps_field_min"]
        stat_keys = ["stat_disposals", "stat_kicks", "stat_handballs", "stat_marks",
                     "stat_tackles", "stat_pressure_acts", "stat_metres_gained", "stat_goals"]

        for row in rows:
            season, quarter, matches, *metric_vals = row
            s_key = str(season)
            if s_key not in seasons_out or quarter is None:
                continue
            seasons_out[s_key]["matches_played"] = max(
                seasons_out[s_key]["matches_played"], int(matches or 0)
            )
            q_idx = int(quarter) - 1
            if 0 <= q_idx < 4:
                q = seasons_out[s_key]["quarters"][q_idx]
                for key, val in zip(gps_keys + stat_keys, metric_vals):
                    q[key] = _num(val)

        return jsonify({"player": player_name, "seasons": seasons_out}), 200
    except Exception as e:
        logger.error(f"Error fetching player season quarters: {e}")
        return jsonify({"error": "Failed to fetch player season quarters"}), 500
    finally:
        session.close()


@analytics_bp.route("/season-averages", methods=["GET"])
def season_averages():
    """Per-Hawks-player season averages across all matches — for comparison in reports."""
    session = get_session()
    try:
        rows = session.execute(text(f"""
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
                SELECT {PLAYER_NAME_SQL} AS player, match_id,
                    MAX(jumpernumber) AS jersey,
                    MAX(COALESCE(selected_position_code, position)) AS position,
                    SUM(gps_distance_m) AS match_distance_m,
                    SUM(gps_hs_dist_m) AS match_hs_dist_m,
                    SUM(gps_sprints) AS match_sprints,
                    SUM(gps_player_load) AS match_player_load,
                    AVG(gps_m_per_min) AS match_m_per_min,
                    SUM(gps_hmld) AS match_hmld,
                    SUM(gps_accels) AS match_accels,
                    SUM(gps_field_min) AS match_field_min,
                    SUM(disposals) AS match_disposals,
                    SUM(kicks) AS match_kicks,
                    SUM(handballs) AS match_handballs,
                    SUM(tackles) AS match_tackles,
                    SUM(pressure_acts) AS match_pressure_acts,
                    SUM(goals) AS match_goals,
                    SUM(metres_gained) AS match_metres_gained
                FROM analysis.player_period_analysis_catapult_and_champion
                WHERE squad_id = {HAWKS_SQUAD_ID}
                  AND period IS NOT NULL
                GROUP BY {PLAYER_NAME_SQL}, match_id
                HAVING {PLAYER_NAME_SQL} IS NOT NULL
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
