"""
AI Match Debrief — generates coaching insights from GPS + match stats using Gemini.
"""

import json
import logging
import os
from flask import Blueprint, jsonify, request
from sqlalchemy import text
from db.cloudsql_client import get_session

logger = logging.getLogger(__name__)
debrief_bp = Blueprint("debrief", __name__)

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "bill-sandpit")
LOCATION = "australia-southeast1"
MODEL_ID = "gemini-2.5-flash"

# Simple in-memory cache: match_id -> debrief result
_cache: dict[str, dict] = {}


def _get_match_data(match_id: str) -> dict | None:
    """Pull all player data for a match + season averages from cd_player_match_stats."""
    session = get_session()
    try:
        # Match info
        match_row = session.execute(text("""
            SELECT DISTINCT match_id, match_name, match_date, round_name, venue_name
            FROM cd_player_match_stats WHERE match_id = :mid LIMIT 1
        """), {"mid": match_id}).fetchone()
        if not match_row:
            return None

        # Per-player aggregated stats for THIS match
        players = session.execute(text("""
            SELECT
                player, jersey, position,
                SUM(gps_distance_m) AS distance_m,
                SUM(gps_hs_dist_m) AS hs_dist_m,
                SUM(gps_sprints) AS sprints,
                SUM(gps_player_load) AS player_load,
                MAX(gps_max_vel) AS max_vel,
                AVG(gps_m_per_min) AS m_per_min,
                SUM(gps_hmld) AS hmld,
                SUM(gps_accels) AS accels,
                SUM(gps_field_min) AS field_min,
                MAX(disposals) AS disposals,
                MAX(kicks) AS kicks,
                MAX(handballs) AS handballs,
                MAX(marks) AS marks,
                MAX(tackles) AS tackles,
                MAX(clearances) AS clearances,
                MAX(pressure_acts) AS pressure_acts,
                MAX(inside_50s) AS inside_50s,
                MAX(goals) AS goals,
                MAX(behinds) AS behinds,
                MAX(metres_gained) AS metres_gained,
                MAX(turnovers) AS turnovers,
                MAX(time_on_ground) AS time_on_ground
            FROM cd_player_match_stats
            WHERE match_id = :mid
            GROUP BY player, jersey, position
            ORDER BY SUM(gps_distance_m) DESC
        """), {"mid": match_id}).fetchall()

        # Season averages per player (across ALL matches)
        season_avgs = session.execute(text("""
            SELECT
                player,
                AVG(match_distance_m) AS avg_distance_m,
                AVG(match_hs_dist_m) AS avg_hs_dist_m,
                AVG(match_sprints) AS avg_sprints,
                AVG(match_player_load) AS avg_player_load,
                AVG(match_m_per_min) AS avg_m_per_min,
                AVG(match_hmld) AS avg_hmld,
                AVG(match_disposals) AS avg_disposals,
                AVG(match_tackles) AS avg_tackles,
                AVG(match_pressure_acts) AS avg_pressure_acts
            FROM (
                SELECT player, match_id,
                    SUM(gps_distance_m) AS match_distance_m,
                    SUM(gps_hs_dist_m) AS match_hs_dist_m,
                    SUM(gps_sprints) AS match_sprints,
                    SUM(gps_player_load) AS match_player_load,
                    AVG(gps_m_per_min) AS match_m_per_min,
                    SUM(gps_hmld) AS match_hmld,
                    MAX(disposals) AS match_disposals,
                    MAX(tackles) AS match_tackles,
                    MAX(pressure_acts) AS match_pressure_acts
                FROM cd_player_match_stats
                GROUP BY player, match_id
            ) per_match
            GROUP BY player
        """)).fetchall()
        avg_map = {}
        for a in season_avgs:
            avg_map[a[0]] = {
                "avg_distance_km": round(float(a[1] or 0) / 1000, 1),
                "avg_hs_dist_m": round(float(a[2] or 0)),
                "avg_sprints": round(float(a[3] or 0), 1),
                "avg_player_load": round(float(a[4] or 0)),
                "avg_m_per_min": round(float(a[5] or 0)),
                "avg_hmld_m": round(float(a[6] or 0)),
                "avg_disposals": round(float(a[7] or 0), 1),
                "avg_tackles": round(float(a[8] or 0), 1),
                "avg_pressure_acts": round(float(a[9] or 0), 1),
            }

        # Per-player per-quarter GPS for fatigue analysis
        quarters = session.execute(text("""
            SELECT player, period_name, gps_distance_m, gps_m_per_min, gps_sprints, gps_player_load, gps_field_min
            FROM cd_player_match_stats
            WHERE match_id = :mid
            ORDER BY player, period_name
        """), {"mid": match_id}).fetchall()

        player_data = []
        for p in players:
            name = p[0]
            distance_km = round(float(p[3] or 0) / 1000, 1)
            kicks = int(p[13] or 0)
            handballs = int(p[14] or 0)
            disposals = int(p[12] or 0)
            field_min = float(p[11] or 0)
            sprints = int(p[5] or 0)
            m_per_min = round(float(p[8] or 0))
            hs_dist = round(float(p[4] or 0))

            # Derived workrate metrics
            field_min_actual = field_min / 60 if field_min > 0 else 1
            hs_workrate = round(hs_dist / field_min_actual, 1) if field_min_actual > 0 else 0
            sprint_workrate = round(sprints / field_min_actual, 2) if field_min_actual > 0 else 0
            kick_pct = round(kicks / disposals * 100) if disposals > 0 else 0

            avgs = avg_map.get(name, {})

            player_data.append({
                "name": name, "jersey": p[1], "position": p[2],
                "distance_km": distance_km,
                "hs_dist_m": hs_dist,
                "sprints": sprints,
                "player_load": round(float(p[6] or 0)),
                "max_vel_ms": round(float(p[7] or 0), 1),
                "workrate_m_per_min": m_per_min,
                "hs_workrate_m_per_min": hs_workrate,
                "sprint_workrate": sprint_workrate,
                "hmld_m": round(float(p[9] or 0)),
                "kick_pct": kick_pct,
                "disposals": disposals,
                "kicks": kicks,
                "handballs": handballs,
                "marks": int(p[15] or 0),
                "tackles": int(p[16] or 0),
                "clearances": int(p[17] or 0),
                "pressure_acts": int(p[18] or 0),
                "inside_50s": int(p[19] or 0),
                "goals": int(p[20] or 0),
                "metres_gained": round(float(p[22] or 0)),
                "turnovers": int(p[23] or 0),
                "season_averages": avgs,
            })

        quarter_data = {}
        for q in quarters:
            name = q[0]
            if name not in quarter_data:
                quarter_data[name] = {}
            field_secs = float(q[6] or 0)
            field_min_q = field_secs / 60 if field_secs > 0 else 1
            quarter_data[name][q[1]] = {
                "distance_m": round(float(q[2] or 0)),
                "m_per_min": round(float(q[3] or 0)),
                "hs_workrate": round(float(q[2] or 0) * 0.1 / field_min_q, 1) if field_min_q > 0 else 0,
                "sprints": int(q[4] or 0),
                "sprint_workrate": round(int(q[4] or 0) / field_min_q, 2) if field_min_q > 0 else 0,
                "player_load": round(float(q[5] or 0)),
                "field_min_secs": round(field_secs),
            }

        return {
            "match_id": match_row[0],
            "match_name": match_row[1],
            "match_date": match_row[2],
            "round_name": match_row[3],
            "venue": match_row[4],
            "players": player_data,
            "quarters": quarter_data,
        }
    finally:
        session.close()


def _generate_debrief(match_data: dict) -> dict:
    """Call Gemini to generate a coaching debrief from match data."""
    import vertexai
    from vertexai.generative_models import GenerativeModel

    vertexai.init(project=PROJECT_ID, location=LOCATION)
    model = GenerativeModel(MODEL_ID)

    prompt = f"""You are an elite AFL high performance analyst at Hawthorn Football Club.
Generate a post-match performance debrief in the style of a professional AFL GPS + CIS match report.

Match: {match_data['match_name']}
Round: {match_data['round_name']}
Date: {match_data['match_date']}
Venue: {match_data['venue']}

PLAYER DATA (match totals + season averages for comparison):
Each player has their match stats AND their season_averages object. Compare this match to their averages and flag significant deviations (>10% above/below).
Key workrate metrics: workrate_m_per_min (WR), hs_workrate_m_per_min (HS WR), sprint_workrate (SPR WR).
Kick % = kicks/disposals — higher is generally better for ball movement quality.
{json.dumps(match_data['players'], indent=2)}

QUARTER-BY-QUARTER GPS DATA (per player):
Each quarter has m_per_min (WR), sprint_workrate (SPR WR), field_min_secs (time on ground).
Look for Q3/Q4 drop-offs in WR and SPR WR — compare to Q1 output.
{json.dumps(match_data['quarters'], indent=2)}

IMPORTANT CONTEXT:
- Use workrate language (WR, HS WR, Sprint WR) not raw distances — coaches think in rates not totals
- Always compare to season averages where available — "+12% on season avg" is more meaningful than raw numbers
- Flag sprint workrate specifically — this is the key intensity metric the coaching staff monitors
- Note kick % for key ball users — disposal quality matters as much as volume
- Be specific with numbers — coaches don't want vague statements

Return valid JSON with this structure:
{{
    "headline": "One-line summary (max 15 words) — lead with the key physical/performance story",
    "key_points": [
        "Bullet point headline in GPS report style — e.g. 'Sprint intensity +18% on season avg — highest output in 4 rounds'",
        "Another key point — compare to averages, flag anomalies",
        ... (3-5 key headline findings, like the 'Key Points' page of a GPS report)
    ],
    "key_performers": [
        {{"player": "Name", "summary": "Why they stood out — include WR, specific stats, comparison to their season avg"}},
        ... (top 3-4 players)
    ],
    "concerns": [
        {{"player": "Name", "issue": "Specific concern — reference season avg, workrate drop, efficiency issues"}},
        ... (players with notable drop-offs or below-average output)
    ],
    "position_groups": {{
        "midfield": "Analysis using WR, HS WR, sprint intensity, disposal quality. Compare to what you'd expect.",
        "defence": "Analysis of back group — distance, rebound 50s, marks, kick efficiency",
        "forward": "Analysis — inside 50 delivery, goals, pressure, sprint efforts",
        "ruck": "Hit-outs not available but cover distance, WR, clearance impact"
    }},
    "quarter_breakdown": {{
        "summary": "2-3 sentences on the overall Q1-Q4 intensity curve. Was it front-loaded? Even? Q3 fade?",
        "q1": "One sentence on Q1 output",
        "q2": "One sentence on Q2",
        "q3": "One sentence on Q3 — flag if WR/sprint dropped significantly",
        "q4": "One sentence on Q4 — who maintained, who faded"
    }},
    "workrate_analysis": "2-3 sentences specifically on team workrate vs season average. Was this a high-intensity or low-intensity game? How did HS WR and Sprint WR compare?",
    "recommendations": [
        "Specific actionable recommendation referencing the data",
        ... (3-5 recommendations covering physical prep, rotation strategy, disposal quality, individual player management)
    ]
}}

Return ONLY the JSON object, no markdown formatting or code blocks."""

    response = model.generate_content(prompt)
    text = response.text.strip()

    # Clean any markdown wrapping
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[:-3]
    if text.startswith("json"):
        text = text[4:]

    return json.loads(text.strip())


@debrief_bp.route("/match/<match_id>", methods=["GET"])
def get_debrief(match_id):
    """Generate or return cached AI debrief for a match."""
    force = request.args.get("force", "").lower() == "true"

    if not force and match_id in _cache:
        return jsonify(_cache[match_id]), 200

    try:
        match_data = _get_match_data(match_id)
        if not match_data:
            return jsonify({"error": "Match not found"}), 404

        debrief = _generate_debrief(match_data)
        debrief["match_id"] = match_id
        debrief["match_name"] = match_data["match_name"]
        debrief["round_name"] = match_data["round_name"]
        debrief["match_date"] = match_data["match_date"]

        _cache[match_id] = debrief
        return jsonify(debrief), 200

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}")
        return jsonify({"error": "AI response was not valid JSON. Try again."}), 500
    except Exception as e:
        logger.error(f"Debrief generation failed: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@debrief_bp.route("/matches", methods=["GET"])
def list_debrief_matches():
    """List available matches for debrief generation."""
    session = get_session()
    try:
        rows = session.execute(text("""
            SELECT match_id, MAX(match_name), MAX(match_date), MAX(round_name), MAX(venue_name),
                   COUNT(DISTINCT player)
            FROM cd_player_match_stats
            GROUP BY match_id
            ORDER BY MAX(match_date) DESC
        """)).fetchall()
        return jsonify([{
            "match_id": r[0], "match_name": r[1], "match_date": r[2],
            "round_name": r[3], "venue_name": r[4], "player_count": r[5],
            "cached": r[0] in _cache,
        } for r in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
