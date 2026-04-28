"""AI Match Debrief — generates coach-style post-match reviews from match data
and recent coach reports (RAG over the .pptx archive)."""

import json
import logging
import os
import re

from flask import Blueprint, jsonify, request
from sqlalchemy import text

from db.cloudsql_client import get_session
from routes.debrief_pptx_context import fetch_recent_reports_context

logger = logging.getLogger(__name__)
debrief_bp = Blueprint("debrief", __name__)

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "bill-sandpit")
LOCATION = "australia-southeast1"
MODEL_ID = "gemini-2.5-pro"
DEBRIEF_CACHE_BUCKET = os.environ.get(
    "DEBRIEF_CACHE_BUCKET", "hfc-football-dev-gcs-coaching-data-dev"
)
DEBRIEF_CACHE_PREFIX = "ai-debriefs/v2/"
HAWKS_SQUAD_ID = 80


CLUB_GLOSSARY = """HFC COACHING GLOSSARY — use this language, do not invent your own:
Set pieces & zones:
- D50 / F50 / I50 — defensive 50, forward 50, inside 50
- BTA — Ball Throw-In (boundary throw-in stoppage)
- CB — Centre Bounce (CBA = centre bounce attendance)
- BU / TI — ball-up / throw-in
- 20m bubble (20mB) — work and shape inside 20m of the contest
- 765 — defensive structure with 7th, 6th, 5th defenders
- KID — Kick-In Defence
- KI — Kick-In (offence)
- LDL — long defensive line (kick into back half from F50 stoppage)
Tactics & terminology:
- Agassi — kicking back across the ground from a stoppage / set defence
- Launchpad — area from which Hawks generate attacking entries
- BANG — North-South direct ball movement
- Threat — primary forward target
- Openside — open side of the ground
- Skinny — too central / not wide enough
- Hope — passive effort ("effort v hope" = chase vs cover)
- Snap / Hat — fast pressure layers post-clearance
- Crazy to Calm — chaotic phase resolving into structured set
- Draco — opposition deep-fwd plant
- Bobby Fischer — set-piece defensive read / defender code-name
- A2 — fwd movement pattern
- 0-7 sec — first 7 seconds of a transition
- D1 / D2 / D3 — first, second, third defensive pressure layers
- HTPA — head-to-pocket-and-arm tackle technique
- R2P — Race to Pressure
- Sandwich — pressure from both sides of contest
- FOGI — Fall On / Get Involved
- GBAH — ground ball at hips
- GBG — ground ball gets
- MOOB — mark out of bounds / mark on lead — read context (typically intercept-mark stat)
- CM / UCM — contested mark / uncontested mark
- MI50 — marks inside 50
- MG — metres gained
- HBMG — half-back metres gained
- MOT — Method Of Transfer (handball/kick craft)
- TIFH — Time In Forward Half (%)
- FHTO — Forward Half Turnover
- S/I50A — score per inside 50 against
- G/I50 — goals per inside 50
- PF — Pressure Factor
- T Eff% — tackle efficiency %
- DKS — Defensive Key Score
- SR — Scoring Rate
KPI status flags coaches use: VG (very good) / G / OK / RFI (Required For Improvement) / poor
KPI emoji: ✅ on track   🆗 acceptable   ❌ red / below standard
Player references: by jumper number ("#5", "#19"). Use the JUMPER MAP provided.
Voice: terse, fragment-heavy, club-jargon-heavy. Never explain a term — coaches know.
"""


# ---------------------------------------------------------------------------
# Match data
# ---------------------------------------------------------------------------

def _format_score(goals: int, behinds: int) -> str:
    return f"{goals}.{behinds}.{goals * 6 + behinds}"


def _get_opp_score(session, match_id: str) -> tuple[str | None, str | None]:
    """Return (opp_squad_name, opp_score) using snowflake_champion_data totals."""
    opp_row = session.execute(text(f"""
        SELECT DISTINCT squad_id, squad_code
        FROM analysis.player_period_analysis_catapult_and_champion
        WHERE match_id = :mid AND squad_id != {HAWKS_SQUAD_ID} AND squad_id IS NOT NULL
        LIMIT 1
    """), {"mid": match_id}).fetchone()
    if not opp_row:
        return None, None
    opp_squad_id, opp_squad_name = int(opp_row[0]), opp_row[1]
    try:
        sums = session.execute(text("""
            SELECT s.metric, SUM(s.total) AS v
            FROM snowflake_champion_data.match_player_stats s
            WHERE s.match_id = :mid AND s.squad_id = :opp_id
              AND s.metric IN ('GOAL', 'BEHIND')
            GROUP BY s.metric
        """), {"mid": int(match_id), "opp_id": opp_squad_id}).fetchall()
        m = {row[0]: int(row[1] or 0) for row in sums}
        if "GOAL" not in m and "BEHIND" not in m:
            return opp_squad_name, None
        return opp_squad_name, _format_score(m.get("GOAL", 0), m.get("BEHIND", 0))
    except Exception as e:
        logger.warning(f"Opp score lookup failed for match {match_id}: {e}")
        return opp_squad_name, None


def _get_match_data(match_id: str) -> dict | None:
    session = get_session()
    try:
        match_row = session.execute(text("""
            SELECT DISTINCT match_id, match_name, match_date, round_name, venue_name
            FROM analysis.player_period_analysis_catapult_and_champion
            WHERE match_id = :mid AND squad_id = 80 LIMIT 1
        """), {"mid": match_id}).fetchone()
        if not match_row:
            return None

        players = session.execute(text("""
            SELECT
                person_fullname AS player,
                MAX(jumpernumber) AS jersey,
                MAX(COALESCE(selected_position_code, position)) AS position,
                SUM(gps_distance_m) AS distance_m,
                SUM(gps_hs_dist_m) AS hs_dist_m,
                SUM(gps_sprints) AS sprints,
                SUM(gps_player_load) AS player_load,
                MAX(gps_max_vel) AS max_vel,
                AVG(gps_m_per_min) AS m_per_min,
                SUM(gps_hmld) AS hmld,
                SUM(gps_accels) AS accels,
                SUM(gps_field_min) AS field_min,
                SUM(disposals) AS disposals,
                SUM(kicks) AS kicks,
                SUM(handballs) AS handballs,
                SUM(marks) AS marks,
                SUM(tackles) AS tackles,
                SUM(clearances) AS clearances,
                SUM(pressure_acts) AS pressure_acts,
                SUM(inside_50s) AS inside_50s,
                SUM(goals) AS goals,
                SUM(behinds) AS behinds,
                SUM(metres_gained) AS metres_gained,
                SUM(turnovers) AS turnovers,
                SUM(time_on_ground) AS time_on_ground
            FROM analysis.player_period_analysis_catapult_and_champion
            WHERE match_id = :mid AND squad_id = 80 AND period IS NOT NULL
            GROUP BY person_fullname
            HAVING person_fullname IS NOT NULL
            ORDER BY SUM(gps_distance_m) DESC NULLS LAST
        """), {"mid": match_id}).fetchall()

        season_avgs = session.execute(text("""
            SELECT player,
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
                SELECT person_fullname AS player, match_id,
                    SUM(gps_distance_m) AS match_distance_m,
                    SUM(gps_hs_dist_m) AS match_hs_dist_m,
                    SUM(gps_sprints) AS match_sprints,
                    SUM(gps_player_load) AS match_player_load,
                    AVG(gps_m_per_min) AS match_m_per_min,
                    SUM(gps_hmld) AS match_hmld,
                    SUM(disposals) AS match_disposals,
                    SUM(tackles) AS match_tackles,
                    SUM(pressure_acts) AS match_pressure_acts
                FROM analysis.player_period_analysis_catapult_and_champion
                WHERE squad_id = 80 AND period IS NOT NULL
                GROUP BY person_fullname, match_id
            ) per_match
            WHERE player IS NOT NULL
            GROUP BY player
        """)).fetchall()
        avg_map = {a[0]: {
            "avg_distance_km": round(float(a[1] or 0) / 1000, 1),
            "avg_hs_dist_m": round(float(a[2] or 0)),
            "avg_sprints": round(float(a[3] or 0), 1),
            "avg_player_load": round(float(a[4] or 0)),
            "avg_m_per_min": round(float(a[5] or 0)),
            "avg_hmld_m": round(float(a[6] or 0)),
            "avg_disposals": round(float(a[7] or 0), 1),
            "avg_tackles": round(float(a[8] or 0), 1),
            "avg_pressure_acts": round(float(a[9] or 0), 1),
        } for a in season_avgs}

        quarters = session.execute(text("""
            SELECT person_fullname AS player,
                   'Quarter ' || period AS period_name,
                   gps_distance_m, gps_m_per_min, gps_sprints, gps_player_load, gps_field_min
            FROM analysis.player_period_analysis_catapult_and_champion
            WHERE match_id = :mid AND squad_id = 80 AND period IS NOT NULL
            ORDER BY person_fullname, period
        """), {"mid": match_id}).fetchall()

        player_data = []
        jumper_map: dict[str, int] = {}
        team_goals = team_behinds = 0
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
            field_min_actual = field_min / 60 if field_min > 0 else 1
            hs_workrate = round(hs_dist / field_min_actual, 1) if field_min_actual > 0 else 0
            sprint_workrate = round(sprints / field_min_actual, 2) if field_min_actual > 0 else 0
            kick_pct = round(kicks / disposals * 100) if disposals > 0 else 0
            jersey = int(p[1]) if p[1] is not None else None
            if jersey is not None:
                jumper_map[name] = jersey
            team_goals += int(p[20] or 0)
            team_behinds += int(p[21] or 0)
            player_data.append({
                "name": name, "jersey": jersey, "position": p[2],
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
                "season_averages": avg_map.get(name, {}),
            })

        quarter_data: dict = {}
        for q in quarters:
            name = q[0]
            field_secs = float(q[6] or 0)
            field_min_q = field_secs / 60 if field_secs > 0 else 1
            quarter_data.setdefault(name, {})[q[1]] = {
                "distance_m": round(float(q[2] or 0)),
                "m_per_min": round(float(q[3] or 0)),
                "hs_workrate": round(float(q[2] or 0) * 0.1 / field_min_q, 1) if field_min_q > 0 else 0,
                "sprints": int(q[4] or 0),
                "sprint_workrate": round(int(q[4] or 0) / field_min_q, 2) if field_min_q > 0 else 0,
                "player_load": round(float(q[5] or 0)),
                "field_min_secs": round(field_secs),
            }

        opp_squad_name, opp_score = _get_opp_score(session, match_id)
        hawks_score = _format_score(team_goals, team_behinds)

        return {
            "match_id": match_row[0],
            "match_name": match_row[1],
            "match_date": match_row[2],
            "round_name": match_row[3],
            "venue": match_row[4],
            "hawks_score": hawks_score,
            "opp_name": opp_squad_name,
            "opp_score": opp_score,
            "jumper_map": jumper_map,
            "players": player_data,
            "quarters": quarter_data,
        }
    finally:
        session.close()


# ---------------------------------------------------------------------------
# AI generation
# ---------------------------------------------------------------------------

def _build_prompt(match_data: dict, prior_reports_context: str) -> str:
    jumpers_inline = ", ".join(
        f"#{j} {n}" for n, j in sorted(match_data["jumper_map"].items(), key=lambda x: x[1])
    )

    score_line = f"Hawks {match_data['hawks_score']}"
    if match_data.get("opp_score") and match_data.get("opp_name"):
        score_line += f"  vs  {match_data['opp_name']} {match_data['opp_score']}"

    return f"""You are an HFC match-review analyst writing the post-match review deck for the senior coaching group. The audience is the head coach and assistants — they live in club jargon and want a tactical/structural review, not a GPS report.

{CLUB_GLOSSARY}

{prior_reports_context}

THIS MATCH:
{match_data['round_name']} — {match_data['match_name']}
Date: {match_data['match_date']}   Venue: {match_data['venue']}
Score: {score_line}

JUMPER MAP (use #number when calling players out, like coaches do):
{jumpers_inline}

PLAYER MATCH TOTALS + SEASON AVERAGES (GPS + match stats):
{json.dumps(match_data['players'], indent=2)}

PER-PLAYER QUARTER GPS:
{json.dumps(match_data['quarters'], indent=2)}

Write the review in the same voice as the prior coach reports above — terse, jargon-rich, fragment-heavy, jumper-number-led. Do NOT explain jargon. Do NOT pivot to GPS as the headline; tactical/structural insight is the headline, GPS is a supporting section.

Where the prior reports flag recurring RFIs (e.g. kick-in predictability, find the threat, 20m bubble intent, Q3 fade), name them and say whether THIS match continued or broke the pattern.

Return ONLY a valid JSON object with this exact structure (no markdown, no code fences):

{{
    "headline": "One-line tactical headline (max 18 words). Lead with structure/tactics, not GPS.",
    "score_summary": "One sentence on the scoreboard story — margin, scoring sources if obvious from data, who took the game when.",
    "copilot_themes": [
        "Theme 1 — strategic narrative (~3 sentences). Cross-line patterns coaches should care about.",
        "Theme 2 — same.",
        "Theme 3 — same."
    ],
    "coach_summaries": {{
        "midfield_stoppages": {{
            "story_of_game": "FOCUSES + OVERVIEW — 4-6 short sentences. CB/BTA balance, 20mB intent, ruck dominance, fast feet, Bont-rule equivalent. Use jumper #s.",
            "positives": ["short bullet", "short bullet"],
            "rfis": ["short bullet", "short bullet"],
            "recommendations": ["short bullet"]
        }},
        "contest": {{
            "story_of_game": "Contested possessions, aerial, pressure factor narrative. 3-5 sentences.",
            "positives": ["..."],
            "rfis": ["..."],
            "recommendations": ["..."]
        }},
        "defenders": {{
            "story_of_game": "HAWKS BALL / TEAM D / CONTEST narrative for the back half. KID, D2/D3, MOOB defence, 765 read.",
            "positives": ["..."],
            "rfis": ["..."],
            "recommendations": ["..."]
        }},
        "forwards": {{
            "story_of_game": "HAWKS BALL / TEAM D / CONTEST for the front half. F50 stoppage, A2, D1 pressure, MI50, repeat I50, score from F50.",
            "positives": ["..."],
            "rfis": ["..."],
            "recommendations": ["..."]
        }}
    }},
    "structure": {{
        "d50": "Set-piece review — defensive 50. Stoppages, score against, mention 765 if relevant. 2-4 sentences.",
        "bta": "Boundary throw-in review — clearance balance, wing-through, +/-, scoring from BTA.",
        "f50": "F50 stoppage review — clearances, score, working together, +1 / 7th positioning.",
        "kick_in_defence": "KID — short, predictable, force long, smarts on matchups.",
        "kick_ins": "Our KIs — left/right, predictability, I50 conversion, score return.",
        "recommendations": ["1-3 set-piece focus areas for next week"]
    }},
    "oppo": {{
        "what_worked": ["3-5 things we did well that we should keep"],
        "learnings": ["3-5 things to learn or adjust for next time"]
    }},
    "development": {{
        "positives": ["#X craft / aerial / 20mB", "..."],
        "rfis": ["#Y mentality / fundamentals / pressure", "..."],
        "recommendations": ["development priorities for this week"]
    }},
    "review_focuses": {{
        "SM": ["focus area"],
        "DH": ["focus area"],
        "KS": ["focus area"],
        "AH": ["focus area"],
        "DMA": ["focus area"],
        "DG": ["focus area"]
    }},
    "physical_summary": {{
        "headline": "Single sentence — was this a high or low intensity game vs season avg?",
        "team_workrate": "2-3 sentences on team WR, HS WR, Sprint WR vs season averages.",
        "quarter_curve": {{
            "summary": "Q1-Q4 intensity arc — front-loaded, even, Q3 fade.",
            "q1": "one sentence",
            "q2": "one sentence",
            "q3": "one sentence",
            "q4": "one sentence"
        }},
        "key_performers": [
            {{"player": "#X Surname", "summary": "WR / HS WR / context vs season avg"}}
        ],
        "concerns": [
            {{"player": "#X Surname", "issue": "specific physical drop-off, link to season avg"}}
        ]
    }},
    "recurring_themes": [
        "Theme from prior reports that resurfaced or was resolved this week (cite which prior round if you can)."
    ]
}}"""


def _generate_debrief(match_data: dict) -> dict:
    import vertexai
    from vertexai.generative_models import GenerativeModel
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    model = GenerativeModel(MODEL_ID)

    round_name = match_data.get("round_name") or ""
    rnum = re.search(r"\d+", round_name)
    exclude = rnum.group(0) if rnum else None

    prior_context = fetch_recent_reports_context(n=3, exclude_round=exclude)
    prompt = _build_prompt(match_data, prior_context)

    resp = model.generate_content(prompt)
    txt = resp.text.strip()
    if txt.startswith("```"):
        txt = txt.split("\n", 1)[1] if "\n" in txt else txt[3:]
    if txt.endswith("```"):
        txt = txt[:-3]
    if txt.startswith("json"):
        txt = txt[4:]
    return json.loads(txt.strip())


# ---------------------------------------------------------------------------
# GCS-backed cache
# ---------------------------------------------------------------------------

def _cache_get(match_id: str) -> dict | None:
    try:
        from google.cloud import storage
        client = storage.Client()
        blob = client.bucket(DEBRIEF_CACHE_BUCKET).blob(
            f"{DEBRIEF_CACHE_PREFIX}{match_id}.json"
        )
        if not blob.exists():
            return None
        return json.loads(blob.download_as_text())
    except Exception as e:
        logger.warning(f"Cache read failed for {match_id}: {e}")
        return None


def _cache_put(match_id: str, debrief: dict) -> None:
    try:
        from google.cloud import storage
        client = storage.Client()
        blob = client.bucket(DEBRIEF_CACHE_BUCKET).blob(
            f"{DEBRIEF_CACHE_PREFIX}{match_id}.json"
        )
        blob.upload_from_string(json.dumps(debrief), content_type="application/json")
    except Exception as e:
        logger.warning(f"Cache write failed for {match_id}: {e}")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@debrief_bp.route("/match/<match_id>", methods=["GET"])
def get_debrief(match_id):
    force = request.args.get("force", "").lower() == "true"

    if not force:
        cached = _cache_get(match_id)
        if cached:
            return jsonify(cached), 200

    try:
        match_data = _get_match_data(match_id)
        if not match_data:
            return jsonify({"error": "Match not found"}), 404

        debrief = _generate_debrief(match_data)
        debrief["match_id"] = match_id
        debrief["match_name"] = match_data["match_name"]
        debrief["round_name"] = match_data["round_name"]
        debrief["match_date"] = match_data["match_date"]
        debrief["hawks_score"] = match_data["hawks_score"]
        debrief["opp_name"] = match_data["opp_name"]
        debrief["opp_score"] = match_data["opp_score"]
        debrief["schema_version"] = 2

        _cache_put(match_id, debrief)
        return jsonify(debrief), 200
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse model response as JSON: {e}")
        return jsonify({"error": "AI response was not valid JSON. Try again."}), 500
    except Exception as e:
        logger.error(f"Debrief generation failed: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@debrief_bp.route("/matches", methods=["GET"])
def list_debrief_matches():
    session = get_session()
    try:
        rows = session.execute(text("""
            SELECT match_id, MAX(match_name), MAX(match_date), MAX(round_name), MAX(venue_name),
                   COUNT(DISTINCT CASE WHEN period IS NOT NULL AND gps_distance_m IS NOT NULL
                                       THEN person_id END)
            FROM analysis.player_period_analysis_catapult_and_champion
            WHERE squad_id = 80
            GROUP BY match_id
            ORDER BY MAX(match_date) DESC
        """)).fetchall()
        cached_ids = _list_cached_match_ids()
        return jsonify([{
            "match_id": r[0], "match_name": r[1], "match_date": r[2],
            "round_name": r[3], "venue_name": r[4], "player_count": r[5],
            "cached": r[0] in cached_ids,
        } for r in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


def _list_cached_match_ids() -> set[str]:
    try:
        from google.cloud import storage
        client = storage.Client()
        bucket = client.bucket(DEBRIEF_CACHE_BUCKET)
        return {
            os.path.basename(b.name).removesuffix(".json")
            for b in bucket.list_blobs(prefix=DEBRIEF_CACHE_PREFIX)
            if b.name.endswith(".json")
        }
    except Exception as e:
        logger.warning(f"Cached match list failed: {e}")
        return set()
