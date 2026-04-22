from google.cloud import bigquery
from sqlalchemy.orm import sessionmaker
from db.cloudsql_client import get_engine, init_db, get_session
from models.players import Player
from models.ratings import CoachRating
from models.wellbeing import WellbeingSurvey
from models.injuries import InjuryLog
from models.fitness import FitnessSession, FitnessPBs
from models.calendar import CalendarEvent
from models.idp_ratings import IdpRating
from models.woop import WoopGoal
from models.team import TeamSelection
from models.stats import PlayerStats

from config import get_config
import uuid
from datetime import datetime

_config = get_config()

def migrate_players():
    print("Migrating players...")
    bq_client = bigquery.Client()
    query = f"SELECT * FROM `{_config.bq_table_ref}.players_2026`"
    rows = bq_client.query(query).result()
    
    session = get_session()
    try:
        for row in rows:
            p_dict = dict(row)
            player = Player(
                jumper_no=p_dict['jumper_no'],
                name=p_dict['name'],
                age=p_dict.get('age'),
                height_cm=p_dict.get('height_cm'),
                weight_kg=p_dict.get('weight_kg'),
                games=p_dict.get('games'),
                position=p_dict.get('position'),
                originally_from=p_dict.get('originally_from'),
                status=p_dict.get('status'),
                photo_url=p_dict.get('photo_url'),
                description_weapon=p_dict.get('description_weapon') or (p_dict.get('description', {}).get('weapon') if isinstance(p_dict.get('description'), dict) else None),
                description_craft=p_dict.get('description_craft') or (p_dict.get('description', {}).get('craft') if isinstance(p_dict.get('description'), dict) else None),
                description_pyramid=p_dict.get('description_pyramid') or (p_dict.get('description', {}).get('pyramid') if isinstance(p_dict.get('description'), dict) else None),
                description_mental=p_dict.get('description_mental') or (p_dict.get('description', {}).get('mental') if isinstance(p_dict.get('description'), dict) else None)
            )
            session.merge(player)
        session.commit()
    finally:
        session.close()

def migrate_ratings():
    print("Migrating coach ratings...")
    bq_client = bigquery.Client()
    query = f"SELECT * FROM `{_config.bq_table_ref}.coach_ratings`"
    rows = bq_client.query(query).result()
    
    session = get_session()
    try:
        for row in rows:
            r_dict = dict(row)
            rating = CoachRating(
                id=r_dict.get('id', str(uuid.uuid4())),
                player_id=r_dict['player_id'],
                skill_category=r_dict['skill_category'],
                skill_name=r_dict['skill_name'],
                rating_value=r_dict['rating_value'],
                notes=r_dict.get('notes'),
                date=r_dict.get('date'),
                created_at=r_dict.get('created_at')
            )
            session.merge(rating)
        session.commit()
    finally:
        session.close()

def migrate_wellbeing():
    print("Migrating wellbeing surveys...")
    bq_client = bigquery.Client()
    query = f"SELECT * FROM `{_config.bq_table_ref}.wellbeing_surveys`"
    rows = bq_client.query(query).result()
    session = get_session()
    try:
        for row in rows:
            w_dict = dict(row)
            submission = WellbeingSurvey(
                player_id=w_dict['player_id'],
                sleep_score=w_dict['sleep_score'],
                soreness_score=w_dict['soreness_score'],
                stress_score=w_dict['stress_score'],
                notes=w_dict.get('notes'),
                submitted_at=w_dict.get('submitted_at')
            )
            session.add(submission)
        session.commit()
    finally:
        session.close()

def migrate_injuries():
    print("Migrating injury logs...")
    bq_client = bigquery.Client()
    query = f"SELECT * FROM `{_config.bq_table_ref}.injury_logs`"
    rows = bq_client.query(query).result()
    session = get_session()
    try:
        for row in rows:
            i_dict = dict(row)
            log = InjuryLog(
                id=i_dict.get('id', str(uuid.uuid4())),
                player_id=i_dict['player_id'],
                injury_type=i_dict['injury_type'],
                body_area=i_dict['body_area'],
                severity=i_dict['severity'],
                contact_load=i_dict.get('contact_load', 0),
                status=i_dict['status'],
                notes=i_dict.get('notes'),
                date=i_dict.get('date'),
                created_at=i_dict.get('created_at')
            )
            session.merge(log)
        session.commit()
    finally:
        session.close()

def migrate_fitness():
    print("Migrating fitness data...")
    bq_client = bigquery.Client()
    
    # Sessions
    query_s = f"SELECT * FROM `{_config.bq_table_ref}.fitness_sessions`"
    rows_s = bq_client.query(query_s).result()
    session = get_session()
    try:
        for row in rows_s:
            s_dict = dict(row)
            fs = FitnessSession(
                player_id=s_dict['player_id'],
                session_date=s_dict['session_date'],
                distance_km=s_dict.get('distance_km'),
                top_speed_kmh=s_dict.get('top_speed_kmh'),
                avg_hr=s_dict.get('avg_hr'),
                caloric_burn=s_dict.get('caloric_burn')
            )
            session.add(fs)
        
        # PBs
        query_p = f"SELECT * FROM `{_config.bq_table_ref}.fitness_pbs`"
        rows_p = bq_client.query(query_p).result()
        for row in rows_p:
            p_dict = dict(row)
            pb = FitnessPBs(
                player_id=p_dict['player_id'],
                run_2k_min=p_dict.get('run_2k_min'),
                run_2k_sec=p_dict.get('run_2k_sec'),
                bench_press_kg=p_dict.get('bench_press_kg'),
                vertical_jump_cm=p_dict.get('vertical_jump_cm'),
                shuttle_run_level=p_dict.get('shuttle_run_level')
            )
            session.merge(pb)
        session.commit()
    finally:
        session.close()

def migrate_calendar():
    print("Migrating calendar events...")
    bq_client = bigquery.Client()
    query = f"SELECT * FROM `{_config.bq_table_ref}.calendar_events`"
    rows = bq_client.query(query).result()
    session = get_session()
    try:
        for row in rows:
            c_dict = dict(row)
            event = CalendarEvent(
                id=c_dict['id'],
                title=c_dict['title'],
                type=c_dict['type'],
                description=c_dict.get('description'),
                start_time=c_dict['start_time'],
                end_time=c_dict['end_time'],
                player_ids=c_dict.get('player_ids', []),
                created_at=c_dict.get('created_at')
            )
            session.merge(event)
        session.commit()
    finally:
        session.close()

def migrate_idp():
    print("Migrating IDP ratings...")
    bq_client = bigquery.Client()
    query = f"SELECT * FROM `{_config.bq_table_ref}.idp_ratings`"
    rows = bq_client.query(query).result()
    session = get_session()
    try:
        for row in rows:
            i_dict = dict(row)
            idp = IdpRating(
                player_id=i_dict['player_id'],
                grit=i_dict.get('grit'),
                tactical_iq=i_dict.get('tactical_iq'),
                execution=i_dict.get('execution'),
                resilience=i_dict.get('resilience'),
                leadership=i_dict.get('leadership'),
                composite_score=i_dict.get('composite_score'),
                assessed_at=i_dict.get('assessed_at')
            )
            session.merge(idp)
        session.commit()
    finally:
        session.close()

def migrate_woop():
    print("Migrating WOOP goals...")
    bq_client = bigquery.Client()
    query = f"SELECT * FROM `{_config.GOOGLE_CLOUD_PROJECT}.{_config.BQ_DATASET}.woop_goals`"
    try:
        rows = bq_client.query(query).result()
        session = get_session()
        try:
            for row in rows:
                g_dict = dict(row)
                goal = WoopGoal(
                    id=g_dict['id'],
                    player_id=g_dict['player_id'],
                    wish=g_dict.get('wish'),
                    outcome=g_dict.get('outcome'),
                    obstacle=g_dict.get('obstacle'),
                    plan=g_dict.get('plan'),
                    status=g_dict.get('status', 'active'),
                    week_of=g_dict.get('week_of'),
                    created_at=g_dict.get('created_at')
                )
                session.merge(goal)
            session.commit()
        finally:
            session.close()
    except Exception as e:
        print(f"No WOOP table found or error: {e}")

def migrate_team():
    print("Migrating team selections...")
    bq_client = bigquery.Client()
    query = f"SELECT * FROM `{_config.GOOGLE_CLOUD_PROJECT}.{_config.BQ_DATASET}.team_selections`"
    try:
        rows = bq_client.query(query).result()
        session = get_session()
        try:
            for row in rows:
                t_dict = dict(row)
                selection = TeamSelection(
                    position_id=t_dict['position_id'],
                    player_id=t_dict.get('player_id'),
                    notes=t_dict.get('notes')
                )
                session.merge(selection)
            session.commit()
        finally:
            session.close()
    except Exception as e:
        print(f"No team selections table found or error: {e}")

def migrate_stats():
    print("Migrating player stats...")
    bq_client = bigquery.Client()
    query = f"SELECT * FROM `{_config.GOOGLE_CLOUD_PROJECT}.{_config.BQ_DATASET}.player_stats_2025`"
    try:
        rows = bq_client.query(query).result()
        session = get_session()
        try:
            for row in rows:
                s_dict = dict(row)
                stats = PlayerStats(
                    jumper_no=s_dict['jumper_no'],
                    games_played=s_dict.get('games_played', 0),
                    af_avg=s_dict.get('af_avg', 0),
                    rating_points=s_dict.get('rating_points', 0),
                    goals_avg=s_dict.get('goals_avg', 0),
                    disposals_avg=s_dict.get('disposals_avg', 0),
                    marks_avg=s_dict.get('marks_avg', 0),
                    tackles_avg=s_dict.get('tackles_avg', 0),
                    clearances_avg=s_dict.get('clearances_avg', 0),
                    kicks_avg=s_dict.get('kicks_avg', 0),
                    handballs_avg=s_dict.get('handballs_avg', 0),
                    hitouts_avg=s_dict.get('hitouts_avg', 0)
                )
                session.merge(stats)
            session.commit()
        finally:
            session.close()
    except Exception as e:
        print(f"No player stats table found or error: {e}")

if __name__ == "__main__":
    print("Initializing Cloud SQL schema...")
    init_db()
    
    migrate_players()
    migrate_ratings()
    migrate_wellbeing()
    migrate_injuries()
    migrate_fitness()
    migrate_calendar()
    migrate_idp()
    migrate_woop()
    migrate_team()
    migrate_stats()
    
    print("Migration complete!")
