import logging
from flask import Blueprint, jsonify, request
from models.players import Player
from models.wellbeing import WellbeingSurvey
from models.injuries import InjuryLog
from models.idp_ratings import IdpRating
from db.alloydb_client import get_session
from sqlalchemy import func

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/ask', methods=['POST'])
def ask_hawk():
    data = request.json
    question = data.get('question', '').lower()
    
    session = get_session()
    
    # Simple logic engine to mimic AI behavior by querying AlloyDB
    try:
        if 'sleep' in question or 'energy' in question:
            # Join WellbeingSurvey and Player to get names of those with lowest sleep
            # Get the latest submission date
            latest_date = session.query(func.max(WellbeingSurvey.submitted_at)).scalar()
            
            if latest_date:
                results = session.query(Player.name, WellbeingSurvey.sleep_score) \
                    .join(WellbeingSurvey, Player.jumper_no == WellbeingSurvey.player_id) \
                    .filter(WellbeingSurvey.submitted_at == latest_date) \
                    .order_by(WellbeingSurvey.sleep_score.asc()) \
                    .limit(3).all()
                
                if results:
                    names = ", ".join([r[0] for r in results])
                    response = f"Current wellbeing data shows {names} had the lowest sleep scores. Might be worth checking in."
                else:
                    response = "I'm not seeing any wellbeing surveys submitted yet today."
            else:
                response = "No wellbeing data found."
            
        elif 'injury' in question or 'hurt' in question or 'medical' in question:
            count = session.query(InjuryLog).filter(InjuryLog.status == 'Active').count()
            response = f"Hawk here! We currently have {count} active injuries in the rehab group."
            
        elif 'rating' in question or 'best' in question:
            result = session.query(Player.name, IdpRating.coach_rating) \
                .join(IdpRating, Player.jumper_no == IdpRating.jumper_no) \
                .order_by(IdpRating.coach_rating.desc()) \
                .first()
            
            if result:
                name, score = result
                response = f"According to the latest coach surveys, {name} is leading the squad with a rating of {score}. Their training intensity has been elite."
            else:
                response = "No performance ratings have been logged yet for the current period."
            
        else:
            response = "That's a great question! I'm scanning the Hawk Hub data for you. Training readiness is looking solid across the group."

        return jsonify({
            "answer": response,
            "suggestions": [
                "Who had the lowest sleep?",
                "What is our injury status?",
                "Who is training best?"
            ]
        })

    except Exception as e:
        logger.error(f"AI Error: {e}")
        return jsonify({"answer": "I'm having trouble connecting to the data lake right now, but I'll keep trying!", "suggestions": []})
    finally:
        session.close()
