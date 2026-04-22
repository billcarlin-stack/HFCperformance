class ReadinessEngine:
    """
    Calculates a player's readiness score based on wellbeing metrics.
    """
    
    @staticmethod
    def calculate_readiness(sleep_score: int, soreness_score: int, stress_score: int) -> dict:
        """
        Calculates a % readiness score.
        Inputs are assumed to be 1-10 (10 being best state, e.g., low soreness, low stress, high sleep).
        
        Note: If inputs are 'raw' (e.g. soreness 10 = very sore), they should be inverted before passing here,
        or this logic adjusted.
        
        Assumed Input Scale (1-10):
        Sleep: 10 = Great sleep, 1 = Poor
        Soreness: 10 = No soreness (fresh), 1 = High soreness
        Stress: 10 = No stress (relaxed), 1 = High stress
        
        Weighted Formula:
        Sleep: 40%
        Soreness: 40%
        Stress: 20%
        """
        
        # Validation
        if not all(1 <= x <= 10 for x in [sleep_score, soreness_score, stress_score]):
            return {"error": "Inputs must be between 1 and 10", "score": 0, "status": "Data Error"}

        # Weighted Calculation
        weighted_score = (sleep_score * 0.4) + (soreness_score * 0.4) + (stress_score * 0.2)
        final_percentage = weighted_score * 10 # Convert 10-point scale to 100%
        
        # Determination
        status = "Green"
        if final_percentage < 60:
            status = "Red"
        elif final_percentage < 85:
            status = "Amber"
            
        return {
            "score": round(final_percentage, 1),
            "status": status,
            "breakdown": {
                "sleep_contribution": sleep_score * 0.4 * 10,
                "soreness_contribution": soreness_score * 0.4 * 10,
                "stress_contribution": stress_score * 0.2 * 10
            }
        }

    @staticmethod
    def get_form_trend(player_id: int):
        """
        Mock AI prediction for form trend.
        In production, this would call Vertex AI.
        """
        # Logic to be replaced by Vertex AI call
        import random
        trends = ["Rising", "Stable", "Declining", "Volatile"]
        return {
            "player_id": player_id,
            "trend": random.choice(trends),
            "confidence": f"{random.randint(75, 99)}%"
        }
