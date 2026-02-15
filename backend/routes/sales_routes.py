# backend/routes/sales.py

from datetime import datetime, timedelta, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from backend.utils.decorators import role_required
from ..models import Product, Sale, DailyClose
from ..models.product import DailyCloseAdjustment
from ..extensions import db

sales_bp = Blueprint("sales", __name__)

def is_locked(daily_close: DailyClose):
    return datetime.utcnow().date() > daily_close.date + timedelta(days=3)


@sales_bp.route("/sell", methods=["POST"])
@jwt_required()
@role_required("admin", "cashier")
def sell_product():
    data = request.get_json() or {}

    required = ["product_id", "quantity", "sale_type"]
    if not all(data.get(k) for k in required):
        return jsonify({"error": "Missing required data"}), 400

    product = Product.query.get(data["product_id"])
    if not product:
        return jsonify({"error": "Product not found"}), 404

    try:
        quantity = int(data["quantity"])
    except (ValueError, TypeError):
        return jsonify({"error": "Quantity must be integer"}), 400

    if quantity <= 0:
        return jsonify({"error": "Quantity must be greater than 0"}), 400

    if product.stock < quantity:
        return jsonify({"error": "Not enough stock"}), 400

    total_price = quantity * product.unit_price
    total_cost = quantity * product.cost_price

    sale = Sale(
        product_id=product.id,
        quantity=quantity,
        total_price=total_price,
        total_cost=total_cost,
        sale_type=data["sale_type"],
        issued_by=get_jwt_identity(),
    )

    product.stock -= quantity

    db.session.add(sale)
    db.session.commit()

    return jsonify({
        "message": "Sale recorded successfully",
        "sale": sale.to_dict()
    }), 201


@sales_bp.route("/daily_close", methods=["POST"])
@jwt_required()
@role_required("admin", "cashier")
def daily_close():
    data = request.get_json() or {}
    items = data.get("items", [])
    processed_by = get_jwt_identity()

    if not items:
        return jsonify({"error": "No items provided"}), 400

    created_daily_closes = []
    total_revenue = 0
    total_profit = 0

    try:
        for item in items:
            product = Product.query.get(item.get("product_id"))
            if not product:
                raise ValueError(f"Product ID {item.get('product_id')} not found")

            # Check duplicate daily close
            existing = DailyClose.query.filter_by(
                product_id=product.id,
                date=datetime.utcnow().date()
            ).first()
            if existing:
                raise ValueError(f"{product.name} already closed today")

            closing_stock = int(item.get("closing_stock"))
            opening_stock = product.stock

            sold = opening_stock - closing_stock
            if sold < 0:
                raise ValueError(
                    f"Closing stock for {product.name} cannot exceed opening stock"
                )

            revenue = sold * product.unit_price
            profit = sold * (product.unit_price - product.cost_price)

            daily_close_record = DailyClose(
                product_id=product.id,
                opening_stock=opening_stock,
                closing_stock=closing_stock,
                units_sold=sold,
                revenue=revenue,
                profit=profit,
                processed_by=processed_by,
                date=datetime.utcnow().date(),
            )

            product.stock = closing_stock

            db.session.add(daily_close_record)
            created_daily_closes.append(daily_close_record)

            total_revenue += revenue
            total_profit += profit

        db.session.commit()

        return jsonify({
            "message": "Daily close processed successfully",
            "daily_close_ids": [dc.id for dc in created_daily_closes],
            "total_revenue": round(total_revenue, 2),
            "total_profit": round(total_profit, 2),
        }), 200

    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to process daily close"}), 500


@sales_bp.route("/daily_close/<int:dc_id>/adjust", methods=["POST"])
@jwt_required()
@role_required("admin")
def adjust_closing_stock(dc_id):
    data = request.get_json() or {}
    reason = data.get("reason")
    new_closing_stock = data.get("new_closing_stock")

    if reason is None or new_closing_stock is None:
        return jsonify({"error": "new_closing_stock and reason required"}), 400

    daily_close = DailyClose.query.get_or_404(dc_id)
    product = daily_close.product

    if is_locked(daily_close):
        return jsonify({"error": "Daily close locked after 3 days"}), 403

    try:
        new_closing_stock = int(new_closing_stock)
    except ValueError:
        return jsonify({"error": "Invalid closing stock"}), 400

    if new_closing_stock < 0:
        return jsonify({"error": "Closing stock cannot be negative"}), 400

    previous_closing = daily_close.closing_stock

    quantity_delta = previous_closing - new_closing_stock
    revenue_delta = quantity_delta * product.unit_price
    profit_delta = quantity_delta * (product.unit_price - product.cost_price)

    # Correct stock adjustment
    product.stock -= quantity_delta
    daily_close.closing_stock = new_closing_stock
    daily_close.units_sold += quantity_delta
    daily_close.revenue += revenue_delta
    daily_close.profit += profit_delta

    adjustment = DailyCloseAdjustment(
        daily_close_id=daily_close.id,
        previous_closing_stock=previous_closing,
        new_closing_stock=new_closing_stock,
        quantity_delta=quantity_delta,
        revenue_delta=revenue_delta,
        profit_delta=profit_delta,
        reason=reason,
        created_by=get_jwt_identity(),
    )

    db.session.add(adjustment)
    db.session.commit()

    return jsonify({
        "message": "Adjustment successful",
        "adjustment": adjustment.to_dict()
    }), 200


@sales_bp.route("/daily_close/report/<string:date>", methods=["GET"])
@jwt_required()
@role_required("admin", "cashier")
def daily_close_report(date):
    try:
        query_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    records = DailyClose.query.filter(
        DailyClose.date == query_date
    ).all()

    if not records:
        return jsonify({"error": "No data for that date"}), 404

    total_revenue = sum(r.revenue for r in records)
    total_profit = sum(r.profit for r in records)

    report_data = {
        "business_name": "Your Bar POS",
        "report_date": str(query_date),
        "generated_at": datetime.utcnow().isoformat(),
        "products": [
            {
                "name": r.product.name,
                "opening": r.opening_stock,
                "closing": r.closing_stock,
                "sold": r.units_sold,
                "revenue": round(r.revenue, 2),
                "profit": round(r.profit, 2),
            }
            for r in records
        ],
        "totals": {
            "total_revenue": round(total_revenue, 2),
            "total_profit": round(total_profit, 2),
        }
    }

    return jsonify(report_data), 200


@sales_bp.route("/daily_close/summary/<string:date>", methods=["GET"])
@jwt_required()
@role_required("admin", "cashier")
def daily_close_summary(date):
    try:
        query_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    records = DailyClose.query.filter(
        DailyClose.date == query_date
    ).all()

    if not records:
        return jsonify({"message": "No daily close found for this date"}), 404

    total_revenue = sum(r.revenue for r in records)
    total_profit = sum(r.profit for r in records)
    total_units = sum(r.units_sold for r in records)

    products = [
        {
            "product_id": r.product_id,
            "product_name": r.product.name,
            "opening_stock": r.opening_stock,
            "closing_stock": r.closing_stock,
            "units_sold": r.units_sold,
            "revenue": r.revenue,
            "profit": r.profit,
        }
        for r in records
    ]

    return jsonify({
        "date": str(query_date),
        "total_revenue": round(total_revenue, 2),
        "total_profit": round(total_profit, 2),
        "total_units_sold": total_units,
        "products": products
    }), 200


@sales_bp.route("/daily_close/today", methods=["GET"])
@jwt_required()
@role_required("admin", "cashier")
def get_today_daily_close():
    today = datetime.utcnow().date()

    closes = DailyClose.query.filter(
        DailyClose.date == today,
        DailyClose.units_sold > 0
    ).all()

    if not closes:
        return jsonify({"exists": False}), 200

    result = []
    total_revenue = 0
    total_profit = 0

    for dc in closes:
        result.append({
            "id": dc.id,
            "product_name": dc.product.name,
            "opening_stock": dc.opening_stock,
            "closing_stock": dc.closing_stock,
            "units_sold": dc.units_sold,
            "revenue": dc.revenue,
            "profit": dc.profit,
        })

        total_revenue += dc.revenue
        total_profit += dc.profit

    return jsonify({
        "exists": True,
        "date": str(today),
        "total_revenue": round(total_revenue, 2),
        "total_profit": round(total_profit, 2),
        "closes": result
    }), 200


@sales_bp.route("/daily_close/<int:daily_close_id>/adjustments", methods=["GET"])
@jwt_required()
@role_required("admin")
def get_daily_close_adjustments(daily_close_id):
    daily_close = DailyClose.query.get(daily_close_id)

    if not daily_close:
        return jsonify({"error": "Daily close not found"}), 404

    adjustments = DailyCloseAdjustment.query.filter_by(
        daily_close_id=daily_close_id
    ).order_by(DailyCloseAdjustment.created_at.desc()).all()

    result = []
    for adj in adjustments:
        result.append({
            "id": adj.id,
            "reason": adj.reason,
            "quantity_delta": adj.quantity_delta,
            "revenue_delta": adj.revenue_delta,
            "profit_delta": adj.profit_delta,
            "created_at": adj.created_at.isoformat()
        })

    return jsonify({
        "daily_close_id": daily_close_id,
        "adjustments": result
    }), 200
