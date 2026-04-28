"""
Seed Champion Data CSVs into cd_matches, cd_lineups, cd_rotations, and cd_gps tables.

Reads CSV files, extracts unique matches, lineups, rotations, and GPS data,
then upserts into Cloud SQL via pg8000.

Usage: python seeds/seed_champion_data.py
"""
import os
import csv
import pg8000
import pg8000.dbapi

# Parse DATABASE_URL if available, otherwise use individual env vars
_db_url = os.environ.get("DATABASE_URL", "")
if _db_url:
    # postgresql://user:pass@host:port/dbname
    from urllib.parse import urlparse
    _parsed = urlparse(_db_url)
    DB_HOST = _parsed.hostname or "34.40.183.18"
    DB_PORT = _parsed.port or 5432
    DB_NAME = _parsed.path.lstrip("/") or "hfc_prod"
    DB_USER = _parsed.username or "postgres"
    DB_PASSWORD = _parsed.password or ""
else:
    DB_HOST = os.environ.get("DB_HOST", "34.40.183.18")
    DB_PORT = int(os.environ.get("DB_PORT", "5432"))
    DB_NAME = os.environ.get("DB_NAME", "hfc_prod")
    DB_USER = os.environ.get("DB_USER", "postgres")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "")

# CSV file paths — relative to this script's directory
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(os.path.dirname(__file__), "data"))

LINEUP_FILES = [
    "studio_results_20260414_2057.csv",       # 2026 lineups + stats
]
ROTATION_FILES = [
    "studio_results_20260414_2054 (1).csv",   # 2025 rotations
    "studio_results_20260414_2055.csv",        # 2026 R5 rotations
]
GPS_MATCH_FILES = [
    "studio_results_20260414_2054.csv",        # GPS + match stats (2025)
]
GPS_QUARTER_FILES = [
    "studio_results_20260414_2056.csv",        # GPS per quarter (2026)
]


def get_conn():
    return pg8000.dbapi.connect(
        host=DB_HOST, port=DB_PORT, database=DB_NAME,
        user=DB_USER, password=DB_PASSWORD
    )


def add_column_if_missing(cur, table, column, col_type):
    """Add a column to a table if it doesn't already exist."""
    cur.execute("""
        SELECT 1 FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s
    """, (table, column))
    if not cur.fetchone():
        cur.execute(f'ALTER TABLE {table} ADD COLUMN {column} {col_type}')
        print(f"  Added column {table}.{column}")


def create_tables(cur):
    """Create tables if they don't exist, and add any missing columns."""

    cur.execute("""
        CREATE TABLE IF NOT EXISTS cd_matches (
            match_id TEXT PRIMARY KEY,
            season_id TEXT,
            round_name TEXT,
            round_number TEXT,
            match_date TEXT,
            match_status TEXT,
            venue_code TEXT,
            venue_name TEXT,
            home_squad_id TEXT,
            home_squad_code TEXT,
            home_squad_name TEXT,
            home_score INTEGER,
            away_squad_id TEXT,
            away_squad_code TEXT,
            away_squad_name TEXT,
            away_score INTEGER
        )
    """)
    # Add columns that may be missing from the original schema
    for col, ctype in [('venue_name', 'TEXT'), ('round_number', 'TEXT'),
                        ('home_squad_name', 'TEXT'), ('away_squad_name', 'TEXT')]:
        add_column_if_missing(cur, 'cd_matches', col, ctype)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS cd_lineups (
            id SERIAL PRIMARY KEY,
            match_id TEXT,
            squad_id TEXT,
            player_id TEXT,
            jumper_no INTEGER,
            position_code TEXT,
            played BOOLEAN,
            player_name TEXT,
            player_display_name TEXT,
            UNIQUE(match_id, squad_id, player_id)
        )
    """)
    for col, ctype in [('player_name', 'TEXT'), ('player_display_name', 'TEXT')]:
        add_column_if_missing(cur, 'cd_lineups', col, ctype)

    # Ensure unique constraints exist for upserts
    for stmt in [
        "CREATE UNIQUE INDEX IF NOT EXISTS cd_lineups_match_squad_player ON cd_lineups(match_id, squad_id, player_id)",
        "CREATE UNIQUE INDEX IF NOT EXISTS cd_rotations_match_squad_period ON cd_rotations(match_id, squad_id, period, period_secs, off_player_id, on_player_id)",
    ]:
        try:
            cur.execute(stmt)
        except Exception:
            pass  # index may already exist

    cur.execute("""
        CREATE TABLE IF NOT EXISTS cd_rotations (
            id SERIAL PRIMARY KEY,
            match_id TEXT,
            squad_id TEXT,
            period INTEGER,
            period_secs INTEGER,
            off_player_id TEXT,
            on_player_id TEXT,
            off_reason TEXT,
            UNIQUE(match_id, squad_id, period, period_secs, off_player_id, on_player_id)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS cd_gps (
            id SERIAL PRIMARY KEY,
            match_id TEXT,
            player_name TEXT,
            jersey INTEGER,
            position TEXT,
            round_number TEXT,
            period_id TEXT,
            distance_m NUMERIC,
            hs_dist_m NUMERIC,
            sprints INTEGER,
            player_load NUMERIC,
            max_vel NUMERIC,
            m_per_min NUMERIC,
            hr_avg NUMERIC,
            hr_max NUMERIC,
            accels INTEGER,
            decels INTEGER,
            hmld NUMERIC,
            field_min NUMERIC,
            activity_id TEXT,
            athlete_id TEXT,
            UNIQUE(match_id, athlete_id, period_id)
        )
    """)


def safe_int(val):
    if val is None or val == '':
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def safe_numeric(val):
    if val is None or val == '':
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def load_lineups(cur):
    """Load lineup CSV files — extracts both matches and lineups."""
    matches_loaded = 0
    lineups_loaded = 0

    for fname in LINEUP_FILES:
        path = os.path.join(DATA_DIR, fname)
        if not os.path.exists(path):
            print(f"SKIP (not found): {fname}")
            continue

        print(f"Loading lineups from {fname}...")
        with open(path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            seen_matches = set()

            for row in reader:
                match_id = row['match_id']

                # Upsert match (once per match_id)
                if match_id not in seen_matches:
                    seen_matches.add(match_id)
                    home_score = safe_int(row.get('home_squad_score_points'))
                    away_score = safe_int(row.get('away_squad_score_points'))

                    cur.execute("""
                        INSERT INTO cd_matches (match_id, season_id, round_name, round_number,
                            match_date, match_status, venue_code, venue_name,
                            home_squad_id, home_squad_code, home_squad_name, home_score,
                            away_squad_id, away_squad_code, away_squad_name, away_score)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT (match_id) DO UPDATE SET
                            home_score = EXCLUDED.home_score,
                            away_score = EXCLUDED.away_score,
                            match_status = EXCLUDED.match_status
                    """, (
                        match_id, row['season_id'], row['round_name'], row['round_number'],
                        row['match_date'], row['match_status_code'], row['venue_code'], row['venue_name'],
                        row['home_squad_id'], row['home_squad_code'], row['home_squad_name'], home_score,
                        row['away_squad_id'], row['away_squad_code'], row['away_squad_name'], away_score,
                    ))
                    matches_loaded += 1

                # Upsert lineup entry
                player_id = row.get('person_id') or row.get('player_id')
                squad_id = row.get('player_squad_id')
                jumper_no = safe_int(row.get('jumpernumber') or row.get('player_jumpernumber'))
                position_code = row.get('position_code') or row.get('selected_position_code') or ''
                played = row.get('match_played', '').strip().upper() == 'TRUE' or bool(row.get('disposals'))
                player_name = row.get('person_fullname', '')
                player_display = row.get('person_displayname', '')

                if player_id and squad_id:
                    cur.execute("""
                        INSERT INTO cd_lineups (match_id, squad_id, player_id, jumper_no, position_code, played, player_name, player_display_name)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT (match_id, squad_id, player_id) DO UPDATE SET
                            jumper_no = EXCLUDED.jumper_no,
                            position_code = EXCLUDED.position_code,
                            played = EXCLUDED.played
                    """, (match_id, squad_id, player_id, jumper_no, position_code, played, player_name, player_display))
                    lineups_loaded += 1

    print(f"Matches upserted: {matches_loaded}, Lineups upserted: {lineups_loaded}")


def load_rotations(cur):
    """Load rotation CSV files — also extracts match data."""
    rotations_loaded = 0
    matches_loaded = 0

    for fname in ROTATION_FILES:
        path = os.path.join(DATA_DIR, fname)
        if not os.path.exists(path):
            print(f"SKIP (not found): {fname}")
            continue

        print(f"Loading rotations from {fname}...")
        with open(path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            seen_matches = set()

            for row in reader:
                match_id = row['match_id']

                # Upsert match from rotation data
                if match_id not in seen_matches:
                    seen_matches.add(match_id)
                    home_score = safe_int(row.get('home_points'))
                    away_score = safe_int(row.get('away_points'))

                    cur.execute("""
                        INSERT INTO cd_matches (match_id, season_id, round_name, round_number,
                            match_date, match_status, venue_code, venue_name,
                            home_squad_id, home_squad_code, home_squad_name, home_score,
                            away_squad_id, away_squad_code, away_squad_name, away_score)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT (match_id) DO UPDATE SET
                            home_score = COALESCE(EXCLUDED.home_score, cd_matches.home_score),
                            away_score = COALESCE(EXCLUDED.away_score, cd_matches.away_score)
                    """, (
                        match_id, row['season_id'], row['round_name'], row['round_number'],
                        row['match_date'], row['status_code'], row['venue_code'], row['venue_name'],
                        row['home_squad_id'], row['home_squad_code'], row['home_squad_name'], home_score,
                        row['away_squad_id'], row['away_squad_code'], row['away_squad_name'], away_score,
                    ))
                    matches_loaded += 1

                # Upsert rotation entry
                period = safe_int(row.get('rotation_period'))
                period_secs = safe_int(row.get('rotation_period_secs'))
                squad_id = row.get('rotation_squad_id')
                off_player_id = row.get('off_person_id') or None
                on_player_id = row.get('on_person_id') or None
                off_reason = row.get('off_reason', '')

                if squad_id and period is not None:
                    # Use empty string fallback for unique constraint (NULL != NULL in PG)
                    cur.execute("""
                        INSERT INTO cd_rotations (match_id, squad_id, period, period_secs, off_player_id, on_player_id, off_reason)
                        VALUES (%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT (match_id, squad_id, period, period_secs, off_player_id, on_player_id) DO NOTHING
                    """, (match_id, squad_id, period, period_secs,
                          off_player_id or '', on_player_id or '', off_reason))
                    rotations_loaded += 1

    print(f"Rotation matches upserted: {matches_loaded}, Rotations upserted: {rotations_loaded}")


def load_gps_match(cur):
    """Load GPS match-level stats. Also builds activity_id -> match_id mapping."""
    loaded = 0
    activity_to_match = {}

    for fname in GPS_MATCH_FILES:
        path = os.path.join(DATA_DIR, fname)
        if not os.path.exists(path):
            print(f"SKIP (not found): {fname}")
            continue

        print(f"Loading GPS match data from {fname}...")
        with open(path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                match_id = row.get('match_id', '')
                athlete_id = row.get('athlete_id', '')
                activity_id = row.get('activity_id', '')
                if not match_id or not athlete_id:
                    continue

                # Track activity_id -> match_id for quarter data
                if activity_id:
                    activity_to_match[activity_id] = match_id

                cur.execute("""
                    INSERT INTO cd_gps (match_id, player_name, jersey, position, round_number,
                        period_id, distance_m, hs_dist_m, sprints, player_load, max_vel,
                        m_per_min, hr_avg, hr_max, accels, decels, hmld, field_min,
                        activity_id, athlete_id)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (match_id, athlete_id, period_id) DO UPDATE SET
                        distance_m = EXCLUDED.distance_m,
                        hs_dist_m = EXCLUDED.hs_dist_m,
                        sprints = EXCLUDED.sprints,
                        player_load = EXCLUDED.player_load
                """, (
                    match_id, row.get('player', ''), safe_int(row.get('jersey')),
                    row.get('position', ''), row.get('round_number', ''),
                    'match',  # match-level aggregate
                    safe_numeric(row.get('gps_distance_m')), safe_numeric(row.get('gps_hs_dist_m')),
                    safe_int(row.get('gps_sprints')), safe_numeric(row.get('gps_player_load')),
                    safe_numeric(row.get('gps_max_vel')), safe_numeric(row.get('gps_m_per_min')),
                    safe_numeric(row.get('gps_hr_avg')), safe_numeric(row.get('gps_hr_max')),
                    safe_int(row.get('gps_accels')), safe_int(row.get('gps_decels')),
                    safe_numeric(row.get('gps_hmld')), safe_numeric(row.get('gps_field_min')),
                    activity_id, athlete_id,
                ))
                loaded += 1

    print(f"GPS match rows upserted: {loaded}")
    return activity_to_match


def load_gps_quarter(cur, activity_to_match):
    """Load GPS per-quarter stats, mapping activity_id to real match_id."""
    loaded = 0

    # Known manual mappings for activity_ids not in match-level GPS
    MANUAL_ACTIVITY_MAP = {
        "9793cf60-b001-4db3-a818-956f19d7b23e": "183255123",  # 2026 R5 HAW vs WB
    }
    activity_to_match.update(MANUAL_ACTIVITY_MAP)

    for fname in GPS_QUARTER_FILES:
        path = os.path.join(DATA_DIR, fname)
        if not os.path.exists(path):
            print(f"SKIP (not found): {fname}")
            continue

        print(f"Loading GPS quarter data from {fname}...")
        with open(path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                athlete_id = row.get('athlete_id', '')
                activity_id = row.get('activity_id', '')
                period_id = row.get('period_id', '')
                if not athlete_id or not activity_id:
                    continue

                # Resolve activity_id to real match_id
                match_id = activity_to_match.get(activity_id, activity_id)

                cur.execute("""
                    INSERT INTO cd_gps (match_id, player_name, jersey, position, round_number,
                        period_id, distance_m, hs_dist_m, sprints, player_load, max_vel,
                        m_per_min, hr_avg, hr_max, accels, decels, hmld, field_min,
                        activity_id, athlete_id)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (match_id, athlete_id, period_id) DO UPDATE SET
                        distance_m = EXCLUDED.distance_m,
                        hs_dist_m = EXCLUDED.hs_dist_m,
                        sprints = EXCLUDED.sprints,
                        player_load = EXCLUDED.player_load
                """, (
                    match_id,
                    row.get('player', ''), None, row.get('position', ''),
                    row.get('round', ''),
                    period_id,
                    safe_numeric(row.get('distance_m')), safe_numeric(row.get('hs_dist')),
                    safe_int(row.get('sprints')), safe_numeric(row.get('player_load')),
                    safe_numeric(row.get('max_vel')), safe_numeric(row.get('m_per_min')),
                    None, None,  # no HR data in quarter files
                    safe_int(row.get('accels')), safe_int(row.get('decels')),
                    safe_numeric(row.get('hmld')), safe_numeric(row.get('field_min')),
                    activity_id, athlete_id,
                ))
                loaded += 1

    print(f"GPS quarter rows upserted: {loaded}")


def load_combined_gps_stats(cur):
    """Load combined GPS + match stats from a single denormalized CSV."""
    cur.execute("""
        CREATE TABLE IF NOT EXISTS cd_player_match_stats (
            match_id TEXT,
            match_date TEXT,
            match_name TEXT,
            activity_id TEXT,
            activity_name TEXT,
            athlete_id TEXT,
            period_id TEXT,
            period_name TEXT,
            round_number TEXT,
            round_name TEXT,
            venue_name TEXT,
            player TEXT,
            jersey INT,
            position TEXT,
            gps_distance_m NUMERIC,
            gps_hs_dist_m NUMERIC,
            gps_sprints INT,
            gps_player_load NUMERIC,
            gps_max_vel NUMERIC,
            gps_m_per_min NUMERIC,
            gps_hr_avg NUMERIC,
            gps_hr_max NUMERIC,
            gps_accels INT,
            gps_decels INT,
            gps_hmld NUMERIC,
            gps_field_min NUMERIC,
            disposals NUMERIC,
            kicks NUMERIC,
            handballs NUMERIC,
            marks NUMERIC,
            tackles NUMERIC,
            clearances NUMERIC,
            free_kicks NUMERIC,
            pressure_acts NUMERIC,
            inside_50s NUMERIC,
            rebound_50s NUMERIC,
            metres_gained NUMERIC,
            turnovers NUMERIC,
            goals NUMERIC,
            behinds NUMERIC,
            time_on_ground NUMERIC,
            competition_id TEXT,
            UNIQUE(match_id, athlete_id, period_id)
        )
    """)
    add_column_if_missing(cur, 'cd_player_match_stats', 'competition_id', 'TEXT')

    fname = "studio_results_20260415_1718.csv"
    path = os.path.join(DATA_DIR, fname)
    if not os.path.exists(path):
        print(f"SKIP (not found): {fname}")
        return

    loaded = 0
    print(f"Loading combined GPS + match stats from {fname}...")
    with open(path, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            match_id = row.get('match_id', '')
            athlete_id = row.get('athlete_id', '')
            period_id = row.get('period_id', '')
            if not match_id or not athlete_id:
                continue

            cur.execute("""
                INSERT INTO cd_player_match_stats (
                    match_id, match_date, match_name, activity_id, activity_name,
                    athlete_id, period_id, period_name, round_number, round_name,
                    venue_name, player, jersey, position,
                    gps_distance_m, gps_hs_dist_m, gps_sprints, gps_player_load,
                    gps_max_vel, gps_m_per_min, gps_hr_avg, gps_hr_max,
                    gps_accels, gps_decels, gps_hmld, gps_field_min,
                    disposals, kicks, handballs, marks, tackles, clearances,
                    free_kicks, pressure_acts, inside_50s, rebound_50s,
                    metres_gained, turnovers, goals, behinds, time_on_ground,
                    competition_id
                ) VALUES (
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    %s
                )
                ON CONFLICT (match_id, athlete_id, period_id) DO UPDATE SET
                    match_date = EXCLUDED.match_date,
                    match_name = EXCLUDED.match_name,
                    activity_id = EXCLUDED.activity_id,
                    activity_name = EXCLUDED.activity_name,
                    period_name = EXCLUDED.period_name,
                    round_number = EXCLUDED.round_number,
                    round_name = EXCLUDED.round_name,
                    venue_name = EXCLUDED.venue_name,
                    player = EXCLUDED.player,
                    jersey = EXCLUDED.jersey,
                    position = EXCLUDED.position,
                    gps_distance_m = EXCLUDED.gps_distance_m,
                    gps_hs_dist_m = EXCLUDED.gps_hs_dist_m,
                    gps_sprints = EXCLUDED.gps_sprints,
                    gps_player_load = EXCLUDED.gps_player_load,
                    gps_max_vel = EXCLUDED.gps_max_vel,
                    gps_m_per_min = EXCLUDED.gps_m_per_min,
                    gps_hr_avg = EXCLUDED.gps_hr_avg,
                    gps_hr_max = EXCLUDED.gps_hr_max,
                    gps_accels = EXCLUDED.gps_accels,
                    gps_decels = EXCLUDED.gps_decels,
                    gps_hmld = EXCLUDED.gps_hmld,
                    gps_field_min = EXCLUDED.gps_field_min,
                    disposals = EXCLUDED.disposals,
                    kicks = EXCLUDED.kicks,
                    handballs = EXCLUDED.handballs,
                    marks = EXCLUDED.marks,
                    tackles = EXCLUDED.tackles,
                    clearances = EXCLUDED.clearances,
                    free_kicks = EXCLUDED.free_kicks,
                    pressure_acts = EXCLUDED.pressure_acts,
                    inside_50s = EXCLUDED.inside_50s,
                    rebound_50s = EXCLUDED.rebound_50s,
                    metres_gained = EXCLUDED.metres_gained,
                    turnovers = EXCLUDED.turnovers,
                    goals = EXCLUDED.goals,
                    behinds = EXCLUDED.behinds,
                    time_on_ground = EXCLUDED.time_on_ground,
                    competition_id = EXCLUDED.competition_id
            """, (
                match_id, row.get('match_date', ''), row.get('match_name', ''),
                row.get('activity_id', ''), row.get('activity_name', ''),
                athlete_id, period_id, row.get('period_name', ''),
                row.get('round_number', ''), row.get('round_name', ''),
                row.get('venue_name', ''), row.get('player', ''),
                safe_int(row.get('jersey')), row.get('position', ''),
                safe_numeric(row.get('gps_distance_m')), safe_numeric(row.get('gps_hs_dist_m')),
                safe_int(row.get('gps_sprints')), safe_numeric(row.get('gps_player_load')),
                safe_numeric(row.get('gps_max_vel')), safe_numeric(row.get('gps_m_per_min')),
                safe_numeric(row.get('gps_hr_avg')), safe_numeric(row.get('gps_hr_max')),
                safe_int(row.get('gps_accels')), safe_int(row.get('gps_decels')),
                safe_numeric(row.get('gps_hmld')), safe_numeric(row.get('gps_field_min')),
                safe_numeric(row.get('disposals')), safe_numeric(row.get('kicks')),
                safe_numeric(row.get('handballs')), safe_numeric(row.get('marks')),
                safe_numeric(row.get('tackles')), safe_numeric(row.get('clearances')),
                safe_numeric(row.get('free_kicks')), safe_numeric(row.get('pressure_acts')),
                safe_numeric(row.get('inside_50s')), safe_numeric(row.get('rebound_50s')),
                safe_numeric(row.get('metres_gained')), safe_numeric(row.get('turnovers')),
                safe_numeric(row.get('goals')), safe_numeric(row.get('behinds')),
                safe_numeric(row.get('time_on_ground')),
                row.get('competition_id', ''),
            ))
            loaded += 1

    print(f"Combined GPS + match stats rows upserted: {loaded}")


def main():
    conn = get_conn()
    cur = conn.cursor()

    try:
        create_tables(cur)
        conn.commit()
        print("Tables ready.")

        load_lineups(cur)
        conn.commit()

        load_rotations(cur)
        conn.commit()

        activity_map = load_gps_match(cur)
        conn.commit()

        load_gps_quarter(cur, activity_map)
        conn.commit()

        load_combined_gps_stats(cur)
        conn.commit()

        # Normalize match_status
        cur.execute("UPDATE cd_matches SET match_status = 'Complete' WHERE match_status = 'COMP'")
        conn.commit()

        # Print final counts
        for table in ['cd_matches', 'cd_lineups', 'cd_rotations', 'cd_gps', 'cd_player_match_stats']:
            cur.execute(f"SELECT count(*) FROM {table}")
            print(f"{table}: {cur.fetchone()[0]} total rows")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
