"""
The Hawk Hub — Database Utilities
Massive Seeder logic for initializing and seeding AlloyDB with the FULL Hawthorn dataset, 
including highly granular coaching ratings, real AFL player statistics, WOOP goals, and injury logs.
"""

import os
import random
import logging
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import sessionmaker

from db.alloydb_client import Base, get_engine
from models.players import Player
from models.fitness import FitnessSession, FitnessPBs
from models.ratings import CoachRating
from models.wellbeing import WellbeingSurvey
from models.injuries import InjuryLog
from models.team import TeamSelection
from models.woop import WoopGoal
from models.stats import PlayerStats
from models.calendar import CalendarEvent
from models.user_roles import UserRole

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Data Helpers
# ──────────────────────────────────────────────────────────────────────────────

PLAYERS_DATA = [
    {'jumper_no': 1, 'name': 'Harry Morrison', 'age': 25, 'height_cm': 184, 'games': 90, 'position': 'Mid/Def', 'status': 'Green'},
    {'jumper_no': 2, 'name': 'Mitchell Lewis', 'age': 25, 'height_cm': 199, 'games': 75, 'position': 'Key Forward', 'status': 'Amber'},
    {'jumper_no': 3, 'name': 'Jai Newcombe', 'age': 22, 'height_cm': 186, 'games': 60, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 4, 'name': 'Jarman Impey', 'age': 28, 'height_cm': 178, 'games': 180, 'position': 'Defender', 'status': 'Green'},
    {'jumper_no': 5, 'name': 'James Worpel', 'age': 25, 'height_cm': 186, 'games': 110, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 6, 'name': 'James Sicily', 'age': 29, 'height_cm': 188, 'games': 140, 'position': 'Defender', 'status': 'Green'},
    {'jumper_no': 7, 'name': 'Ned Reeves', 'age': 25, 'height_cm': 210, 'games': 45, 'position': 'Ruck', 'status': 'Green'},
    {'jumper_no': 8, 'name': 'Sam Frost', 'age': 30, 'height_cm': 194, 'games': 160, 'position': 'Key Def', 'status': 'Amber'},
    {'jumper_no': 9, 'name': 'Changkuoth Jiath', 'age': 24, 'height_cm': 185, 'games': 50, 'position': 'Def/Mid', 'status': 'Red'},
    {'jumper_no': 10, 'name': 'Karl Amon', 'age': 28, 'height_cm': 181, 'games': 140, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 11, 'name': 'Conor Nash', 'age': 25, 'height_cm': 198, 'games': 85, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 12, 'name': 'Will Day', 'age': 22, 'height_cm': 189, 'games': 60, 'position': 'Mid/Def', 'status': 'Green'},
    {'jumper_no': 13, 'name': 'Dylan Moore', 'age': 24, 'height_cm': 177, 'games': 80, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 14, 'name': 'Jack Scrimshaw', 'age': 25, 'height_cm': 193, 'games': 85, 'position': 'Defender', 'status': 'Green'},
    {'jumper_no': 15, 'name': 'Blake Hardwick', 'age': 27, 'height_cm': 182, 'games': 150, 'position': 'Defender', 'status': 'Green'},
    {'jumper_no': 16, 'name': "Massimo D'Ambrosio", 'age': 20, 'height_cm': 178, 'games': 15, 'position': 'Def/Mid', 'status': 'Green'},
    {'jumper_no': 17, 'name': 'Lloyd Meek', 'age': 25, 'height_cm': 204, 'games': 30, 'position': 'Ruck', 'status': 'Green'},
    {'jumper_no': 18, 'name': 'Mabior Chol', 'age': 27, 'height_cm': 200, 'games': 65, 'position': 'Key Forward', 'status': 'Amber'},
    {'jumper_no': 19, 'name': 'Jack Ginnivan', 'age': 21, 'height_cm': 177, 'games': 45, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 20, 'name': 'Chad Wingard', 'age': 30, 'height_cm': 182, 'games': 220, 'position': 'Forward', 'status': 'Red'},
    {'jumper_no': 21, 'name': 'Nick Watson', 'age': 19, 'height_cm': 170, 'games': 10, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 22, 'name': 'Luke Breust', 'age': 33, 'height_cm': 184, 'games': 285, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 23, 'name': 'Josh Weddle', 'age': 19, 'height_cm': 192, 'games': 20, 'position': 'Defender', 'status': 'Green'},
    {'jumper_no': 24, 'name': 'Denver Grainger-Barras', 'age': 21, 'height_cm': 195, 'games': 30, 'position': 'Key Def', 'status': 'Amber'},
    {'jumper_no': 25, 'name': 'Josh Ward', 'age': 20, 'height_cm': 182, 'games': 35, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 26, 'name': 'Bodie Ryan', 'age': 18, 'height_cm': 188, 'games': 0, 'position': 'Defender', 'status': 'Green'},
    {'jumper_no': 27, 'name': 'Will McCabe', 'age': 18, 'height_cm': 197, 'games': 0, 'position': 'Key Def', 'status': 'Green'},
    {'jumper_no': 28, 'name': 'Cam Mackenzie', 'age': 20, 'height_cm': 188, 'games': 15, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 29, 'name': 'Jai Serong', 'age': 21, 'height_cm': 193, 'games': 10, 'position': 'Mid/Fwd', 'status': 'Green'},
    {'jumper_no': 30, 'name': 'Sam Butler', 'age': 21, 'height_cm': 184, 'games': 20, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 31, 'name': 'Connor MacDonald', 'age': 21, 'height_cm': 185, 'games': 40, 'position': 'Mid/Fwd', 'status': 'Green'},
    {'jumper_no': 32, 'name': 'Finn Maginness', 'age': 23, 'height_cm': 189, 'games': 35, 'position': 'Midfielder', 'status': 'Green'},
    {'jumper_no': 33, 'name': "Jack O'Sullivan", 'age': 19, 'height_cm': 177, 'games': 0, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 34, 'name': 'Ethan Phillips', 'age': 24, 'height_cm': 196, 'games': 0, 'position': 'Def', 'status': 'Green'},
    {'jumper_no': 35, 'name': 'Calsher Dear', 'age': 18, 'height_cm': 194, 'games': 0, 'position': 'Key Fwd', 'status': 'Green'},
    {'jumper_no': 36, 'name': 'James Blanck', 'age': 23, 'height_cm': 196, 'games': 30, 'position': 'Key Def', 'status': 'Red'},
    {'jumper_no': 37, 'name': 'Josh Bennetts', 'age': 19, 'height_cm': 178, 'games': 0, 'position': 'Forward', 'status': 'Green'},
    {'jumper_no': 38, 'name': 'Max Ramsden', 'age': 21, 'height_cm': 203, 'games': 5, 'position': 'Ruck/Fwd', 'status': 'Green'},
    {'jumper_no': 40, 'name': 'Seamus Mitchell', 'age': 22, 'height_cm': 181, 'games': 15, 'position': 'Def/Fwd', 'status': 'Green'},
    {'jumper_no': 43, 'name': 'Jack Gunston', 'age': 32, 'height_cm': 193, 'games': 250, 'position': 'Forward', 'status': 'Amber'},
    {'jumper_no': 44, 'name': 'Henry Hustwaite', 'age': 19, 'height_cm': 195, 'games': 5, 'position': 'Midfielder', 'status': 'Green'},
]

HFC_PLAYER_IDS = [p['jumper_no'] for p in PLAYERS_DATA]
PLAYER_POSITIONS = {p['jumper_no']: p['position'].lower().replace('/def', '').replace('/fwd', '').replace('/mid', '') for p in PLAYERS_DATA}

# ──────────────────────────────────────────────────────────────────────────────
# Granular Rating Traits (Detailed Football Attributes)
# ──────────────────────────────────────────────────────────────────────────────

TECHNICAL_TRAITS = [
    "Kicking (Short 15-30m)", "Kicking (Long 50m+)", "Goal Kicking Accuracy", 
    "Non-Preferred Foot Effectiveness", "Handball Execution (Traffic)", 
    "Handball Vision & Creativity", "Clean Hands (Ground Level)", 
    "Contested Marking", "Uncontested/Spread Marking", "Intercept Marking", 
    "Lead-up Marking", "Ground Balls (Clean)", "Ground Balls (Pressure/Traffic)", 
    "Tackling Technique", "Tackling Effectiveness", "Spoiling & Body Spoils", 
    "Smothering Capability", "Ruck Setup / Tap Work"
]

TACTICAL_TRAITS = [
    "Offensive Positioning / Spread", "Defensive Positioning / Zone", 
    "Stoppage Positioning / Setup", "Decision Making (With Ball / Under Pressure)", 
    "Decision Making (Without Ball / Leading)", "Reading the Play / Anticipation", 
    "Team Structure Adherence", "Game Sense / Overall Awareness", 
    "Transition Running (Offense to Defense)", "Transition Running (Defense to Offense)"
]

PHYSICAL_TRAITS = [
    "Acceleration (First 10m)", "Top Speed Capabilities", "Agility & Lateral Movement", 
    "Aerobic Endurance / Running Capacity", "Anaerobic Repeated Sprint Ability", 
    "Core Strength & Stability", "Contested 1-on-1 Strength", "Vertical Jump / Leap", 
    "Explosiveness out of contests", "Recovery Rate Between Efforts"
]

MENTAL_TRAITS = [
    "Resilience / Bouncing Back from Mistakes", "On-Field Leadership & Direction", 
    "Off-Field Leadership & Professionalism", "Communication / Voice on Field", 
    "Work Rate / Effort", "Focus & Concentration across 4 quarters", 
    "Coachability & Tactical Implementation", "Aggression & Physicality", 
    "Composure Under Extreme Pressure", "Self-Motivation & Drive"
]

# ──────────────────────────────────────────────────────────────────────────────
# Real AFL Stats (2024 Season Data where available)
# ──────────────────────────────────────────────────────────────────────────────

REAL_STATS = {
    3: {'games_played': 25, 'af_avg': 95.0, 'goals_avg': 0.5, 'disposals_avg': 25.0, 'marks_avg': 3.9, 'tackles_avg': 4.5, 'clearances_avg': 6.0, 'kicks_avg': 13.0, 'handballs_avg': 12.0}, # Jai Newcombe
    6: {'games_played': 22, 'af_avg': 92.0, 'goals_avg': 0.2, 'disposals_avg': 21.5, 'marks_avg': 7.6, 'tackles_avg': 2.0, 'clearances_avg': 0.5, 'kicks_avg': 17.0, 'handballs_avg': 4.5}, # James Sicily
    10: {'games_played': 25, 'af_avg': 90.5, 'goals_avg': 0.4, 'disposals_avg': 22.1, 'marks_avg': 5.7, 'tackles_avg': 3.0, 'clearances_avg': 1.0, 'kicks_avg': 15.0, 'handballs_avg': 7.1}, # Karl Amon
    13: {'games_played': 24, 'af_avg': 88.0, 'goals_avg': 1.4, 'disposals_avg': 19.5, 'marks_avg': 5.3, 'tackles_avg': 4.0, 'clearances_avg': 1.5, 'kicks_avg': 12.0, 'handballs_avg': 7.5}, # Dylan Moore
    16: {'games_played': 24, 'af_avg': 85.0, 'goals_avg': 0.3, 'disposals_avg': 21.1, 'marks_avg': 5.0, 'tackles_avg': 2.5, 'clearances_avg': 0.8, 'kicks_avg': 14.5, 'handballs_avg': 6.6}, # Massimo
    11: {'games_played': 25, 'af_avg': 80.0, 'goals_avg': 0.3, 'disposals_avg': 18.9, 'marks_avg': 3.0, 'tackles_avg': 5.3, 'clearances_avg': 4.0, 'kicks_avg': 8.5, 'handballs_avg': 10.4}, # Conor Nash
    18: {'games_played': 23, 'af_avg': 65.0, 'goals_avg': 1.6, 'disposals_avg': 9.3, 'marks_avg': 3.7, 'tackles_avg': 2.0, 'clearances_avg': 0.8, 'kicks_avg': 6.0, 'handballs_avg': 3.3}, # Mabior Chol
    19: {'games_played': 23, 'af_avg': 72.0, 'goals_avg': 1.2, 'disposals_avg': 15.2, 'marks_avg': 3.9, 'tackles_avg': 2.5, 'clearances_avg': 1.0, 'kicks_avg': 10.0, 'handballs_avg': 5.2}, # Jack Ginnivan
    43: {'games_played': 18, 'af_avg': 60.0, 'goals_avg': 1.6, 'disposals_avg': 8.8, 'marks_avg': 4.6, 'tackles_avg': 1.2, 'clearances_avg': 0.2, 'kicks_avg': 6.0, 'handballs_avg': 2.8}, # Jack Gunston
    31: {'games_played': 23, 'af_avg': 78.0, 'goals_avg': 1.1, 'disposals_avg': 17.5, 'marks_avg': 4.5, 'tackles_avg': 3.2, 'clearances_avg': 1.5, 'kicks_avg': 9.5, 'handballs_avg': 8.0}, # Connor MacDonald
    5: {'games_played': 25, 'af_avg': 85.0, 'goals_avg': 0.6, 'disposals_avg': 21.8, 'marks_avg': 4.0, 'tackles_avg': 4.8, 'clearances_avg': 5.2, 'kicks_avg': 11.5, 'handballs_avg': 10.3}, # James Worpel
    21: {'games_played': 18, 'af_avg': 55.0, 'goals_avg': 1.4, 'disposals_avg': 10.8, 'marks_avg': 3.1, 'tackles_avg': 2.6, 'clearances_avg': 0.5, 'kicks_avg': 7.0, 'handballs_avg': 3.8}, # Nick Watson
    35: {'games_played': 16, 'af_avg': 52.0, 'goals_avg': 1.5, 'disposals_avg': 8.2, 'marks_avg': 2.7, 'tackles_avg': 1.5, 'clearances_avg': 0.3, 'kicks_avg': 5.8, 'handballs_avg': 2.4}, # Calsher Dear
}

def generate_mock_stats(pos):
    """Generates realistic stats if real ones are missing based on position."""
    if 'midfielder' in pos:
        return {'games_played': 20, 'af_avg': rnd(70, 95), 'goals_avg': rnd(0.2, 1.2), 'disposals_avg': rnd(18, 28), 'marks_avg': rnd(3, 6), 'tackles_avg': rnd(3, 6), 'clearances_avg': rnd(3, 7), 'kicks_avg': rnd(10, 16), 'handballs_avg': rnd(8, 14)}
    elif 'forward' in pos:
        return {'games_played': 20, 'af_avg': rnd(55, 80), 'goals_avg': rnd(1.0, 2.5), 'disposals_avg': rnd(10, 16), 'marks_avg': rnd(3, 6), 'tackles_avg': rnd(2, 4), 'clearances_avg': rnd(0, 1), 'kicks_avg': rnd(6, 11), 'handballs_avg': rnd(3, 6)}
    elif 'def' in pos:
        return {'games_played': 20, 'af_avg': rnd(65, 85), 'goals_avg': rnd(0, 0.3), 'disposals_avg': rnd(15, 23), 'marks_avg': rnd(5, 8), 'tackles_avg': rnd(2, 4), 'clearances_avg': rnd(0, 1), 'kicks_avg': rnd(10, 15), 'handballs_avg': rnd(5, 8)}
    elif 'ruck' in pos:
        return {'games_played': 20, 'af_avg': rnd(70, 90), 'goals_avg': rnd(0.2, 0.8), 'disposals_avg': rnd(12, 18), 'marks_avg': rnd(2, 5), 'tackles_avg': rnd(3, 5), 'clearances_avg': rnd(2, 5), 'kicks_avg': rnd(6, 10), 'handballs_avg': rnd(6, 10), 'hitouts_avg': rnd(20, 35)}
    else:
        return {'games_played': 15, 'af_avg': 60.0, 'goals_avg': 0.5, 'disposals_avg': 14.0, 'marks_avg': 4.0, 'tackles_avg': 2.5, 'clearances_avg': 1.0, 'kicks_avg': 8.0, 'handballs_avg': 6.0}

POSITION_PROFILES = {
    "midfielder": {"distance_km": (13, 17), "top_speed": (30, 34), "hr_avg": (152, 168), "hsd_m": (1200, 2200), "sprints": (18, 32), "acc": (55, 95)},
    "forward":    {"distance_km": (10, 14), "top_speed": (31, 35), "hr_avg": (148, 165), "hsd_m": (900, 1600), "sprints": (15, 27), "acc": (45, 80)},
    "defender":   {"distance_km": (11, 15), "top_speed": (29, 33), "hr_avg": (150, 166), "hsd_m": (1000, 1800), "sprints": (16, 28), "acc": (50, 85)},
    "ruck":       {"distance_km": (9, 13),  "top_speed": (27, 31), "hr_avg": (145, 162), "hsd_m": (700, 1300), "sprints": (10, 20), "acc": (40, 70)},
    "def":        {"distance_km": (11, 15), "top_speed": (29, 33), "hr_avg": (150, 166), "hsd_m": (1000, 1800), "sprints": (16, 28), "acc": (50, 85)},
    "key forward": {"distance_km": (10, 14), "top_speed": (31, 35), "hr_avg": (148, 165), "hsd_m": (900, 1600), "sprints": (15, 27), "acc": (45, 80)},
    "key def":    {"distance_km": (11, 15), "top_speed": (29, 33), "hr_avg": (150, 166), "hsd_m": (1000, 1800), "sprints": (16, 28), "acc": (50, 85)},
}

def rnd(a, b, decimals=1):
    return round(random.uniform(a, b), decimals)

# ──────────────────────────────────────────────────────────────────────────────
# Initialization Root Function
# ──────────────────────────────────────────────────────────────────────────────

def initialize_and_seed():
    """Synchronously initializes schema and populates FULL massive data set."""
    engine = get_engine()
    logger.info("Dropping and recreating all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # ──────────────────────────────────────────────────────────────────────
        # 1. Players
        # ──────────────────────────────────────────────────────────────────────
        logger.info("Seeding players...")
        players_to_add = []
        for p_data in PLAYERS_DATA:
            players_to_add.append(Player(
                jumper_no=p_data['jumper_no'],
                name=p_data['name'],
                age=p_data['age'],
                height_cm=p_data['height_cm'],
                weight_kg=84, # More realistic default
                games=p_data['games'],
                position=p_data['position'],
                status=p_data['status']
            ))
        session.add_all(players_to_add)
        session.commit()
        
        # ──────────────────────────────────────────────────────────────────────
        # 2. Fitness / PBs / Surveys / Stats / Injuries / Ratings / Goals
        # ──────────────────────────────────────────────────────────────────────
        logger.info("Seeding massive data relations...")
        today = datetime.now(timezone.utc)
        
        objects_to_add = []
        
        for player_id in HFC_PLAYER_IDS:
            pos = PLAYER_POSITIONS.get(player_id, "midfielder")
            profile = POSITION_PROFILES.get(pos, POSITION_PROFILES["midfielder"])
            
            # -- Player Stats (Real or Mocked) --
            p_stats = REAL_STATS.get(player_id, generate_mock_stats(pos))
            objects_to_add.append(PlayerStats(
                jumper_no=player_id,
                games_played=p_stats['games_played'],
                af_avg=p_stats['af_avg'],
                rating_points=rnd(10, 18),
                goals_avg=p_stats['goals_avg'],
                disposals_avg=p_stats['disposals_avg'],
                marks_avg=p_stats['marks_avg'],
                tackles_avg=p_stats['tackles_avg'],
                clearances_avg=p_stats['clearances_avg'],
                kicks_avg=p_stats['kicks_avg'],
                handballs_avg=p_stats['handballs_avg'],
                hitouts_avg=p_stats.get('hitouts_avg', 0)
            ))
            
            # -- WOOP Goals --
            objects_to_add.append(WoopGoal(
                id=str(uuid.uuid4())[:8],
                player_id=player_id,
                wish=random.choice(["Improve intercept marking", "Better 2km time trial", "Increase disposal efficiency", "More tackles inside 50", "Consistent contested ball wins"]),
                outcome="More impacts on game results and securing a starting spot",
                obstacle="Losing focus in 3rd quarters or fatigue during late stages",
                plan="Commit to extra craft sessions after main training; focus on breathing techniques when fatigued.",
                status="active",
                week_of=today.strftime("%Y-W%W")
            ))

            # -- Injuries (if flag is not Green) --
            p_data = next(p for p in PLAYERS_DATA if p['jumper_no'] == player_id)
            if p_data['status'] != 'Green':
                severity = "Major" if p_data['status'] == 'Red' else "Moderate"
                objects_to_add.append(InjuryLog(
                    id=str(uuid.uuid4()),
                    player_id=player_id,
                    injury_type=random.choice(["Hamstring Strain", "Ankle Sprain", "Bone Bruise", "Concussion Protocol", "Shoulder Subluxation"]),
                    body_area=random.choice(["Leg", "Ankle", "Knee", "Head", "Shoulder"]),
                    severity=severity,
                    contact_load=random.randint(0, 100) if severity == 'Moderate' else 0,
                    status="Active",
                    notes="Requires ongoing management from physio team. Restricted load.",
                    date=(today - timedelta(days=random.randint(2, 20))).strftime("%Y-%m-%d")
                ))

            # -- Granular Coach Ratings --
            for cat, traits in [("Technical", TECHNICAL_TRAITS), ("Tactical", TACTICAL_TRAITS), ("Physical", PHYSICAL_TRAITS), ("Mental", MENTAL_TRAITS)]:
                for trait in traits:
                    # Skew ratings slightly higher for high-end players
                    base_rating = random.randint(5, 8)
                    if player_id in [3, 6, 12, 13]: # Absolute stars
                        base_rating = random.randint(7, 10)
                        
                    objects_to_add.append(CoachRating(
                        id=str(uuid.uuid4()),
                        player_id=player_id,
                        skill_category=cat,
                        skill_name=trait,
                        rating_value=base_rating,
                        notes="Needs slight refinement." if base_rating < 7 else "Elite level capability.",
                        date=today.strftime("%Y-%m-%d")
                    ))
            
            # -- Sessions & Wellbeing (Last 7 Days) --
            for days_ago in range(1, 8):
                session_date = today - timedelta(days=days_ago)
                objects_to_add.append(FitnessSession(
                    player_id=player_id,
                    session_date=session_date,
                    session_type="Main Training" if days_ago in [2, 5] else "Skills/Weights",
                    distance_km=rnd(*profile["distance_km"]),
                    top_speed_kmh=rnd(*profile["top_speed"]),
                    hsd_m=float(random.randint(*profile["hsd_m"])),
                    hr_avg_bpm=random.randint(*profile["hr_avg"]),
                    hr_max_bpm=random.randint(*profile["hr_avg"]) + 25,
                    total_load=rnd(300, 600),
                    sprints=random.randint(*profile["sprints"]),
                    accelerations=random.randint(*profile["acc"]),
                    decelerations=int(random.randint(*profile["acc"]) * 0.8),
                    is_live=1 if days_ago == 1 else 0
                ))
                
                # Introduce occasional "stress" or "soreness" for insights generator
                sleep = random.randint(6, 10)
                soreness = random.randint(4, 10) if p_data['status'] == 'Green' else random.randint(2, 6)
                stress = random.randint(6, 10)
                
                notes = ""
                if soreness < 5: notes = "Feeling tight in hamstrings."
                elif sleep < 7: notes = "Didn't sleep well, feeling fatigued."
                
                objects_to_add.append(WellbeingSurvey(
                    player_id=player_id,
                    sleep_score=sleep,
                    soreness_score=soreness,
                    stress_score=stress,
                    notes=notes,
                    submitted_at=session_date
                ))
            
            # -- Fitness PBs --
            objects_to_add.append(FitnessPBs(
                player_id=player_id,
                run_2k_seconds=random.randint(380, 480),
                bench_press_kg=rnd(80, 140),
                squat_kg=rnd(100, 160),
                vertical_jump_cm=rnd(55, 85),
                beep_test_level=rnd(12, 16),
                top_speed_kmh=rnd(30, 36),
                sprint_10m_s=rnd(1.6, 1.9, 2),
                sprint_40m_s=rnd(4.8, 5.4, 2),
                date_recorded=today - timedelta(days=random.randint(5, 30))
            ))

        # ──────────────────────────────────────────────────────────────────────
        # 3. Calendar Events
        # ──────────────────────────────────────────────────────────────────────
        logger.info("Seeding Calendar Events...")
        for days_offset in range(-3, 4):
            event_date = today + timedelta(days=days_offset)
            
            # Main Session
            objects_to_add.append(CalendarEvent(
                id=str(uuid.uuid4()),
                title="Main Training - Waverley Park",
                type="Main Session",
                description="High intensity match simulation.",
                start_time=event_date.replace(hour=10, minute=0, second=0),
                end_time=event_date.replace(hour=12, minute=30, second=0),
                player_ids=[] # empty means all squad
            ))
            
            # Weights
            objects_to_add.append(CalendarEvent(
                id=str(uuid.uuid4()),
                title="Squad Weights - Upper Focus",
                type="Weights",
                description="Team lift in the HPC.",
                start_time=event_date.replace(hour=13, minute=30, second=0),
                end_time=event_date.replace(hour=14, minute=30, second=0),
                player_ids=[]
            ))
            
            # Rehab group
            rehab_players = [p['jumper_no'] for p in PLAYERS_DATA if p['status'] != 'Green']
            if rehab_players:
                objects_to_add.append(CalendarEvent(
                    id=str(uuid.uuid4()),
                    title="Rehab / AlterG / Pool",
                    type="Rehab",
                    description="Modified running programs and pool recovery.",
                    start_time=event_date.replace(hour=9, minute=30, second=0),
                    end_time=event_date.replace(hour=11, minute=0, second=0),
                    player_ids=rehab_players
                ))

        # Commit the main dataset first
        session.add_all(objects_to_add)
        session.commit()

        # ── Seed user_roles (Google email → role mapping) ────────────────────
        # This is the access control list. Add your club's Google emails here.
        # Coaches use their Google Workspace email. Players use their personal Gmail.
        # These can be updated any time directly in the user_roles database table.
        logger.info("Seeding user_roles access control list...")
        user_roles_to_seed = [
            # ── Coaches / Staff ──────────────────────────────────────────────
            # authorised Intelia staff members with Coach access.
            {"email": "joel.collins@intelia.com.au",   "role": "coach",  "player_id": None, "name": "Joel Collins"},
            {"email": "direnc.uysal@intelia.com.au",   "role": "coach",  "player_id": None, "name": "Direnc Uysal"},
            {"email": "bill.carlin@intelia.com.au",    "role": "coach",  "player_id": None, "name": "Bill Carlin"},
            {"email": "daniel.zillmann@intelia.com.au", "role": "coach",  "player_id": None, "name": "Daniel Zillmann"},
            # ── Players ───────────────────────────────────────────────────────
            # Format: real Google email → player's jumper_no
            # Replace with actual player emails
            {"email": "harry.morrison@gmail.com",        "role": "player", "player_id": 1,  "name": "Harry Morrison"},
            {"email": "mitchell.lewis@gmail.com",         "role": "player", "player_id": 2,  "name": "Mitchell Lewis"},
            {"email": "jai.newcombe@gmail.com",           "role": "player", "player_id": 3,  "name": "Jai Newcombe"},
            {"email": "jarman.impey@gmail.com",           "role": "player", "player_id": 4,  "name": "Jarman Impey"},
            {"email": "james.worpel@gmail.com",           "role": "player", "player_id": 5,  "name": "James Worpel"},
            {"email": "james.sicily@gmail.com",           "role": "player", "player_id": 6,  "name": "James Sicily"},
            {"email": "ned.reeves@gmail.com",             "role": "player", "player_id": 7,  "name": "Ned Reeves"},
            {"email": "sam.frost@gmail.com",              "role": "player", "player_id": 8,  "name": "Sam Frost"},
            {"email": "changkuoth.jiath@gmail.com",       "role": "player", "player_id": 9,  "name": "Changkuoth Jiath"},
            {"email": "karl.amon@gmail.com",              "role": "player", "player_id": 10, "name": "Karl Amon"},
            {"email": "conor.nash@gmail.com",             "role": "player", "player_id": 11, "name": "Conor Nash"},
            {"email": "will.day@gmail.com",               "role": "player", "player_id": 12, "name": "Will Day"},
            {"email": "dylan.moore@gmail.com",            "role": "player", "player_id": 13, "name": "Dylan Moore"},
            {"email": "jack.scrimshaw@gmail.com",         "role": "player", "player_id": 14, "name": "Jack Scrimshaw"},
            {"email": "blake.hardwick@gmail.com",         "role": "player", "player_id": 15, "name": "Blake Hardwick"},
            {"email": "massimo.dambrosio@gmail.com",      "role": "player", "player_id": 16, "name": "Massimo D'Ambrosio"},
            {"email": "lloyd.meek@gmail.com",             "role": "player", "player_id": 17, "name": "Lloyd Meek"},
            {"email": "mabior.chol@gmail.com",            "role": "player", "player_id": 18, "name": "Mabior Chol"},
            {"email": "jack.ginnivan@gmail.com",          "role": "player", "player_id": 19, "name": "Jack Ginnivan"},
            {"email": "chad.wingard@gmail.com",           "role": "player", "player_id": 20, "name": "Chad Wingard"},
            {"email": "nick.watson@gmail.com",            "role": "player", "player_id": 21, "name": "Nick Watson"},
            {"email": "luke.breust@gmail.com",            "role": "player", "player_id": 22, "name": "Luke Breust"},
            {"email": "josh.weddle@gmail.com",            "role": "player", "player_id": 23, "name": "Josh Weddle"},
            {"email": "denver.grainger-barras@gmail.com", "role": "player", "player_id": 24, "name": "Denver Grainger-Barras"},
            {"email": "josh.ward@gmail.com",              "role": "player", "player_id": 25, "name": "Josh Ward"},
            {"email": "jack.gunston@gmail.com",           "role": "player", "player_id": 43, "name": "Jack Gunston"},
        ]

        for u in user_roles_to_seed:
            existing = session.query(UserRole).filter(UserRole.google_email == u["email"]).first()
            if not existing:
                session.add(UserRole(
                    google_email=u["email"],
                    role=u["role"],
                    player_id=u["player_id"],
                    name=u["name"],
                ))
        session.commit()
        logger.info(f"user_roles seeded with {len(user_roles_to_seed)} entries.")

        logger.info(f"Database initialized and MASSIVE dataset seeded ({len(objects_to_add)} records).")
        return True
    except Exception as e:
        session.rollback()
        logger.error(f"Initialization failed: {e}", exc_info=True)
        raise e
    finally:
        session.close()
