# backend/routes/dashboard.py
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, jwt_required
from datetime import datetime
from backend.models import DailyClose, Product, Debtor
from backend.utils.decorators import role_required

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/api/admin/dashboard", methods=["GET"])
@jwt_required()
@role_required("admin")
def admin_dashboard():
    today = datetime.utcnow().date()

    # Today’s summary
    closes = DailyClose.query.filter_by(date=today).all()
    today_revenue = sum(c.revenue for c in closes)
    today_profit = sum(c.profit for c in closes)

    # Stock alerts
    low_stock = Product.query.filter(Product.stock < 10).order_by(Product.stock.asc()).limit(10).all()

    # Top debtors
    top_debtors = Debtor.query.order_by(Debtor.total_debt.desc()).limit(10).all()

    return jsonify({
        "today_revenue": round(today_revenue, 2),
        "today_profit": round(today_profit, 2),
        "low_stock_count": len(low_stock),
        "low_stock": [p.to_dict() for p in low_stock],
        "top_debtors": [d.to_dict() for d in top_debtors],
    }), 200


@dashboard_bp.route("/api/cashier/dashboard", methods=["GET"])
@jwt_required()
@role_required(["cashier", "admin"])
def cashier_dashboard():
    today = datetime.utcnow().date()
    claims = get_jwt()
    user_id = claims.get("sub")

    closes = DailyClose.query.filter_by(date=today, user_id=user_id).all()
    today_revenue = sum(c.revenue for c in closes)
    today_profit = sum(c.profit for c in closes)

    low_stock = Product.query.filter(Product.stock < 10).order_by(Product.stock.asc()).limit(5).all()

    return jsonify({
        "today_revenue": round(today_revenue, 2),
        "today_profit": round(today_profit, 2),
        "low_stock": [p.to_dict() for p in low_stock],
    }), 200
