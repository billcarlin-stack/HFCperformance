"""
The Hawk Hub — Insights API Routes

Endpoints:
    GET /api/insights/team  — Squad-wide analytics and trends
"""

import logging
import statistics
from collections import defaultdict
from datetime import datetime, timedelta

from flask import Blueprint, jsonify

from models.wellbeing import get_surveys_for_player
from models.fitness import get_latest_session
from models.players import get_all_players
from auth.middleware import require_role

logger = logging.getLogger(__name__)

insights_bp = Blueprint("insights", __name__)


@insights_bp.route("/api/insights/team", methods=["GET"])
@require_role("admin", "coach", "medical", "analyst")
def get_team_insights():
    """
    Generates squad-wide insights based on recent wellbeing data.

    Returns:
        JSON object with:
        - daily_averages: { date: { sleep: 8.1, soreness: 7.2, ... } }
        - flagged_groups: ["Defenders showing high soreness load"]
        - trends: ["Sleep quality down 5% vs last week"]
    """
    try:
        players = get_all_players()
        if not players:
            return jsonify({"error": "No players found"}), 404

        # Aggregate surveys from all players (last 14 days)
        all_surveys = []
        all_fitness = []
        for p in players:
            # We fetch 14 days worth of wellbeing
            surveys = get_surveys_for_player(p['jumper_no'], limit=14)
            for s in surveys:
                s['position'] = p['position']
                all_surveys.append(s)
            
            # Fetch latest fitness session
            fit = get_latest_session(p['jumper_no'])
            if fit:
                all_fitness.append(fit)

        if not all_surveys and not all_fitness:
            return jsonify({"message": "No recent data available"}), 200

        # Group by date
        by_date = defaultdict(list)
        for s in all_surveys:
            ts = s["submitted_at"]
            if isinstance(ts, str):
                date_str = ts.split("T")[0]
            else:
                date_str = ts.strftime("%Y-%m-%d")
            by_date[date_str].append(s)

        dates = sorted(by_date.keys())
        daily_averages = {}
        
        for date in dates:
            day_surveys = by_date[date]
            daily_averages[date] = {
                "sleep": round(statistics.mean(s["sleep_score"] for s in day_surveys), 1),
                "soreness": round(statistics.mean(s["soreness_score"] for s in day_surveys), 1),
                "stress": round(statistics.mean(s["stress_score"] for s in day_surveys), 1),
                "count": len(day_surveys)
            }

        # Generate specific insights
        insights = []
        
        # 1. Compare this week vs last week (Sleep)
        if len(dates) >= 7:
            recent_slate = [daily_averages[d]["sleep"] for d in dates[-3:]]
            older_slate = [daily_averages[d]["sleep"] for d in dates[-7:-4]]
            
            if recent_slate and older_slate:
                recent_avg = statistics.mean(recent_slate)
                older_avg = statistics.mean(older_slate)
                diff = ((recent_avg - older_avg) / older_avg) * 100
                
                if diff < -5:
                    insights.append(f"Sleep quality down {abs(round(diff))}% over last 3 days")
                elif diff > 5:
                    insights.append(f"Sleep quality up {round(diff)}% over last 3 days")

        # 2. Position group soreness
        if len(dates) > 0:
            latest_date = dates[-1]
            latest_surveys = by_date[latest_date]
            by_pos = defaultdict(list)
            for s in latest_surveys:
                by_pos[s.get("position", "Unknown")].append(s["soreness_score"])
            
            for pos, scores in by_pos.items():
                avg_soreness = statistics.mean(scores)
                if avg_soreness < 6.5: # Lower is worse
                    insights.append(f"{pos} group showing high soreness load ({round(avg_soreness, 1)} avg)")

        # 3. Fitness Aggregates
        fitness_stats = {
            "avg_top_speed": 0,
            "avg_distance": 0,
            "avg_load": 0,
            "count": 0
        }
        if all_fitness:
            fitness_stats = {
                "avg_top_speed": round(statistics.mean(f["top_speed_kmh"] for f in all_fitness), 1),
                "avg_distance": round(statistics.mean(f["distance_km"] for f in all_fitness), 2),
                "avg_load": round(statistics.mean(f["total_load"] for f in all_fitness), 0),
                "count": len(all_fitness)
            }
            
            # Add fitness insight if speed is high
            if fitness_stats["avg_top_speed"] > 31:
                insights.append(f"Squad peak speed trending high ({fitness_stats['avg_top_speed']} km/h avg)")

        return jsonify({
            "daily_averages": daily_averages,
            "insights": insights,
            "fitness_stats": fitness_stats
        }), 200

    except Exception as e:
        logger.error("Error generating team insights: %s", str(e))
        return jsonify({"error": "Failed to generate insights", "detail": str(e)}), 500
