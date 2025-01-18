from flask import Blueprint, jsonify, current_app
from pymongo import MongoClient
from datetime import datetime, timedelta
from bson.objectid import ObjectId

leaderboard_bp = Blueprint("leaderboard", __name__)

def get_db():
    client = MongoClient(current_app.config["MONGODB_URI"])
    return client[current_app.config["MONGODB_DB"]]

def calculate_focus_score(activities):
    if not activities:
        return 0.0
    focus_activities = sum(1 for act in activities if act['eventType'] in ['ide', 'terminal', 'keyboard'])
    return (focus_activities / len(activities)) * 100

@leaderboard_bp.route("/leaderboard/daily", methods=["GET"])
def get_daily_leaderboard():
    db = get_db()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    # Aggregate daily coding time and focus score
    pipeline = [
        {
            "$match": {
                "startTime": {"$gte": today, "$lt": tomorrow},
                "status": {"$in": ["stopped", "idle"]}
            }
        },
        {
            "$lookup": {
                "from": "activity_events",
                "localField": "_id",
                "foreignField": "sessionId",
                "as": "activities"
            }
        },
        {
            "$group": {
                "_id": "$engineerId",
                "codingTime": {"$sum": "$focusTime"},
                "activities": {"$push": "$activities"}
            }
        },
        {"$sort": {"codingTime": -1}},
        {"$limit": 10}
    ]

    rankings = []
    results = list(db.monitoring_sessions.aggregate(pipeline))
    
    for result in results:
        # Calculate focus score from activities
        all_activities = [act for session_acts in result["activities"] for act in session_acts]
        focus_score = calculate_focus_score(all_activities)
        
        # Get achievements for the day
        achievements = list(db.achievements.find({
            "engineerId": result["_id"],
            "earnedAt": {"$gte": today, "$lt": tomorrow}
        }))
        
        rankings.append({
            "engineerId": result["_id"],
            "codingTime": result["codingTime"],
            "focusScore": focus_score,
            "achievements": [ach["badge"] for ach in achievements]
        })

    # Store in leaderboard collection
    db.leaderboard.replace_one(
        {"type": "daily_coding_time", "date": today},
        {
            "type": "daily_coding_time",
            "date": today,
            "rankings": rankings
        },
        upsert=True
    )

    return jsonify(rankings), 200

@leaderboard_bp.route("/leaderboard/weekly", methods=["GET"])
def get_weekly_leaderboard():
    db = get_db()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=7)

    pipeline = [
        {
            "$match": {
                "startTime": {"$gte": week_start, "$lt": week_end},
                "status": {"$in": ["stopped", "idle"]}
            }
        },
        {
            "$lookup": {
                "from": "activity_events",
                "localField": "_id",
                "foreignField": "sessionId",
                "as": "activities"
            }
        },
        {
            "$group": {
                "_id": "$engineerId",
                "codingTime": {"$sum": "$focusTime"},
                "activities": {"$push": "$activities"}
            }
        },
        {"$sort": {"codingTime": -1}},
        {"$limit": 10}
    ]

    rankings = []
    results = list(db.monitoring_sessions.aggregate(pipeline))
    
    for result in results:
        all_activities = [act for session_acts in result["activities"] for act in session_acts]
        focus_score = calculate_focus_score(all_activities)
        
        achievements = list(db.achievements.find({
            "engineerId": result["_id"],
            "earnedAt": {"$gte": week_start, "$lt": week_end}
        }))
        
        rankings.append({
            "engineerId": result["_id"],
            "codingTime": result["codingTime"],
            "focusScore": focus_score,
            "achievements": [ach["badge"] for ach in achievements]
        })

    # Store in leaderboard collection
    db.leaderboard.replace_one(
        {"type": "weekly_coding_time", "date": week_start},
        {
            "type": "weekly_coding_time",
            "date": week_start,
            "rankings": rankings
        },
        upsert=True
    )

    return jsonify(rankings), 200

@leaderboard_bp.route("/personal-bests/<engineer_id>", methods=["GET"])
def get_personal_bests(engineer_id):
    db = get_db()
    personal_bests = db.personal_bests.find_one({"engineerId": engineer_id})
    
    if not personal_bests:
        personal_bests = {
            "engineerId": engineer_id,
            "metrics": {
                "dailyCodingTime": 0,
                "weeklyFocusScore": 0.0,
                "longestFocusStreak": 0
            },
            "lastUpdated": datetime.utcnow()
        }
        db.personal_bests.insert_one(personal_bests)
    
    personal_bests["_id"] = str(personal_bests["_id"])
    return jsonify(personal_bests), 200

def update_personal_bests(engineer_id, session_data, activities):
    db = get_db()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get daily coding time
    daily_sessions = db.monitoring_sessions.find({
        "engineerId": engineer_id,
        "startTime": {"$gte": today},
        "status": {"$in": ["stopped", "idle"]}
    })
    
    daily_coding_time = sum(session.get("focusTime", 0) for session in daily_sessions)
    
    # Calculate current focus streak
    focus_events = [act for act in activities if act["eventType"] in ["ide", "terminal", "keyboard"]]
    if focus_events:
        focus_events.sort(key=lambda x: x["timestamp"])
        current_streak = max(
            (focus_events[i+1]["timestamp"] - focus_events[i]["timestamp"]).total_seconds()
            for i in range(len(focus_events)-1)
        )
    else:
        current_streak = 0
    
    # Update personal bests
    db.personal_bests.update_one(
        {"engineerId": engineer_id},
        {
            "$max": {
                "metrics.dailyCodingTime": daily_coding_time,
                "metrics.longestFocusStreak": current_streak
            },
            "$set": {"lastUpdated": datetime.utcnow()}
        },
        upsert=True
    )
