"""
The Hawk Hub — Analytics Engine

Provides statistical analysis for player wellbeing data.
Functions:
    - calculate_rolling_averages: 7-day and 28-day trend lines
    - detect_anomalies: Flags deviations > 1.5 standard deviations from baseline
    - correlate_metrics: Pearson correlation between wellbeing factors
"""

from collections import defaultdict
from datetime import datetime, timedelta
import math
import statistics


def calculate_rolling_averages(surveys: list[dict]) -> dict:
    """
    Calculates 7-day and 28-day rolling averages for sleep, soreness, and stress.

    Args:
        surveys: List of survey dicts, must include 'submitted_at' and scores.

    Returns:
        Dict with 'rolling_7' and 'rolling_28' keys, each containing date-value pairs.
    """
    if not surveys:
        return {"rolling_7": {}, "rolling_28": {}}

    # Sort checks by date
    sorted_surveys = sorted(surveys, key=lambda x: x["submitted_at"])
    
    # Extract daily values (taking last survey of day if multiple)
    daily_values = {}
    for s in sorted_surveys:
        ts = s["submitted_at"]
        if isinstance(ts, str):
            date_str = ts.split("T")[0]
        else:
            date_str = ts.strftime("%Y-%m-%d")

        daily_values[date_str] = {
            "sleep": s["sleep_score"],
            "soreness": s["soreness_score"],
            "stress": s["stress_score"],
        }

    dates = sorted(daily_values.keys())
    rolling_7 = defaultdict(list)
    rolling_28 = defaultdict(list)

    for i, date in enumerate(dates):
        # 7-day window
        window_7 = [daily_values[d] for d in dates[max(0, i-6):i+1]]
        rolling_7["dates"].append(date)
        rolling_7["sleep"].append(statistics.mean(d["sleep"] for d in window_7))
        rolling_7["soreness"].append(statistics.mean(d["soreness"] for d in window_7))
        rolling_7["stress"].append(statistics.mean(d["stress"] for d in window_7))

        # 28-day window
        window_28 = [daily_values[d] for d in dates[max(0, i-27):i+1]]
        rolling_28["dates"].append(date)
        rolling_28["sleep"].append(statistics.mean(d["sleep"] for d in window_28))
        rolling_28["soreness"].append(statistics.mean(d["soreness"] for d in window_28))
        rolling_28["stress"].append(statistics.mean(d["stress"] for d in window_28))

    return {"rolling_7": dict(rolling_7), "rolling_28": dict(rolling_28)}


def detect_anomalies(surveys: list[dict], baseline_days: int = 28) -> list[dict]:
    """
    Identifies significant deviations from personal baseline.
    
    Anomaly criteria: 
    - Latest score is > 1.5 standard deviations from baseline mean
    - Direction: Lower is bad (since 1=Poor, 10=Good)
    """
    if len(surveys) < 5:
        return []

    # Get most recent survey
    sorted_surveys = sorted(surveys, key=lambda x: x["submitted_at"], reverse=True)
    latest = sorted_surveys[0]
    
    # Establish baseline (excluding latest)
    # Ensure we handle both string (isoformat) and datetime objects
    latest_ts = latest["submitted_at"]
    if isinstance(latest_ts, str):
        latest_dt = datetime.fromisoformat(latest_ts.replace("Z", "+00:00"))
    else:
        latest_dt = latest_ts
    
    cutoff = latest_dt - timedelta(days=baseline_days)

    baseline_surveys = []
    for s in sorted_surveys[1:]:
        ts = s["submitted_at"]
        if isinstance(ts, str):
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        else:
            dt = ts
        
        if dt >= cutoff:
            baseline_surveys.append(s)

    if len(baseline_surveys) < 3:
        return []

    anomalies = []
    metrics = ["sleep_score", "soreness_score", "stress_score"]

    for metric in metrics:
        values = [s[metric] for s in baseline_surveys]
        mean = statistics.mean(values)
        stdev = statistics.stdev(values) if len(values) > 1 else 0

        if stdev == 0:
            continue

        z_score = (latest[metric] - mean) / stdev

        # Flag if z-score is below -1.5 (significantly worse than normal)
        if z_score < -1.5:
            ts = latest["submitted_at"]
            date_str = ts.split("T")[0] if isinstance(ts, str) else ts.strftime("%Y-%m-%d")
            
            anomalies.append({
                "date": date_str,
                "metric": metric.replace("_score", ""),
                "value": latest[metric],
                "baseline_mean": round(mean, 1),
                "deviation_sd": round(z_score, 1),
                "severity": "High" if z_score < -2.5 else "Medium"
            })

    return anomalies
