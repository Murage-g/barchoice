from flask import Flask, request
from flask_migrate import Migrate
from .extensions import db, bcrypt, jwt, cors
from .config import Config

# Import blueprints
from .routes.auth_routes import auth_bp
from .routes.role_routes import role_bp
from .routes.admin import admin_bp
from .routes.dashboard import dashboard_bp
from .routes.product_routes import products_bp
from .routes.sales_routes import sales_bp
from .routes.purchases import purchases_bp
from .routes.utils import utils_bp
from .routes.conversion import conversion_bp
from .routes.reconciliation import recon_bp
from .routes.expenses import expenses_bp
from .routes.reports_bp import reports_bp

import os

migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    cors.init_app(
    app,
    resources={
        r"/*": {
            "origins": [
                "http://10.162.12.63:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3000",
                "https://barpos-frontend-sur2.onrender.com"

            ]
        }
    },
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)


    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    # 👇 IMPORTANT: import models so Alembic sees them
    from .models import (
        Product, DailyStock, DailyClose, Sale,
        Debtor, DebtTransaction,
        Expense, Reconciliation, ReconciliationLine,
        Supplier, Purchase,
        WholesaleClient, WholesaleSale,
        Waiter, WaiterBill,
        User, FixedAsset, AccountsReceivable,
        ConversionHistory, CashMovement)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(role_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(products_bp, url_prefix="/api")
    app.register_blueprint(sales_bp, url_prefix="/api")
    app.register_blueprint(utils_bp)
    app.register_blueprint(purchases_bp, url_prefix="/api")
    app.register_blueprint(conversion_bp)
    app.register_blueprint(recon_bp)
    app.register_blueprint(expenses_bp)
    app.register_blueprint(reports_bp)
    
    @app.route("/")
    def health():
        return {"status": "ok"}, 200
    
    print("Registered routes:")
    for rule in app.url_map.iter_rules():
        print(rule)


    return app


app = create_app()
@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        # Return empty 200 OK with CORS headers
        return {}, 200


# Ensure tables exist (works with Gunicorn + Render Free)
with app.app_context():
    # db.create_all()

    # 🔥 SEED DEFAULT ADMIN USER IF NOT EXISTS 🔥
    from backend.models.user import User

    admin_email = "admin@barpos.local"

    existing = User.query.filter_by(email=admin_email).first()
    if not existing:
        admin = User(
            username="admin",
            email=admin_email,
            role="admin"
        )
        admin.set_password("admin123")  # <-- default password
        db.session.add(admin)
        db.session.commit()
        print("✅ Seeded default admin user")
    else:
        print("ℹ️ Admin user already exists")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
