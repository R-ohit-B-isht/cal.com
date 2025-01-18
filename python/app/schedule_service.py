from flask import Blueprint, request, jsonify, current_app
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime, timedelta
import threading
import time

schedule_bp = Blueprint("schedule", __name__)

def get_db():
    client = MongoClient(current_app.config["MONGODB_URI"])
    return client[current_app.config["MONGODB_DB"]]

@schedule_bp.route("/monitoring/schedule-limits", methods=["POST"])
def set_schedule_limits():
    """Set daily and weekly hour limits for an engineer."""
    db = get_db()
    data = request.json

    if not data or 'engineerId' not in data:
        return jsonify({"error": "engineerId is required"}), 400

    required_fields = ['dailyHourLimit', 'weeklyHourLimit']
    if not all(field in data for field in required_fields):
        return jsonify({"error": f"Missing required fields: {', '.join(required_fields)}"}), 400

    try:
        # Validate hour limits
        if not (1 <= data['dailyHourLimit'] <= 24):
            return jsonify({"error": "Daily hour limit must be between 1 and 24"}), 400
        if not (1 <= data['weeklyHourLimit'] <= 168):
            return jsonify({"error": "Weekly hour limit must be between 1 and 168"}), 400
        if data['weeklyHourLimit'] < data['dailyHourLimit']:
            return jsonify({"error": "Weekly limit cannot be less than daily limit"}), 400

        # Set default alert threshold if not provided
        if 'alertThreshold' not in data:
            data['alertThreshold'] = 80  # 80% of limit

        # Update or create schedule limits
        result = db.schedule_limits.update_one(
            {"engineerId": data["engineerId"]},
            {"$set": {
                "dailyHourLimit": data["dailyHourLimit"],
                "weeklyHourLimit": data["weeklyHourLimit"],
                "alertThreshold": data["alertThreshold"],
                "updatedAt": datetime.utcnow()
            }},
            upsert=True
        )

        return jsonify({
            "message": "Schedule limits updated successfully",
            "updated": result.modified_count > 0,
            "created": result.upserted_id is not None
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@schedule_bp.route("/monitoring/schedule-limits/<engineer_id>", methods=["GET"])
def get_schedule_limits(engineer_id):
    """Get schedule limits for an engineer."""
    db = get_db()
    try:
        limits = db.schedule_limits.find_one({"engineerId": engineer_id})
        if not limits:
            return jsonify({"error": "No schedule limits found"}), 404

        limits["_id"] = str(limits["_id"])
        return jsonify(limits), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def calculate_usage(db, engineer_id, start_time, end_time):
    """Calculate total work hours between start_time and end_time."""
    sessions = db.monitoring_sessions.find({
        "engineerId": engineer_id,
        "startTime": {"$gte": start_time, "$lte": end_time},
        "status": "stopped"
    })

    total_hours = 0
    for session in sessions:
        duration = (session.get("endTime", end_time) - session["startTime"]).total_seconds()
        total_hours += duration / 3600  # Convert seconds to hours

    return total_hours

def check_limits_and_alert(app):
    """Background task to check usage against limits and generate alerts."""
    with app.app_context():
        db = get_db()
        
        while True:
            try:
                # Get all engineers with schedule limits
                limits = db.schedule_limits.find({})
                
                for limit in limits:
                    engineer_id = limit["engineerId"]
                    now = datetime.utcnow()
                    
                    # Check daily usage
                    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    daily_hours = calculate_usage(db, engineer_id, day_start, now)
                    daily_limit = limit["dailyHourLimit"]
                    
                    # Check weekly usage
                    week_start = day_start - timedelta(days=now.weekday())
                    weekly_hours = calculate_usage(db, engineer_id, week_start, now)
                    weekly_limit = limit["weeklyHourLimit"]
                    
                    # Calculate percentages
                    daily_percentage = (daily_hours / daily_limit) * 100
                    weekly_percentage = (weekly_hours / weekly_limit) * 100
                    threshold = limit.get("alertThreshold", 80)
                    
                    # Generate alerts if needed
                    alerts = []
                    if daily_percentage >= threshold:
                        alerts.append({
                            "engineerId": engineer_id,
                            "type": "daily_limit",
                            "message": f"Daily work hours ({daily_hours:.1f}h) have reached {daily_percentage:.1f}% of limit ({daily_limit}h)",
                            "percentage": daily_percentage,
                            "createdAt": now
                        })
                    
                    if weekly_percentage >= threshold:
                        alerts.append({
                            "engineerId": engineer_id,
                            "type": "weekly_limit",
                            "message": f"Weekly work hours ({weekly_hours:.1f}h) have reached {weekly_percentage:.1f}% of limit ({weekly_limit}h)",
                            "percentage": weekly_percentage,
                            "createdAt": now
                        })
                    
                    # Store alerts in database
                    if alerts:
                        db.monitoring_alerts.insert_many(alerts)
                
            except Exception as e:
                print(f"Error in check_limits_and_alert: {str(e)}")
            
            # Sleep for 5 minutes before next check
            time.sleep(300)

def start_monitoring_thread(app):
    """Start the background monitoring thread."""
    thread = threading.Thread(target=check_limits_and_alert, args=(app,), daemon=True)
    thread.start()
