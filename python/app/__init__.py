from flask import Flask
from flask_cors import CORS

def create_app(register_blueprints=True):
    app = Flask(__name__)
    CORS(app)  # Enable CORS for all routes
    app.config.from_object("app.config.Config")

    if register_blueprints:
        # Register routes
        with app.app_context():
            from .routes import webhook_bp
            from .task_service import tasks_bp
            from .relationship_service import relationships_bp
            from .mindmap_service import mindmap_bp
            app.register_blueprint(webhook_bp)
            app.register_blueprint(tasks_bp)
            app.register_blueprint(relationships_bp)
            app.register_blueprint(mindmap_bp)

    return app
