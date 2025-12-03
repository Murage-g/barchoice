from flask import Flask
from backend.extensions import db, bcrypt, jwt, cors
from backend.config import Config

# Import blueprints
from backend.routes.auth_routes import auth_bp
from backend.routes.role_routes import role_bp
from backend.routes.admin import admin_bp
from backend.routes.dashboard import dashboard_bp
from backend.routes.product_routes import products_bp
from backend.routes.sales_routes import sales_bp
from backend.routes.purchases import purchases_bp
from backend.routes.utils import utils_bp
from backend.routes.conversion import conversion_bp
from backend.routes.reconciliation import recon_bp
from backend.routes.expenses import expenses_bp
from backend.routes.reports_bp import reports_bp

from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(role_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(products_bp, url_prefix="/api")
    app.register_blueprint(sales_bp, url_prefix="/api")
    app.register_blueprint(utils_bp)
    app.register_blueprint(purchases_bp, url_prefix = "/api")
    app.register_blueprint(conversion_bp)
    app.register_blueprint(recon_bp)
    app.register_blueprint(expenses_bp)
    app.register_blueprint(reports_bp)


    # Create tables (optional in dev mode)
    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
