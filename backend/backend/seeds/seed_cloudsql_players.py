"""
The Hawk Hub — Cloud SQL Seed Script
Populates the PostgreSQL 'players_2026' table with the player roster.
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.players import Player
from db.cloudsql_client import Base

# Configuration
DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/hfc_dev"
)

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

def seed_cloudsql():
    print(f"Connecting to: {DATABASE_URL.split('@')[-1]}") # Log host only for safety
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Clear existing
        session.query(Player).delete()
        print("Cleared existing players.")
        
        # Add players
        for p_data in PLAYERS_DATA:
            player = Player(
                jumper_no=p_data['jumper_no'],
                name=p_data['name'],
                age=p_data['age'],
                height_cm=p_data['height_cm'],
                weight_kg=80, # Default
                games=p_data['games'],
                position=p_data['position'],
                status=p_data['status']
            )
            session.add(player)
        
        session.commit()
        print(f"Successfully seeded {len(PLAYERS_DATA)} players.")
    except Exception as e:
        session.rollback()
        print(f"Error seeding Cloud SQL: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    seed_cloudsql()
