# backend/routes/recon_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.decorators import role_required
from ..extensions import db
from ..models.reconciliation import Reconciliation, ReconciliationLine
from ..models import DailyClose, Product  # adjust import path if your models are elsewhere
from ..models import Debtor  # example if needed
from ..models.cashmovements import CashMovement
from datetime import datetime, date
from ..utils.expense_helpers import record_expense

recon_bp = Blueprint("recon_bp", __name__, url_prefix="/api/recon")

@recon_bp.route("/create", methods=["POST"])
@jwt_required()
@role_required("admin", "cashier")
def create_reconciliation():
    data = request.get_json()
    user = get_jwt_identity()

    try:
        date = datetime.strptime(data.get("date"), "%Y-%m-%d").date()
        mpesa1 = float(data.get("mpesa1", 0))
        mpesa2 = float(data.get("mpesa2", 0))
        mpesa3 = float(data.get("mpesa3", 0))
        cash_on_hand = float(data.get("cash_on_hand", 0))
        notes = data.get("notes", "")
        lines = data.get("lines", [])

        # Record Mpesa and Cash inflows
        inflows = [
            {"source": "Mpesa Till 1", "amount": mpesa1},
            {"source": "Mpesa Till 2", "amount": mpesa2},
            {"source": "Mpesa Till 3", "amount": mpesa3},
            {"source": "Cash On Hand", "amount": cash_on_hand},
        ]

        for item in inflows:
            if item["amount"] > 0:
                db.session.add(CashMovement(
                    date=date,
                    source=item["source"],
                    type="inflow",
                    amount=item["amount"],
                    description=f"Recorded from reconciliation ({notes})",
                    recorded_by=user,
                ))

        # Record adjustment lines (expenses, sales, other)
        for line in lines:
            kind = line.get("kind")
            desc = line.get("description", "")
            amount = float(line.get("amount", 0))

            if amount == 0:
                continue

            if kind == "expense":
                # record expense + cash movement automatically
                record_expense(
                    date=date,
                    amount=amount,
                    description=desc,
                    category="Reconciliation Adjustment",
                    user_id=user
                )
            elif kind == "sale":
                db.session.add(CashMovement(
                    date=date,
                    source="Adjustment - Sale",
                    type="inflow",
                    amount=amount,
                    description=desc,
                    recorded_by=user,
                ))
            else:
                db.session.add(CashMovement(
                    date=date,
                    source="Adjustment - Other",
                    type="inflow",
                    amount=amount,
                    description=desc,
                    recorded_by=user,
                ))


        db.session.commit()
        return jsonify({"message": "Reconciliation saved successfully"}), 201

    except Exception as e:
        db.session.rollback()
        print("Reconciliation Error:", e)
        return jsonify({"error": str(e)}), 400


@recon_bp.route("/summary", methods=["GET"])
@jwt_required()
@role_required("admin", "cashier")
def recon_summary():
    date_str = request.args.get("date")
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else datetime.utcnow().date()
    except ValueError:
        return jsonify({"error": "invalid date format"}), 400

    # SALES from DailyClose
    closes = DailyClose.query.filter_by(date=d).all()
    total_sales = sum(c.revenue for c in closes) if closes else 0.0

    # EXPENSES from CashMovement (NOT Expense table)
    expenses = (
        CashMovement.query
        .filter(
            db.func.date(CashMovement.date) == d,
            CashMovement.type == "outflow"
        )
        .all()
    )
    total_expenses = sum(e.amount for e in expenses) if expenses else 0.0

    return jsonify({
        "date": d.isoformat(),
        "total_sales": round(total_sales, 2),
        "total_expenses": round(total_expenses, 2),
    }), 200


@recon_bp.route("/<int:recon_id>", methods=["GET"])
@jwt_required()
@role_required("admin", "cashier")
def get_recon(recon_id):
    recon = Reconciliation.query.get_or_404(recon_id)
    return jsonify(recon.to_dict()), 200

@recon_bp.route("/history", methods=["GET"])
@jwt_required()
@role_required("admin")
def recon_history():
    # admin-only: return existing reconciliations
    items = Reconciliation.query.order_by(Reconciliation.date.desc(), Reconciliation.created_at.desc()).all()
    return jsonify([r.to_dict() for r in items]), 200
