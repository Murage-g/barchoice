# conversion.py
from flask import Blueprint, jsonify, request
from ..models import Product
from ..models.ConversionHistory import ConversionHistory
from ..extensions import db
from flask_jwt_extended import jwt_required

conversion_bp = Blueprint("conversion", __name__)

@conversion_bp.route('/api/tot_products', methods=['GET'])
def get_tot_products():
    try:
        tot_products = Product.query.filter(Product.name.ilike('%TOT%')).all()
        return jsonify([p.name for p in tot_products]), 200
    except Exception as e:
        print(f"Error fetching TOT products: {e}")
        return jsonify({"error": "Could not fetch product list"}), 500


@conversion_bp.route('/api/convert', methods=['POST'])
def convert_to_tots():
    data = request.get_json()
    tot_name = data.get('product_name')

    if not tot_name or 'TOT' not in tot_name.upper():
        return jsonify({"error": "Please select a TOT product for conversion"}), 400

    base_name = tot_name.upper().replace('TOT', '').strip()

    bottle_product = Product.query.filter(
        Product.name.ilike(f"%{base_name}%"),
        (Product.name.ilike("%MZINGA%")) | (Product.name.ilike("%750 ML%"))
    ).first()

    if not bottle_product:
        return jsonify({"error": f"No matching bottle found for {tot_name}"}), 404

    tot_product = Product.query.filter(Product.name.ilike(tot_name)).first()
    if not tot_product:
        return jsonify({"error": f"Product {tot_name} not found"}), 404

    if bottle_product.stock < 1:
        return jsonify({"error": f"Not enough {bottle_product.name} stock. Available: {bottle_product.stock}"}), 400

    CONVERSION_RATE = 25
    bottle_product.stock -= 1
    tot_product.stock += CONVERSION_RATE

    history = ConversionHistory(
        bottle_id=bottle_product.id,
        tot_id=tot_product.id,
        prev_bottle_stock=bottle_product.stock + 1,  # before conversion
        prev_tot_stock=tot_product.stock - 25,
        new_bottle_stock=bottle_product.stock,
        new_tot_stock=tot_product.stock
    )
    db.session.add(history)
    db.session.commit()

    return jsonify({
    "message": f"Converted 1 {bottle_product.name} → {CONVERSION_RATE} {tot_product.name}",
    "bottle_name": bottle_product.name,
    "bottle_stock": bottle_product.stock,
    "tot_name": tot_product.name,
    "tot_stock": tot_product.stock
}), 200

# --- Conversion history ---
@conversion_bp.route("/api/conversions/history", methods=["GET"])
@jwt_required()
def get_conversion_history():
    try:
        history = ConversionHistory.query.order_by(ConversionHistory.timestamp.desc()).limit(50).all()
        data = [h.to_dict() for h in history]
        return jsonify(data), 200
    except Exception as e:
        print(f"Error fetching conversion history: {e}")
        return jsonify({"error": "Failed to load history"}), 500

# --- Undo conversion ---
@conversion_bp.route("/api/conversions/undo", methods=["POST"])
@jwt_required()
def undo_conversion():
    data = request.get_json()
    conversion_id = data.get("conversion_id")

    if not conversion_id:
        return jsonify({"error": "Conversion ID required"}), 400

    conversion = ConversionHistory.query.get(conversion_id)
    if not conversion:
        return jsonify({"error": "Conversion record not found"}), 404

    try:
        bottle = Product.query.get(conversion.bottle_id)
        tot = Product.query.get(conversion.tot_id)

        bottle.stock = conversion.prev_bottle_stock
        tot.stock = conversion.prev_tot_stock

        db.session.delete(conversion)
        db.session.commit()

        return jsonify({
            "message": f"Undid conversion for {tot.name}",
            "bottle_name": bottle.name,
            "bottle_stock": bottle.stock,
            "tot_name": tot.name,
            "tot_stock": tot.stock,
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500