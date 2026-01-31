# backend/routes/expenses_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.decorators import role_required
from ..models.reconciliation import Expense
from ..extensions import db
from datetime import datetime

expenses_bp = Blueprint("expenses_bp", __name__, url_prefix="/api")

@expenses_bp.route("/expenses", methods=["GET"])
@jwt_required()
@role_required("admin", "cashier")
def list_expenses():
    # optional ?date=YYYY-MM-DD
    date_str = request.args.get("date")
    q = Expense.query
    if date_str:
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d").date()
            q = q.filter(Expense.date == d)
        except ValueError:
            return jsonify({"error": "Invalid date format, use YYYY-MM-DD"}), 400
    q = q.order_by(Expense.date.desc(), Expense.created_at.desc())
    expenses = q.all()
    return jsonify([e.to_dict() for e in expenses]), 200

from ..utils.expense_helpers import record_expense

@expenses_bp.route("/expenses", methods=["POST"])
@jwt_required()
@role_required("admin", "cashier")
def create_expense():
    data = request.get_json() or {}

    # Validate amount
    try:
        amount = float(data.get("amount"))
    except:
        return jsonify({"error": "amount must be numeric"}), 400

    description = data.get("description")
    category = data.get("category")
    user = get_jwt_identity()

    # Determine date
    date_str = data.get("date")
    date_val = datetime.utcnow().date()
    if date_str:
        try:
            date_val = datetime.strptime(date_str, "%Y-%m-%d").date()
        except:
            return jsonify({"error": "Invalid date format"}), 400

    # Use the helper function
    exp = record_expense(
        date=date_val,
        amount=amount,
        description=description,
        category=category,
        user_id=user
    )

    db.session.commit()

    return jsonify({"message": "Expense created", "expense": exp.to_dict()}), 201


@expenses_bp.route("/expenses/<int:expense_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "cashier")
def update_expense(expense_id):
    exp = Expense.query.get_or_404(expense_id)
    data = request.get_json() or {}
    if "amount" in data:
        try:
            exp.amount = float(data["amount"])
        except:
            return jsonify({"error": "amount must be numeric"}), 400
    exp.category = data.get("category", exp.category)
    exp.description = data.get("description", exp.description)
    if "date" in data:
        try:
            exp.date = datetime.strptime(data["date"], "%Y-%m-%d").date()
        except:
            return jsonify({"error": "Invalid date format"}), 400
    db.session.commit()
    return jsonify({"message": "Expense updated", "expense": exp.to_dict()}), 200

@expenses_bp.route("/expenses/<int:expense_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin", "cashier")
def delete_expense(expense_id):
    exp = Expense.query.get_or_404(expense_id)
    db.session.delete(exp)
    db.session.commit()
    return jsonify({"message": "Expense deleted"}), 200
