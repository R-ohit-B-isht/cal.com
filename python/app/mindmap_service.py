from flask import Blueprint, request, jsonify, current_app
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime

mindmap_bp = Blueprint("mindmap", __name__)

def get_db():
    client = MongoClient(current_app.config["MONGODB_URI"])
    return client[current_app.config["MONGODB_DB"]]

@mindmap_bp.route("/mindmap/nodes", methods=["GET"])
def get_nodes():
    db = get_db()
    nodes = list(db.mindmap_nodes.find())
    
    # Convert ObjectId to string for JSON serialization
    for node in nodes:
        node["_id"] = str(node["_id"])
        
    return jsonify(nodes), 200

@mindmap_bp.route("/mindmap/nodes", methods=["POST"])
def create_node():
    db = get_db()
    data = request.json
    
    # Add required timestamps
    data["createdAt"] = datetime.utcnow()
    data["updatedAt"] = datetime.utcnow()
    
    # Validate required fields
    required_fields = ["label", "position"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
        
    result = db.mindmap_nodes.insert_one(data)
    return jsonify({"_id": str(result.inserted_id)}), 201

@mindmap_bp.route("/mindmap/nodes/<node_id>", methods=["DELETE"])
def delete_node(node_id):
    db = get_db()
    
    try:
        # Delete the node
        result = db.mindmap_nodes.delete_one({"_id": ObjectId(node_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Node not found"}), 404
            
        # Delete all edges connected to this node
        db.mindmap_edges.delete_many({
            "$or": [
                {"sourceId": node_id},
                {"targetId": node_id}
            ]
        })
        
        return jsonify({"message": "Node and connected edges deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@mindmap_bp.route("/mindmap/edges", methods=["GET"])
def get_edges():
    db = get_db()
    edges = list(db.mindmap_edges.find())
    
    # Convert ObjectId to string for JSON serialization
    for edge in edges:
        edge["_id"] = str(edge["_id"])
        
    return jsonify(edges), 200

@mindmap_bp.route("/mindmap/edges", methods=["POST"])
def create_edge():
    db = get_db()
    data = request.json
    
    # Add required timestamps
    data["createdAt"] = datetime.utcnow()
    data["updatedAt"] = datetime.utcnow()
    
    # Validate required fields
    required_fields = ["sourceId", "targetId"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
        
    # Check if nodes exist
    source_node = db.mindmap_nodes.find_one({"_id": ObjectId(data["sourceId"])})
    target_node = db.mindmap_nodes.find_one({"_id": ObjectId(data["targetId"])})
    
    if not source_node or not target_node:
        return jsonify({"error": "Source or target node not found"}), 404
        
    result = db.mindmap_edges.insert_one(data)
    return jsonify({"_id": str(result.inserted_id)}), 201

@mindmap_bp.route("/mindmap/edges/<edge_id>", methods=["DELETE"])
def delete_edge(edge_id):
    db = get_db()
    
    try:
        result = db.mindmap_edges.delete_one({"_id": ObjectId(edge_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Edge not found"}), 404
        return jsonify({"message": "Edge deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
