from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime
from backend.models import Product, Supplier, Purchase
from backend.utils.decorators import role_required
from backend.extensions import db
from flask_cors import cross_origin

purchases_bp = Blueprint("purchases_bp", __name__, url_prefix="/api")


# ✅ Utility to safely convert model objects to dict
def to_dict(model):
    return {c.name: getattr(model, c.name) for c in model.__table__.columns}


# ----------------------------------------------------------------
# ✅ CORS preflight handler (global for this blueprint)
# ----------------------------------------------------------------
@purchases_bp.route("/suppliers", methods=["OPTIONS"])
@purchases_bp.route("/purchases", methods=["OPTIONS"])
@purchases_bp.route("/purchases/report", methods=["OPTIONS"])
@cross_origin(origins=["http://localhost:3000"], supports_credentials=True)
def handle_options():
    """Handle CORS preflight requests gracefully."""
    return "", 200


# ----------------------------------------------------------------
# ✅ SUPPLIER MANAGEMENT
# ----------------------------------------------------------------
@purchases_bp.route("/suppliers", methods=["GET"])
@cross_origin(origins=["http://localhost:3000"], supports_credentials=True)
@jwt_required()
@role_required("cashier", "admin")
def get_suppliers():
    suppliers = Supplier.query.order_by(Supplier.name.asc()).all()
    return jsonify([to_dict(s) for s in suppliers]), 200


@purchases_bp.route("/suppliers", methods=["POST"])
@cross_origin(origins=["http://localhost:3000"], supports_credentials=True)
@jwt_required()
@role_required("cashier", "admin")
def add_supplier():
    data = request.get_json()
    name = data.get("name")
    contact = data.get("contact", "")

    if not name:
        return jsonify({"error": "Supplier name is required"}), 400

    if Supplier.query.filter_by(name=name).first():
        return jsonify({"error": "Supplier already exists"}), 400

    supplier = Supplier(name=name, contact_person=contact)
    db.session.add(supplier)
    db.session.commit()
    return jsonify({"message": "Supplier added successfully"}), 201


@purchases_bp.route("/suppliers/<int:id>", methods=["PUT"])
@cross_origin(origins=["http://localhost:3000"], supports_credentials=True)
@jwt_required()
@role_required("cashier", "admin")
def update_supplier(id):
    supplier = Supplier.query.get_or_404(id)
    data = request.get_json()
    supplier.name = data.get("name", supplier.name)
    supplier.contact_person = data.get("contact", supplier.contact)
    db.session.commit()
    return jsonify({"message": "Supplier updated successfully"}), 200


@purchases_bp.route("/suppliers/<int:id>", methods=["DELETE"])
@cross_origin(origins=["http://localhost:3000"], supports_credentials=True)
@jwt_required()
@role_required("cashier", "admin")
def delete_supplier(id):
    supplier = Supplier.query.get_or_404(id)
    db.session.delete(supplier)
    db.session.commit()
    return jsonify({"message": "Supplier deleted successfully"}), 200


# ----------------------------------------------------------------
# ✅ PURCHASE MANAGEMENT
# ----------------------------------------------------------------
@purchases_bp.route("/purchases", methods=["GET"])
@cross_origin(origins=["http://localhost:3000"], supports_credentials=True)
@jwt_required()
@role_required("cashier", "admin")
def get_purchases():
    purchases = Purchase.query.order_by(Purchase.date.desc()).limit(100).all()
    return jsonify([to_dict(p) for p in purchases]), 200


@purchases_bp.route("/purchases", methods=["POST"])
@cross_origin(origins=["http://localhost:3000"], supports_credentials=True)
@jwt_required()
@role_required("cashier", "admin")
def add_purchase():
    data = request.get_json()
    supplier_id = data.get("supplier_id")
    product_id = data.get("product_id")
    quantity = data.get("quantity", 0)
    cost_price = data.get("unit_cost", 0.0)  # align with frontend field name

    if not all([supplier_id, product_id]) or quantity <= 0 or cost_price <= 0:
        return jsonify({"error": "Invalid input data"}), 400

    product = Product.query.get(product_id)
    supplier = Supplier.query.get(supplier_id)
    if not product or not supplier:
        return jsonify({"error": "Invalid product or supplier"}), 404

    total_cost = quantity * cost_price

    # Record purchase
    purchase = Purchase(
        supplier_id=supplier_id,
        product_id=product_id,
        quantity=quantity,
        unit_cost=cost_price,
        total_cost=total_cost,
        purchase_date=datetime.utcnow().date()
    )

    # Update product stock
    product.stock += quantity
    product.cost_price = cost_price

    db.session.add(purchase)
    db.session.commit()

    return jsonify({"message": "Purchase recorded successfully"}), 201


# ----------------------------------------------------------------
# ✅ PURCHASE REPORT
# ----------------------------------------------------------------
@purchases_bp.route("/purchases/report", methods=["GET"])
@cross_origin(origins=["http://localhost:3000"], supports_credentials=True)
@jwt_required()
@role_required("cashier", "admin")
def purchase_report():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    query = (
        db.session.query(
            Purchase.id,
            Product.name.label("product_name"),
            Supplier.name.label("supplier_name"),
            Purchase.quantity,
            Purchase.unit_cost,
            Purchase.total_cost,
            Purchase.purchase_date
        )
        .join(Product, Purchase.product_id == Product.id)
        .join(Supplier, Purchase.supplier_id == Supplier.id)
    )

    # ✅ Filter by date range if provided
    if start_date:
        try:
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(Purchase.purchase_date >= start_date)
        except ValueError:
            return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400

    if end_date:
        try:
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(Purchase.purchase_date <= end_date)
        except ValueError:
            return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD"}), 400

    # ✅ Fetch results
    results = query.order_by(Purchase.purchase_date.desc()).all()

    if not results:
        return jsonify({"purchases": [], "total_spent": 0, "message": "No purchases recorded yet"}), 200

    report = [
        {
            "id": r.id,
            "product_name": r.product_name,
            "supplier_name": r.supplier_name,
            "quantity": r.quantity,
            "unit_cost": float(r.unit_cost),
            "total_cost": float(r.total_cost),
            "purchase_date": r.purchase_date.strftime("%Y-%m-%d"),
        }
        for r in results
    ]

    total_spent = sum(item["total_cost"] for item in report)
    return jsonify({"purchases": report, "total_spent": total_spent}), 200