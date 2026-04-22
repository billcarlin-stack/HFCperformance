import os
import csv
import logging
from sqlalchemy import text
import sys

# Add parent directory to path so we can import from db and models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.cloudsql_client import get_engine, get_session
from models.players import Player

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def alter_table(engine):
    with engine.connect() as conn:
        columns = [
            "grade VARCHAR(50)",
            "dob VARCHAR(50)",
            "games_prior INT DEFAULT 0",
            "goals_prior INT DEFAULT 0",
            "coach_votes_prior INT DEFAULT 0",
            "blow_votes_prior INT DEFAULT 0",
            "games_2026 INT DEFAULT 0",
            "goals_2026 INT DEFAULT 0",
            "coach_votes_2026 INT DEFAULT 0",
            "blow_votes_2026 INT DEFAULT 0",
            "games_total INT DEFAULT 0",
            "goals_total INT DEFAULT 0",
            "coach_votes_total INT DEFAULT 0",
            "blow_votes_total INT DEFAULT 0",
            "drafted VARCHAR(255)",
            "honours TEXT"
        ]
        for col_def in columns:
            col_name = col_def.split()[0]
            try:
                # Add columns safely
                conn.execute(text(f"ALTER TABLE players_2026 ADD COLUMN IF NOT EXISTS {col_name} {col_def.split(' ', 1)[1]};"))
                logger.info(f"Ensured column {col_name} exists.")
            except Exception as e:
                logger.warning(f"Could not add {col_name}: {e}")
        conn.commit()

def import_data(tsv_path):
    engine = get_engine()
    alter_table(engine)
    
    session = get_session()
    try:
        with open(tsv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter='\t')
            for row in reader:
                try:
                    jumper = int(row['Jumper'].strip())
                except ValueError:
                    continue  # Skip rows without valid jumper
                
                player = session.query(Player).filter(Player.jumper_no == jumper).first()
                if player:
                    def parse_int(val):
                        try:
                            return int(val.strip())
                        except (ValueError, TypeError):
                            return 0

                    player.grade = row.get('Grade', '').strip()
                    player.dob = row.get('DOB', '').strip()
                    
                    # Core biological/profile data
                    if row.get('Age'):
                        player.age = parse_int(row['Age'].replace('yr', '').strip())
                    if row.get('Height'):
                        player.height_cm = parse_int(row['Height'].replace('cm', '').strip())
                    if row.get('Weight'):
                        player.weight_kg = parse_int(row['Weight'].replace('kg', '').strip())

                    player.games_prior = parse_int(row.get('Games_Prior', 0))
                    player.goals_prior = parse_int(row.get('Goals_Prior', 0))
                    player.coach_votes_prior = parse_int(row.get('Coach_Votes_Prior', 0))
                    player.blow_votes_prior = parse_int(row.get('Blow_Votes_Prior', 0))
                    
                    player.games_2026 = parse_int(row.get('Games_2026', 0))
                    player.goals_2026 = parse_int(row.get('Goals_2026', 0))
                    player.coach_votes_2026 = parse_int(row.get('Coach_Votes_2026', 0))
                    player.blow_votes_2026 = parse_int(row.get('Blow_Votes_2026', 0))

                    player.games_total = parse_int(row.get('Games_Total', 0))
                    # Also map total games to the core 'games' property used all around the app
                    player.games = player.games_total
                    
                    player.goals_total = parse_int(row.get('Goals_Total', 0))
                    player.coach_votes_total = parse_int(row.get('Coach_Votes_Total', 0))
                    player.blow_votes_total = parse_int(row.get('Blow_Votes_Total', 0))
                    
                    # Original_Club we map to originally_from if Originally_From is empty, 
                    # but let's just keep the original as originally_from inside the DB.
                    if row.get('Original_Club') and not player.originally_from:
                         player.originally_from = row.get('Original_Club').strip()
                         
                    player.drafted = row.get('Drafted', '').strip()
                    player.honours = row.get('Honours', '').strip()
                    
        session.commit()
        logger.info("Successfully imported career data to DB.")
    except Exception as e:
        session.rollback()
        logger.error(f"Error importing: {e}")
    finally:
        session.close()

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    tsv_path = os.path.join(os.path.dirname(script_dir), "player_career_data.tsv")
    import_data(tsv_path)
