# backend/routes/recon_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.decorators import role_required
from ..extensions import db
from ..models.reconciliation import Reconciliation, ReconciliationLine
from ..models import DailyClose, Product  # adjust import path if your models are elsewhere
from ..models import Debtor, DebtTransaction, Waiter, WaiterBill
from ..models.cashmovements import CashMovement
from datetime import datetime, date, timedelta
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

        # Handle adjustment lines
        for line in lines:
            kind = line.get("kind")
            desc = line.get("description", "")
            amount = float(line.get("amount", 0))
            related_id = line.get("relatedId")

            if amount == 0:
                continue

            if kind == "expense":
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
            elif kind == "debtor":
                debtor = Debtor.query.get(related_id)
                if debtor:
                    debtor.total_debt += amount
                    db.session.add(DebtTransaction(
                        debtor_id=debtor.id,
                        amount=amount,
                        outstanding_debt=amount,
                        description=desc,
                        issued_by=user,
                        date=date,
                        due_date=date + timedelta(days=5)
                    ))
            elif kind == "waiter":
                waiter = Waiter.query.get(related_id)
                if waiter:
                    db.session.add(WaiterBill(
                        waiter_id=waiter.id,
                        total_amount=amount,
                        description=desc,
                        bill_date=date,
                        is_settled=False
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

@recon_bp.route("/waiter/create", methods=["POST"])
@jwt_required()
@role_required("admin")
def create_waiter():
    data = request.get_json()
    name = data.get("name")
    salary = float(data.get("daily_salary", 0))

    waiter = Waiter(name=name, daily_salary=salary)
    db.session.add(waiter)
    db.session.commit()

    return jsonify(waiter.to_dict()), 201

@recon_bp.route("/waiter/<int:waiter_id>/status", methods=["PUT"])
@jwt_required()
@role_required("admin")
def update_waiter_status(waiter_id):
    data = request.get_json()
    status = data.get("status")
    waiter = Waiter.query.get_or_404(waiter_id)
    waiter.status = status
    db.session.commit()
    return jsonify(waiter.to_dict()), 200

@recon_bp.route("/waiter/list", methods=["GET"])
@jwt_required()
@role_required("admin")
def list_waiters():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    status = request.args.get("status")
    search = request.args.get("search")
    sort = request.args.get("sort")   # outstanding_desc / outstanding_asc
    export = request.args.get("export")  # csv

    query = Waiter.query

    # FILTER BY STATUS
    if status:
        query = query.filter_by(status=status)

    # SEARCH BY NAME
    if search:
        query = query.filter(Waiter.name.ilike(f"%{search}%"))

    # PAGINATE FIRST (SQLAlchemy requires this before sorting in-memory)
    paginated = query.order_by(Waiter.id.asc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    waiters = [
        w.to_dict(include_bills=True, include_outstanding=True)
        for w in paginated.items
    ]

    # SORT BY OUTSTANDING (in-memory)
    if sort == "outstanding_desc":
        waiters = sorted(waiters, key=lambda w: w["total_outstanding"], reverse=True)
    elif sort == "outstanding_asc":
        waiters = sorted(waiters, key=lambda w: w["total_outstanding"])

    # EXPORT TO CSV
    if export == "csv":
        import csv
        from flask import Response
        from io import StringIO

        output = StringIO()
        writer = csv.writer(output)

        writer.writerow(["id", "name", "status", "daily_salary", "total_outstanding"])

        for w in waiters:
            writer.writerow([
                w["id"],
                w["name"],
                w["status"],
                w["daily_salary"],
                w["total_outstanding"],
            ])

        output.seek(0)
        return Response(
            output,
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=waiters.csv"}
        )

    return jsonify({
        "items": waiters,
        "page": paginated.page,
        "per_page": paginated.per_page,
        "total": paginated.total,
        "pages": paginated.pages,
        "has_next": paginated.has_next,
        "has_prev": paginated.has_prev,
    }), 200



@recon_bp.route("/debtor/create", methods=["POST"])
@jwt_required()
@role_required("admin")
def create_debtor():
    data = request.get_json()
    name = data.get("name")
    phone = data.get("phone")
    debtor = Debtor(name=name, phone=phone)
    db.session.add(debtor)
    db.session.commit()
    return jsonify(debtor.to_dict()), 201

@recon_bp.route("/debtor/list", methods=["GET"])
@jwt_required()
@role_required("admin")
def list_debtors():
    debtors = Debtor.query.all()
    return jsonify([d.to_dict() for d in debtors]), 200

@recon_bp.route("/debtor/<int:debtor_id>", methods=["GET"])
@jwt_required()
@role_required("admin")
def get_debtor(debtor_id):
    debtor = Debtor.query.get_or_404(debtor_id)
    return jsonify(debtor.to_dict()), 200

@recon_bp.route("/waiter/bill/<int:bill_id>/settle", methods=["PUT"])
@jwt_required()
@role_required("admin")
def settle_waiter_bill(bill_id):
    bill = WaiterBill.query.get_or_404(bill_id)

    bill.is_settled = True
    bill.settled_date = datetime.utcnow().date()

    db.session.commit()

    return jsonify(bill.to_dict()), 200

