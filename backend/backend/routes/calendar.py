"""
The Hawk Hub — Calendar API Routes

Endpoints:
    GET  /api/calendar       — Get events
    POST /api/calendar       — Create an event (Coach only)
    DELETE /api/calendar/<id> — Delete an event
"""

import logging
from flask import Blueprint, jsonify, request
from models.calendar import create_event, get_events, delete_event
from auth.middleware import require_role

logger = logging.getLogger(__name__)

calendar_bp = Blueprint("calendar", __name__)

@calendar_bp.route("/calendar", methods=["GET"])
def list_calendar_events():
    """
    Returns calendar events.
    Query params: start_date, end_date, player_id
    """
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    player_id = request.args.get("player_id")
    
    if player_id:
        try:
            player_id = int(player_id)
        except ValueError:
            player_id = None

    try:
        events = get_events(start_date, end_date, player_id)
        # Format datetimes for JSON
        for e in events:
            if 'start_time' in e: e['start_time'] = e['start_time'].isoformat()
            if 'end_time' in e: e['end_time'] = e['end_time'].isoformat()
            if 'created_at' in e: e['created_at'] = e['created_at'].isoformat()
            
        return jsonify(events), 200
    except Exception as e:
        logger.error("Error listing calendar events: %s", str(e))
        return jsonify({"error": str(e)}), 500

@calendar_bp.route("/calendar", methods=["POST"])
@require_role("coach")
def post_calendar_event():
    """Creates a new calendar event."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing data"}), 400
        
    required = ["title", "type", "start_time", "end_time"]
    for r in required:
        if r not in data:
            return jsonify({"error": f"Missing required field: {r}"}), 400

    try:
        event = create_event(data)
        return jsonify(event), 201
    except Exception as e:
        logger.error("Error creating calendar event: %s", str(e))
        return jsonify({"error": str(e)}), 500

@calendar_bp.route("/calendar/<event_id>", methods=["DELETE"])
@require_role("coach")
def remove_calendar_event(event_id):
    """Deletes a calendar event."""
    try:
        delete_event(event_id)
        return jsonify({"status": "deleted"}), 200
    except Exception as e:
        logger.error("Error deleting calendar event: %s", str(e))
        return jsonify({"error": str(e)}), 500
