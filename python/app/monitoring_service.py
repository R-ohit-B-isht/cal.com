from flask import Blueprint, request, jsonify, current_app
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime, timedelta
import uuid

monitoring_bp = Blueprint("monitoring", __name__)

def get_db():
    client = MongoClient(current_app.config["MONGODB_URI"])
    return client[current_app.config["MONGODB_DB"]]

@monitoring_bp.route("/monitoring/start-time", methods=["POST"])
def start_time():
    """Start a new monitoring session for an engineer."""
    db = get_db()
    data = request.json

    if not data or 'engineerId' not in data:
        return jsonify({"error": "engineerId is required"}), 400

    # Create a new monitoring session
    session = {
        "engineerId": data["engineerId"],
        "startTime": datetime.utcnow(),
        "status": "running",
        "focusTime": 0,
        "idleTime": 0,
        "productivityScore": 0.0
    }

    try:
        result = db.monitoring_sessions.insert_one(session)
        return jsonify({
            "message": "Time tracking started",
            "sessionId": str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@monitoring_bp.route("/monitoring/stop-time", methods=["POST"])
def stop_time():
    """Stop an active monitoring session."""
    db = get_db()
    data = request.json

    if not data or 'sessionId' not in data:
        return jsonify({"error": "sessionId is required"}), 400

    try:
        # Find and update the session
        end_time = datetime.utcnow()
        result = db.monitoring_sessions.update_one(
            {
                "_id": ObjectId(data["sessionId"]),
                "status": "running"
            },
            {
                "$set": {
                    "status": "stopped",
                    "endTime": end_time
                }
            }
        )

        if result.modified_count == 0:
            return jsonify({"error": "No active session found"}), 404

        # Calculate final metrics for the session
        session = db.monitoring_sessions.find_one({"_id": ObjectId(data["sessionId"])})
        total_duration = (end_time - session["startTime"]).total_seconds()
        
        # Update session with final calculations
        db.monitoring_sessions.update_one(
            {"_id": ObjectId(data["sessionId"])},
            {
                "$set": {
                    "totalDuration": total_duration,
                    "productivityScore": (session.get("focusTime", 0) / total_duration * 100) if total_duration > 0 else 0
                }
            }
        )

        return jsonify({
            "message": "Time tracking stopped",
            "duration": total_duration
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@monitoring_bp.route("/monitoring/sessions/<engineer_id>", methods=["GET"])
def get_sessions(engineer_id):
    """Get all monitoring sessions for an engineer."""
    db = get_db()
    try:
        sessions = list(db.monitoring_sessions.find({"engineerId": engineer_id}))
        # Convert ObjectId to string for JSON serialization
        for session in sessions:
            session["_id"] = str(session["_id"])
        return jsonify(sessions), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@monitoring_bp.route("/monitoring/session/<session_id>", methods=["GET"])
def get_session(session_id):
    """Get details of a specific monitoring session."""
    db = get_db()
    try:
        session = db.monitoring_sessions.find_one({"_id": ObjectId(session_id)})
        if not session:
            return jsonify({"error": "Session not found"}), 404
        session["_id"] = str(session["_id"])
        return jsonify(session), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@monitoring_bp.route("/monitoring/activity", methods=["POST"])
def record_activity():
    """Record an activity event (keyboard/mouse/terminal usage)."""
    db = get_db()
    data = request.json

    required_fields = ['engineerId', 'sessionId', 'eventType']
    if not data or not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    if data['eventType'] not in ['keyboard', 'mouse', 'ide', 'terminal', 'meeting', 'break']:
        return jsonify({"error": "Invalid event type"}), 400

    # Determine focus level based on activity type
    focus_activities = ['ide', 'terminal']
    is_focus_activity = data['eventType'] in focus_activities
    
    event = {
        "engineerId": data["engineerId"],
        "sessionId": data["sessionId"],
        "timestamp": datetime.utcnow(),
        "eventType": data["eventType"],
        "focusLevel": "coding" if is_focus_activity else "other",
        "metadata": data.get("metadata", {})
    }

    try:
        # Record the activity event
        db.activity_events.insert_one(event)

        # Calculate focus time increment
        focus_time_increment = 60 if is_focus_activity else 0  # 60 seconds for each focus activity

        # Update the session's metrics
        db.monitoring_sessions.update_one(
            {"_id": ObjectId(data["sessionId"])},
            {
                "$set": {
                    "lastActivityAt": datetime.utcnow(),
                    "status": "running"
                },
                "$inc": {
                    "focusTime": focus_time_increment,
                    "totalActivityCount": 1,
                    "focusActivityCount": 1 if is_focus_activity else 0
                }
            }
        )

        return jsonify({"message": "Activity recorded"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def calculate_productivity_score(focus_time, total_duration, focus_activities, total_activities):
    """Calculate productivity score based on focus time and activity ratios."""
    if total_duration == 0 or total_activities == 0:
        return 0.0
    
    # Weight factors for different metrics
    time_weight = 0.6
    activity_weight = 0.4
    
    # Calculate individual scores
    time_score = (focus_time / total_duration) * 100
    activity_score = (focus_activities / total_activities) * 100
    
    # Calculate weighted average
    return (time_score * time_weight) + (activity_score * activity_weight)

@monitoring_bp.route("/monitoring/alerts/<engineer_id>", methods=["GET"])
def get_alerts(engineer_id):
    """Get alerts for an engineer."""
    db = get_db()
    try:
        alerts = list(db.monitoring_alerts.find(
            {"engineerId": engineer_id}
        ).sort("createdAt", -1))
        
        # Convert ObjectId to string for JSON serialization
        for alert in alerts:
            alert["_id"] = str(alert["_id"])
            
        return jsonify({
            "alerts": alerts,
            "totalCount": len(alerts)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@monitoring_bp.route("/monitoring/alerts/<alert_id>/read", methods=["POST"])
def mark_alert_read(alert_id):
    """Mark an alert as read."""
    db = get_db()
    try:
        result = db.monitoring_alerts.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {"readAt": datetime.utcnow()}}
        )
        if result.modified_count == 0:
            return jsonify({"error": "Alert not found"}), 404
        return jsonify({"message": "Alert marked as read"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def check_and_award_badges(db, engineer_id, session):
    """Check conditions and award achievement badges."""
    current_time = datetime.utcnow()
    
    # Calculate metrics
    total_duration = 0
    if session.get("endTime"):
        total_duration = (session["endTime"] - session["startTime"]).total_seconds()
    else:
        total_duration = (current_time - session["startTime"]).total_seconds()
    
    focus_time = session.get("focusTime", 0)
    total_activities = session.get("totalActivityCount", 0)
    focus_activities = session.get("focusActivityCount", 0)
    
    productivity_score = calculate_productivity_score(
        focus_time, total_duration,
        focus_activities, total_activities
    )
    
    # Define badge criteria
    badge_criteria = {
        "Daily Goal": productivity_score >= 80,  # High productivity
        "Focus Master": focus_time >= 14400,     # 4 hours of focus time
        "Code Warrior": focus_activities >= 100,  # Many coding activities
        "Early Bird": session["startTime"].hour < 9,  # Started before 9 AM
        "Team Player": total_activities >= 200    # High overall activity
    }
    
    # Check and award badges
    awarded_badges = []
    for badge, condition in badge_criteria.items():
        if condition:
            # Check if badge already awarded today
            today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
            existing_badge = db.achievements.find_one({
                "engineerId": engineer_id,
                "badge": badge,
                "earnedAt": {"$gte": today_start}
            })
            
            if not existing_badge:
                db.achievements.insert_one({
                    "engineerId": engineer_id,
                    "badge": badge,
                    "earnedAt": current_time,
                    "metadata": {
                        "sessionId": str(session["_id"]),
                        "productivityScore": productivity_score,
                        "focusTime": focus_time,
                        "totalActivities": total_activities
                    }
                })
                awarded_badges.append(badge)
    
    return awarded_badges

@monitoring_bp.route("/monitoring/focus-metrics/<session_id>", methods=["GET"])
def get_focus_metrics(session_id):
    """Get focus time metrics for a specific session."""
    db = get_db()
    try:
        session = db.monitoring_sessions.find_one({"_id": ObjectId(session_id)})
        if not session:
            return jsonify({"error": "Session not found"}), 404

        total_duration = 0
        if session.get("endTime"):
            total_duration = (session["endTime"] - session["startTime"]).total_seconds()
        elif session["status"] != "stopped":
            total_duration = (datetime.utcnow() - session["startTime"]).total_seconds()

        focus_time = session.get("focusTime", 0)
        total_activities = session.get("totalActivityCount", 0)
        focus_activities = session.get("focusActivityCount", 0)

        # Calculate productivity score
        productivity_score = calculate_productivity_score(
            focus_time, total_duration,
            focus_activities, total_activities
        )
        
        # Check and award badges
        awarded_badges = check_and_award_badges(db, session["engineerId"], session)
        
        metrics = {
            "focusTimeSeconds": focus_time,
            "focusTimePercentage": (focus_time / total_duration * 100) if total_duration > 0 else 0,
            "totalActivities": total_activities,
            "focusActivities": focus_activities,
            "focusActivityRatio": (focus_activities / total_activities * 100) if total_activities > 0 else 0,
            "productivityScore": productivity_score,
            "newBadges": awarded_badges
        }

        return jsonify(metrics), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@monitoring_bp.route("/monitoring/achievements/<engineer_id>", methods=["GET"])
def get_achievements(engineer_id):
    """Get all achievements for an engineer."""
    db = get_db()
    try:
        achievements = list(db.achievements.find(
            {"engineerId": engineer_id},
            {"_id": 0}  # Exclude MongoDB ID
        ).sort("earnedAt", -1))  # Sort by most recent first
        
        # Group achievements by type
        grouped = {}
        for achievement in achievements:
            badge = achievement["badge"]
            if badge not in grouped:
                grouped[badge] = []
            grouped[badge].append(achievement)
        
        return jsonify({
            "achievements": achievements,
            "groupedByBadge": grouped,
            "totalCount": len(achievements)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@monitoring_bp.route("/monitoring/check-idle", methods=["POST"])
def check_idle():
    """Check and update idle status for active sessions."""
    db = get_db()
    data = request.json

    if not data or 'sessionId' not in data:
        return jsonify({"error": "sessionId is required"}), 400

    try:
        session = db.monitoring_sessions.find_one({"_id": ObjectId(data["sessionId"])})
        if not session:
            return jsonify({"error": "Session not found"}), 404

        current_time = datetime.utcnow()
        last_activity = session.get("lastActivityAt", session["startTime"])
        idle_threshold = 300  # 5 minutes in seconds

        # Calculate idle time
        idle_seconds = (current_time - last_activity).total_seconds()
        
        if idle_seconds >= idle_threshold and session["status"] != "idle":
            # Update session status to idle
            db.monitoring_sessions.update_one(
                {"_id": ObjectId(data["sessionId"])},
                {
                    "$set": {
                        "status": "idle",
                        "idleTime": session.get("idleTime", 0) + idle_seconds
                    }
                }
            )
            return jsonify({
                "message": "Session marked as idle",
                "idleTime": idle_seconds
            }), 200

        return jsonify({
            "message": "Session active",
            "idleTime": session.get("idleTime", 0)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@monitoring_bp.route("/monitoring/discard-idle-time", methods=["POST"])
def discard_idle_time():
    """Discard idle time intervals from a session."""
    db = get_db()
    data = request.json

    if not data or 'sessionId' not in data:
        return jsonify({"error": "sessionId is required"}), 400

    try:
        session = db.monitoring_sessions.find_one({"_id": ObjectId(data["sessionId"])})
        if not session:
            return jsonify({"error": "Session not found"}), 404

        # Get all activities in chronological order
        activities = list(db.activity_events.find(
            {"sessionId": data["sessionId"]}
        ).sort("timestamp", 1))

        if not activities:
            return jsonify({"message": "No activities found"}), 200

        idle_intervals = []
        total_idle_time = 0
        idle_threshold = timedelta(minutes=15)

        # Find idle intervals
        for i in range(len(activities) - 1):
            time_gap = activities[i + 1]["timestamp"] - activities[i]["timestamp"]
            if time_gap > idle_threshold:
                idle_intervals.append({
                    "start": activities[i]["timestamp"],
                    "end": activities[i + 1]["timestamp"],
                    "duration": time_gap.total_seconds()
                })
                total_idle_time += time_gap.total_seconds()

        # Update session metrics
        if idle_intervals:
            db.monitoring_sessions.update_one(
                {"_id": ObjectId(data["sessionId"])},
                {
                    "$inc": {
                        "idleTime": total_idle_time,
                        "focusTime": -total_idle_time
                    },
                    "$set": {
                        "lastIdleDiscard": datetime.utcnow()
                    }
                }
            )

        return jsonify({
            "message": "Idle time discarded",
            "idleIntervals": len(idle_intervals),
            "totalIdleTime": total_idle_time
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@monitoring_bp.route("/monitoring/meeting-time/<engineer_id>", methods=["GET"])
def get_meeting_time(engineer_id):
    """Get daily meeting time for an engineer."""
    db = get_db()
    try:
        # Get today's date range
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)

        # Get all meeting activities for today
        meeting_activities = db.activity_events.find({
            "engineerId": engineer_id,
            "eventType": "meeting",
            "timestamp": {"$gte": today, "$lt": tomorrow}
        })

        total_meeting_time = 0
        meeting_count = 0

        for activity in meeting_activities:
            if "duration" in activity.get("metadata", {}):
                total_meeting_time += activity["metadata"]["duration"]
                meeting_count += 1

        return jsonify({
            "totalMeetingTime": total_meeting_time,
            "meetingCount": meeting_count,
            "date": today.isoformat()
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
