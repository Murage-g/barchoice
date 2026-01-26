from flask import Blueprint, request, jsonify
from models import Product
from extensions import db

products_bp = Blueprint('products', __name__)

@products_bp.route("/products", methods=["GET"])
def get_products():
    products = Product.query.order_by(Product.id).all()
    return jsonify([p.to_dict() for p in products]), 200

@products_bp.route("/products", methods=["POST"])
def add_product():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Product name is required"}), 400

    if Product.query.filter_by(name=name).first():
        return jsonify({"error": f"Product '{name}' already exists"}), 400

    product = Product(
        name=name,
        stock=int(data.get("stock", 0)),
        unit_price=float(data.get("unit_price", 0.0)),
        cost_price=float(data.get("cost_price", 0.0))
    )
    db.session.add(product)
    db.session.commit()
    return jsonify({"message": "Product added successfully", "product": product.to_dict()}), 201

@products_bp.route("/stock_in", methods=["POST"])
def stock_in():
    data = request.get_json() or {}
    product_id, quantity = data.get("product_id"), data.get("quantity")

    if not all([product_id, quantity]):
        return jsonify({"error": "product_id and quantity required"}), 400

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    try:
        q = int(quantity)
    except ValueError:
        return jsonify({"error": "quantity must be integer"}), 400

    product.stock += q
    db.session.commit()
    return jsonify({"message": f"Added {q} units to {product.name}", "product": product.to_dict()}), 200

from sqlalchemy.exc import IntegrityError

@products_bp.route("/products/<int:id>", methods=["DELETE"])
def delete_product(id):
    product = Product.query.get(id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    try:
        db.session.delete(product)
        db.session.commit()
        return jsonify({"message": f"Product {id} deleted successfully"}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Product is referenced elsewhere and cannot be deleted"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
