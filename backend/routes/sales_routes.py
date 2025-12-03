from flask import Blueprint, request, jsonify
from backend.models import Product, Sale, Debtor, DebtTransaction, DailyClose
from ..extensions import db

sales_bp = Blueprint('sales', __name__)

@sales_bp.route("/sell", methods=["POST"])
def sell_product():
    data = request.get_json() or {}
    required = ["product_id", "quantity", "sale_type", "issued_by"]
    if not all(data.get(k) for k in required):
        return jsonify({"error": "Missing required data"}), 400

    product = Product.query.get(data["product_id"])
    if not product:
        return jsonify({"error": "Product not found"}), 404

    try:
        q = int(data["quantity"])
    except ValueError:
        return jsonify({"error": "quantity must be integer"}), 400

    if product.stock < q:
        return jsonify({"error": "Not enough stock"}), 400

    total_price = q * product.unit_price
    total_cost = q * product.cost_price

    sale = Sale(
        product_id=product.id,
        quantity=q,
        total_price=total_price,
        total_cost=total_cost,
        sale_type=data["sale_type"],
        issued_by=data["issued_by"]
    )
    db.session.add(sale)
    product.stock -= q

    if data["sale_type"] == "debt":
        debtor_id = data.get("debtor_id")
        if not debtor_id:
            db.session.rollback()
            return jsonify({"error": "debtor_id is required for debt sales"}), 400

        debtor = Debtor.query.get(debtor_id)
        if not debtor:
            db.session.rollback()
            return jsonify({"error": "Debtor not found"}), 404

        debtor.total_debt += total_price
        db.session.add(DebtTransaction(
            debtor_id=debtor.id,
            amount=total_price,
            is_paid=False,
            outstanding_debt=debtor.total_debt,
            description="Purchase on credit",
            issued_by=data["issued_by"]
        ))

    db.session.commit()
    return jsonify({"message": "Sale recorded successfully", "sale": sale.to_dict()}), 201

@sales_bp.route("/daily_close", methods=["POST"])
def daily_close():
    data = request.get_json() or {}
    items = data.get("items", [])
    processed_by = data.get("processed_by", "System")

    if not items:
        return jsonify({"error": "No items provided"}), 400

    total_revenue = total_profit = 0
    sales_to_post = []

    try:
        # Start a database transaction
        for item in items:
            product = Product.query.get(item.get("product_id"))
            if not product:
                raise ValueError(f"Product ID {item.get('product_id')} not found")

            closing_stock = int(item.get("closing_stock", 0))
            opening_stock = product.stock
            sold = opening_stock - closing_stock

            if sold < 0:
                raise ValueError(f"Closing stock for {product.name} cannot exceed opening stock")
            
            revenue = sold * product.unit_price
            profit = sold * (product.unit_price - product.cost_price)

            # Prepare Sale record
            if sold > 0:
                sales_to_post.append(
                    Sale(
                        product_id=product.id,
                        quantity=sold,
                        total_price=revenue,
                        total_cost=sold * product.cost_price,
                        sale_type="cash",  # or handle debt logic if needed
                        issued_by=processed_by
                    )
                )

            # Prepare DailyClose record
            db.session.add(DailyClose(
                product_id=product.id,
                opening_stock=opening_stock,
                closing_stock=closing_stock,
                units_sold=sold,
                revenue=revenue,
                profit=profit,
                processed_by=processed_by
            ))

            # Update product stock
            product.stock = closing_stock

            total_revenue += revenue
            total_profit += profit

        # Post all sales at once
        db.session.add_all(sales_to_post)

        # Commit everything at once
        db.session.commit()

        return jsonify({
            "message": "Daily close processed successfully, sales recorded",
            "total_revenue": round(total_revenue, 2),
            "total_profit": round(total_profit, 2),
            "total_sales_records": len(sales_to_post)
        }), 200

    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to process daily close"}), 500
