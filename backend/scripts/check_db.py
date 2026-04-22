import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.cloudsql_client import get_session
from models.players import Player

session = get_session()
try:
    p = session.query(Player).filter_by(jumper_no=3).first()
    print("Newcombe Grade:", p.grade)
    print("Newcombe Total Votes:", p.coach_votes_total)
    print("Newcombe Drafted:", p.drafted)
    print("Newcombe Honours:", p.honours)
    print("Newcombe Total Games:", p.games_total)
finally:
    session.close()
