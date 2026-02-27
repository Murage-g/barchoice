# file: app/routes/special_stock_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from ..models import Product, Sale, Expense, PurchaseOffer
from ..extensions import db
from ..utils.decorators import role_required

special_bp = Blueprint("special_bp", __name__, url_prefix="/api/special")


# -------------------------------
# 1️⃣ Non-standard sales (wholesale or sold at cost)
# -------------------------------
@special_bp.route("/sales/add", methods=["POST"])
@jwt_required()
@role_required("cashier", "admin")
def add_nonstandard_sale():
    data = request.get_json()
    product_id = data.get("product_id")
    quantity = data.get("quantity", 0)
    unit_price = data.get("unit_price", 0.0)
    is_wholesale = data.get("is_wholesale", False)
    is_cost_sale = data.get("is_cost_sale", False)
    user = get_jwt_identity()

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    if quantity <= 0:
        return jsonify({"error": "Quantity must be greater than 0"}), 400
    if product.stock < quantity:
        return jsonify({"error": "Insufficient stock"}), 400

    # Determine sale price
    sale_price = unit_price
    if is_cost_sale:
        sale_price = product.cost_price

    total_amount = sale_price * quantity

    # Record sale
    sale = Sale(
        product_id=product_id,
        quantity=quantity,
        unit_price=sale_price,
        total_amount=total_amount,
        is_wholesale=is_wholesale,
        is_cost_sale=is_cost_sale,
        sale_date=datetime.utcnow(),
        sold_by=user
    )
    product.stock -= quantity

    db.session.add(sale)
    db.session.commit()

    return jsonify({"message": "Sale recorded successfully", "total_amount": total_amount}), 201


# -------------------------------
# 2️⃣ Damaged stock reporting (expense entry)
# -------------------------------
@special_bp.route("/stock/damage", methods=["POST"])
@jwt_required()
@role_required("cashier", "admin")
def report_damaged_stock():
    data = request.get_json()
    product_id = data.get("product_id")
    quantity = data.get("quantity", 0)
    reason = data.get("reason", "Damaged")
    user = get_jwt_identity()

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    if quantity <= 0:
        return jsonify({"error": "Quantity must be greater than 0"}), 400
    if product.stock < quantity:
        return jsonify({"error": "Not enough stock"}), 400

    # Reduce stock
    product.stock -= quantity

    # Record expense for P&L
    expense = Expense(
        name=f"{reason} - {product.name}",
        amount=product.cost_price * quantity,
        recorded_by=user,
        date=datetime.utcnow()
    )
    db.session.add(expense)
    db.session.commit()

    return jsonify({"message": f"{quantity} {product.name} marked as damaged"}), 201


# -------------------------------
# 3️⃣ Offers / free products
# -------------------------------
@special_bp.route("/offers/add", methods=["POST"])
@jwt_required()
@role_required("cashier", "admin")
def add_offer():
    data = request.get_json()
    product_id = data.get("product_id")
    quantity = data.get("quantity", 0)
    purchase_id = data.get("purchase_id")  # optional
    user = get_jwt_identity()

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    if quantity <= 0:
        return jsonify({"error": "Quantity must be greater than 0"}), 400

    # Add free stock
    product.stock += quantity

    offer = PurchaseOffer(
        purchase_id=purchase_id,
        product_id=product_id,
        quantity=quantity,
        offer_date=datetime.utcnow(),
        created_by=user
    )
    db.session.add(offer)
    db.session.commit()

    return jsonify({"message": f"{quantity} {product.name} added as offer"}), 201