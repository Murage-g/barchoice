# backend/routes/dashboard.py
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, jwt_required
from datetime import datetime
from ..models import DailyClose, Product, Debtor
from ..utils.decorators import role_required

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/admin/dashboard", methods=["GET"])
@jwt_required()
@role_required("admin")
def admin_dashboard():
    from sqlalchemy import func
    today = datetime.utcnow().date()

    # Today's summary
    closes = DailyClose.query.filter(func.date(DailyClose.date) == today).all()
    today_revenue = sum((c.revenue or 0) for c in closes)
    today_profit = sum((c.profit or 0) for c in closes)

    # Stock alerts
    low_stock = Product.query.filter(Product.stock < 10).order_by(Product.stock.asc()).limit(10).all()

    # Top debtors
    top_debtors = sorted(Debtor.query.all(), key=lambda d: d.total_debt, reverse=True)[:10]


    return jsonify({
        "today_revenue": round(today_revenue, 2),
        "today_profit": round(today_profit, 2),
        "low_stock_count": len(low_stock),
        "low_stock": [{"id": p.id, "name": p.name, "stock": p.stock} for p in low_stock],
        "top_debtors": [{"id": d.id, "name": d.name, "total_debt": d.total_debt} for d in top_debtors],
    }), 200


@dashboard_bp.route("/cashier/dashboard", methods=["GET"])
@jwt_required()
@role_required("cashier", "admin")
def cashier_dashboard():
    today = datetime.utcnow().date()

    # Get current user
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Fetch today's closes processed by this user
    from sqlalchemy import and_
    closes = DailyClose.query.filter(
        and_(
            DailyClose.date == today,
            DailyClose.processed_by == user.email
        )
    ).all()

    today_revenue = sum(c.revenue or 0 for c in closes)
    today_profit = sum(c.profit or 0 for c in closes)

    # Low stock products
    low_stock = Product.query.filter(Product.stock < 10).order_by(Product.stock.asc()).limit(5).all()

    return jsonify({
        "today_revenue": round(today_revenue, 2),
        "today_profit": round(today_profit, 2),
        "low_stock": [p.to_dict() for p in low_stock],
    }), 200
