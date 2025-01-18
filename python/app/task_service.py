from flask import Blueprint, request, jsonify, current_app
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime

tasks_bp = Blueprint("tasks", __name__)

def get_db():
    client = MongoClient(current_app.config["MONGODB_URI"])
    return client[current_app.config["MONGODB_DB"]]

@tasks_bp.route("/tasks", methods=["GET"])
def get_tasks():
    db = get_db()
    filters = {}
    
    # Basic filters
    status = request.args.get("status")
    integration = request.args.get("integration")
    priority = request.args.get("priority")
    search = request.args.get("search")
    assignee = request.args.get("assignee")
    labels = request.args.getlist("labels[]")
    
    # Date range filters
    created_at_from = request.args.get("createdAtFrom")
    created_at_to = request.args.get("createdAtTo")
    updated_at_from = request.args.get("updatedAtFrom")
    updated_at_to = request.args.get("updatedAtTo")
    
    # Advanced search filters
    advanced_title = request.args.get("advanced_title")
    advanced_description = request.args.get("advanced_description")
    advanced_source_url = request.args.get("advanced_sourceUrl")
    
    # Relationship filters
    has_blocking_tasks = request.args.get("hasBlockingTasks")
    is_blocking_others = request.args.get("isBlockingOthers")
    blocked_only = request.args.get("blockedOnly")
    
    # Apply basic filters
    if status:
        filters["status"] = status
    if integration:
        filters["integration"] = integration
    if priority:
        filters["priority"] = priority
    if assignee:
        filters["assignee"] = assignee
    if labels:
        filters["labels"] = {"$in": labels}
        
    # Apply search filters
    search_conditions = []
    if search:
        search_conditions.extend([
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ])
    if advanced_title:
        search_conditions.append({"title": {"$regex": advanced_title, "$options": "i"}})
    if advanced_description:
        search_conditions.append({"description": {"$regex": advanced_description, "$options": "i"}})
    if advanced_source_url:
        search_conditions.append({"sourceUrl": {"$regex": advanced_source_url, "$options": "i"}})
    if search_conditions:
        filters["$or"] = search_conditions
        
    # Apply date range filters
    date_conditions = {}
    if created_at_from or created_at_to:
        date_conditions["createdAt"] = {}
        if created_at_from:
            date_conditions["createdAt"]["$gte"] = datetime.fromisoformat(created_at_from.replace('Z', '+00:00'))
        if created_at_to:
            date_conditions["createdAt"]["$lte"] = datetime.fromisoformat(created_at_to.replace('Z', '+00:00'))
    if updated_at_from or updated_at_to:
        date_conditions["updatedAt"] = {}
        if updated_at_from:
            date_conditions["updatedAt"]["$gte"] = datetime.fromisoformat(updated_at_from.replace('Z', '+00:00'))
        if updated_at_to:
            date_conditions["updatedAt"]["$lte"] = datetime.fromisoformat(updated_at_to.replace('Z', '+00:00'))
    filters.update(date_conditions)
    
    # Apply relationship filters
    if has_blocking_tasks == "true":
        blocking_relationships = list(db.relationships.find({"type": "blocks", "targetTaskId": {"$exists": True}}))
        blocking_task_ids = [rel["targetTaskId"] for rel in blocking_relationships]
        filters["_id"] = {"$in": [ObjectId(id) for id in blocking_task_ids]}
    elif is_blocking_others == "true":
        blocking_relationships = list(db.relationships.find({"type": "blocks", "sourceTaskId": {"$exists": True}}))
        blocking_task_ids = [rel["sourceTaskId"] for rel in blocking_relationships]
        filters["_id"] = {"$in": [ObjectId(id) for id in blocking_task_ids]}
    elif blocked_only == "true":
        blocking_relationships = list(db.relationships.find({"type": "blocks"}))
        blocked_task_ids = list(set([rel["targetTaskId"] for rel in blocking_relationships]))
        filters["_id"] = {"$in": [ObjectId(id) for id in blocked_task_ids]}
        
    tasks = list(db.tasks.find(filters))
    
    # Convert ObjectId to string for JSON serialization
    for task in tasks:
        task["_id"] = str(task["_id"])
        
    return jsonify(tasks), 200

@tasks_bp.route("/tasks/<task_id>", methods=["GET"])
def get_task(task_id):
    db = get_db()
    try:
        task = db.tasks.find_one({"_id": ObjectId(task_id)})
        if task:
            task["_id"] = str(task["_id"])
            return jsonify(task), 200
        return jsonify({"error": "Task not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@tasks_bp.route("/tasks", methods=["POST"])
def create_task():
    db = get_db()
    data = request.json
    
    # Add required timestamps
    data["createdAt"] = datetime.utcnow()
    data["updatedAt"] = datetime.utcnow()
    
    # Validate required fields
    required_fields = ["title", "status", "integration"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
        
    result = db.tasks.insert_one(data)
    return jsonify({"_id": str(result.inserted_id)}), 201

@tasks_bp.route("/tasks/<task_id>", methods=["PATCH"])
def update_task(task_id):
    db = get_db()
    updates = request.json
    
    # Add updated timestamp
    updates["updatedAt"] = datetime.utcnow()
    
    try:
        # If updating status to Done, check for blocking tasks
        if updates.get("status") == "Done":
            # Find all tasks that block this task
            blocking_relationships = list(db.relationships.find({
                "targetTaskId": task_id,
                "type": "blocks"
            }))
            
            # Check if any blocking tasks are not Done
            for rel in blocking_relationships:
                blocking_task = db.tasks.find_one({"_id": ObjectId(rel["sourceTaskId"])})
                if blocking_task and blocking_task["status"] != "Done":
                    return jsonify({
                        "error": f"Cannot mark as Done: blocked by task '{blocking_task['title']}' which is not Done"
                    }), 400
        
        result = db.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": updates}
        )
        if result.modified_count == 0:
            return jsonify({"error": "Task not found"}), 404
        return jsonify({"message": "Task updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
