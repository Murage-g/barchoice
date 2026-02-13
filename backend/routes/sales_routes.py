# backend/routes/sales.py

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from backend.utils.decorators import role_required
from ..models import (
    Product,
    Sale,
    Debtor,
    DebtTransaction,
    DailyClose,
)
from ..models.product import DailyCloseAdjustment
from ..extensions import db


sales_bp = Blueprint("sales", __name__)


# =====================================================
# Utility: 3-Day Lock Rule
# =====================================================

def is_sale_locked(sale: Sale) -> bool:
    return datetime.utcnow() > sale.date + timedelta(days=3)


# =====================================================
# Create Sale (Immutable)
# =====================================================

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

    db.session.add(sale)

    # Reduce stock
    product.stock -= quantity

    # Handle debt sale
    if data["sale_type"] == "debt":
        debtor_id = data.get("debtor_id")
        if not debtor_id:
            db.session.rollback()
            return jsonify({"error": "debtor_id required for debt sales"}), 400

        debtor = Debtor.query.get(debtor_id)
        if not debtor:
            db.session.rollback()
            return jsonify({"error": "Debtor not found"}), 404

        debtor.total_debt += total_price

        debt_tx = DebtTransaction(
            debtor_id=debtor.id,
            amount=total_price,
            is_paid=False,
            outstanding_debt=debtor.total_debt,
            description=f"Sale #{sale.id}",
            issued_by=get_jwt_identity(),
        )

        db.session.add(debt_tx)

    db.session.commit()

    return jsonify({
        "message": "Sale recorded successfully",
        "sale": sale.to_dict()
    }), 201

def is_locked(daily_close: DailyClose):
    """Lock adjustment if more than 3 days have passed."""
    return datetime.utcnow().date() > daily_close.date + timedelta(days=3)


sales_bp.route("/daily_close/<int:dc_id>/adjust", methods=["POST"])
@jwt_required()
@role_required("admin")
def adjust_closing_stock(dc_id):
    """
    Adjust the closing stock for a DailyClose record.
    Updates units sold, revenue, profit, product stock, and logs an audit adjustment.
    """
    data = request.get_json() or {}
    reason = data.get("reason")
    new_closing_stock = data.get("new_closing_stock")

    if reason is None or new_closing_stock is None:
        return jsonify({"error": "new_closing_stock and reason are required"}), 400

    # Fetch DailyClose record
    daily_close = DailyClose.query.get_or_404(dc_id)
    product = daily_close.product

    # Check lock (3 days)
    if is_locked(daily_close):
        return jsonify({"error": "Daily close locked after 3 days"}), 403

    try:
        new_closing_stock = int(new_closing_stock)
    except ValueError:
        return jsonify({"error": "Invalid closing stock"}), 400

    if new_closing_stock < 0:
        return jsonify({"error": "Closing stock cannot be negative"}), 400

    previous_closing = daily_close.closing_stock

    # Compute adjustment deltas
    quantity_delta = previous_closing - new_closing_stock  # change in sold units
    revenue_delta = quantity_delta * product.unit_price
    profit_delta = quantity_delta * (product.unit_price - product.cost_price)

    # Update stock and daily close
    product.stock += previous_closing - new_closing_stock
    daily_close.closing_stock = new_closing_stock
    daily_close.units_sold += quantity_delta
    daily_close.revenue += revenue_delta
    daily_close.profit += profit_delta

    # Record audit adjustment
    adj = DailyCloseAdjustment(
        daily_close_id=daily_close.id,
        previous_closing_stock=previous_closing,
        new_closing_stock=new_closing_stock,
        quantity_delta=quantity_delta,
        revenue_delta=revenue_delta,
        profit_delta=profit_delta,
        reason=reason,
        created_by=get_jwt_identity(),
    )

    db.session.add(adj)
    db.session.commit()

    return jsonify({
        "message": "Closing stock adjusted successfully",
        "adjustment": adj.to_dict(),
        "daily_close": {
            "id": daily_close.id,
            "closing_stock": daily_close.closing_stock,
            "units_sold": daily_close.units_sold,
            "revenue": daily_close.revenue,
            "profit": daily_close.profit,
        }
    }), 200


@sales_bp.route("/daily_close/<int:dc_id>/adjustments", methods=["GET"])
@jwt_required()
@role_required("admin")
def list_dc_adjustments(dc_id):
    """List all adjustments for a DailyClose record."""
    adjustments = DailyCloseAdjustment.query.filter_by(
        daily_close_id=dc_id
    ).order_by(DailyCloseAdjustment.created_at.desc()).all()

    return jsonify([a.to_dict() for a in adjustments]), 200

# =====================================================
# Daily Close (Safe Version)
# =====================================================

@sales_bp.route("/daily_close", methods=["POST"])
@jwt_required()
@role_required("admin", "cashier")
def daily_close():
    data = request.get_json() or {}
    items = data.get("items", [])
    processed_by = get_jwt_identity()

    if not items:
        return jsonify({"error": "No items provided"}), 400

    total_revenue = 0
    total_profit = 0
    sales_to_post = []

    try:
        for item in items:
            product = Product.query.get(item.get("product_id"))
            if not product:
                raise ValueError(f"Product ID {item.get('product_id')} not found")

            closing_stock = int(item.get("closing_stock", 0))
            opening_stock = product.stock
            sold = opening_stock - closing_stock

            if sold < 0:
                raise ValueError(
                    f"Closing stock for {product.name} cannot exceed opening stock"
                )

            revenue = sold * product.unit_price
            profit = sold * (product.unit_price - product.cost_price)

            if sold > 0:
                sales_to_post.append(
                    Sale(
                        product_id=product.id,
                        quantity=sold,
                        total_price=revenue,
                        total_cost=sold * product.cost_price,
                        sale_type="cash",
                        issued_by=processed_by,
                    )
                )

            db.session.add(DailyClose(
                product_id=product.id,
                opening_stock=opening_stock,
                closing_stock=closing_stock,
                units_sold=sold,
                revenue=revenue,
                profit=profit,
                processed_by=processed_by,
            ))

            product.stock = closing_stock

            total_revenue += revenue
            total_profit += profit

        db.session.add_all(sales_to_post)
        db.session.commit()

        # Fetch all DailyClose IDs just created
        daily_close_ids = [
            dc.id for dc in DailyClose.query.filter(
                DailyClose.processed_by == processed_by,
                DailyClose.opening_stock - DailyClose.closing_stock > 0
            ).order_by(DailyClose.id.desc()).limit(len(items)).all()
        ]

        return jsonify({
            "message": "Daily close processed successfully",
            "daily_close_ids": daily_close_ids,   # <-- return these
            "total_revenue": round(total_revenue, 2),
            "total_profit": round(total_profit, 2),
            "total_sales_records": len(sales_to_post),
        }), 200
    
    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to process daily close"}), 500
