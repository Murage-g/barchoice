# backend/routes/recon_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from psycopg2 import IntegrityError
from ..utils.decorators import role_required
from ..extensions import db
from ..models.reconciliation import Reconciliation, ReconciliationLine
from ..models import DailyClose, Product  # adjust import path if your models are elsewhere
from ..models import Debtor, DebtTransaction, Waiter, WaiterBill
from ..models.debtors import DebtPayment
from ..models.cashmovements import CashMovement
from datetime import datetime, date, timedelta
from ..utils.expense_helpers import record_expense
# PDF imports
from flask import send_file
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import pagesizes
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from io import BytesIO

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
    closes = (
        DailyClose.query
        .filter(db.func.date(DailyClose.date) == d)
        .all()
    )
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
    data = request.get_json() or {}

    name = data.get("name")
    phone = data.get("phone")

    if not name:
        return jsonify({"error": "Name is required"}), 400

    debtor = Debtor(name=name.strip(), phone=phone)

    try:
        db.session.add(debtor)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Debtor already exists"}), 400

    return jsonify(debtor.to_dict()), 201


@recon_bp.route("/debtor/list", methods=["GET"])
@jwt_required()
@role_required("admin")
def list_debtors():
    debtors = Debtor.query.order_by(Debtor.name.asc()).all()
    return jsonify([d.to_dict() for d in debtors]), 200

@recon_bp.route("/debtor/<int:debtor_id>", methods=["GET"])
@jwt_required()
@role_required("admin")
def get_debtor(debtor_id):
    debtor = Debtor.query.get_or_404(debtor_id)
    return jsonify(debtor.to_dict()), 200

@recon_bp.route("/debtor/transaction/<int:transaction_id>/pay", methods=["POST"])
@jwt_required()
@role_required("admin")
def create_payment(transaction_id):

    data = request.get_json() or {}

    try:
        amount = float(data.get("amount", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid amount format"}), 400

    transaction = DebtTransaction.query.get_or_404(transaction_id)

    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400

    if amount > transaction.outstanding_amount:
        return jsonify({"error": "Amount exceeds outstanding debt"}), 400

    payment = DebtPayment(
        transaction_id=transaction.id,
        amount=amount,
        received_by=get_jwt_identity()
    )

    db.session.add(payment)
    db.session.commit()

    return jsonify({
        "message": "Payment recorded",
        "transaction": transaction.to_dict(),
        "debtor_total_debt": transaction.debtor.total_debt
    }), 201


@recon_bp.route("/debtor/<int:debtor_id>/transactions", methods=["GET"])
@jwt_required()
@role_required("admin")
def debtor_transactions(debtor_id):
    transactions = DebtTransaction.query.filter_by(
        debtor_id=debtor_id
    ).order_by(DebtTransaction.date.desc()).all()

    return jsonify([t.to_dict() for t in transactions]), 200


@recon_bp.route("/waiter/bill/<int:bill_id>/settle", methods=["PUT"])
@jwt_required()
@role_required("admin")
def settle_waiter_bill(bill_id):
    bill = WaiterBill.query.get_or_404(bill_id)

    bill.is_settled = True
    bill.settled_date = datetime.utcnow().date()

    db.session.commit()

    return jsonify(bill.to_dict()), 200

@recon_bp.route("/<int:recon_id>/report", methods=["GET"])
@jwt_required()
@role_required("admin", "cashier")
def generate_reconciliation_report(recon_id):

    recon = Reconciliation.query.get_or_404(recon_id)

    # Get sales
    closes = (
        DailyClose.query
        .filter(db.func.date(DailyClose.date) == recon.date)
        .all()
    )

    total_sales = sum(c.revenue for c in closes) if closes else 0.0

    # Get expenses
    expenses = (
        CashMovement.query
        .filter(
            db.func.date(CashMovement.date) == recon.date,
            CashMovement.type == "outflow"
        )
        .all()
    )
    total_expenses = sum(e.amount for e in expenses) if expenses else 0.0

    # Totals
    mpesa_total = recon.mpesa1 + recon.mpesa2 + recon.mpesa3
    counted_total = mpesa_total + recon.cash_on_hand

    adjustments_total = sum(l.amount for l in recon.lines)
    expected_cash = total_sales - adjustments_total
    difference = counted_total - total_sales + adjustments_total

    # Create PDF buffer
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=pagesizes.A4)
    elements = []

    styles = getSampleStyleSheet()
    title_style = styles["Heading1"]
    normal_style = styles["Normal"]

    # Title
    elements.append(Paragraph("RECONCILIATION REPORT", title_style))
    elements.append(Spacer(1, 0.3 * inch))

    # Basic Info Table
    info_data = [
        ["Date", recon.date.isoformat()],
        ["Created At", recon.created_at.strftime("%Y-%m-%d %H:%M")],
        ["Recorded By", str(recon.created_by)],
    ]

    info_table = Table(info_data, colWidths=[150, 300])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
    ]))

    elements.append(info_table)
    elements.append(Spacer(1, 0.4 * inch))

    # Financial Summary Table
    summary_data = [
        ["Total Sales", f"KSh {total_sales:,.2f}"],
        ["Total Expenses", f"KSh {total_expenses:,.2f}"],
        ["Mpesa Total", f"KSh {mpesa_total:,.2f}"],
        ["Cash on Hand", f"KSh {recon.cash_on_hand:,.2f}"],
        ["Adjustments Total", f"KSh {adjustments_total:,.2f}"],
        ["Surplus / Shortfall", f"KSh {difference:,.2f}"],
    ]

    summary_table = Table(summary_data, colWidths=[200, 250])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
    ]))

    elements.append(summary_table)
    elements.append(Spacer(1, 0.4 * inch))

    # Adjustments Section
    if recon.lines:
        elements.append(Paragraph("Adjustments", styles["Heading2"]))
        elements.append(Spacer(1, 0.2 * inch))

        lines_data = [["Type", "Description", "Amount"]]

        for l in recon.lines:
            lines_data.append([
                l.kind,
                l.description or "",
                f"KSh {l.amount:,.2f}"
            ])

        lines_table = Table(lines_data, colWidths=[100, 250, 100])
        lines_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))

        elements.append(lines_table)

    # Notes
    if recon.notes:
        elements.append(Spacer(1, 0.4 * inch))
        elements.append(Paragraph("Notes:", styles["Heading2"]))
        elements.append(Paragraph(recon.notes, normal_style))

    # Build PDF
    doc.build(elements)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"reconciliation_{recon.date}.pdf",
        mimetype="application/pdf"
    )

@recon_bp.route("/<int:recon_id>/reopen", methods=["PUT"])
@jwt_required()
@role_required("admin")
def reopen_reconciliation(recon_id):
    recon = Reconciliation.query.get_or_404(recon_id)

    recon.is_locked = False
    db.session.commit()

    return jsonify({
        "message": "Reconciliation reopened",
        "reconciliation_id": recon.id
    }), 200

@recon_bp.route("/status", methods=["GET"])
@jwt_required()
@role_required("admin", "cashier")
def reconciliation_status():
    date_str = request.args.get("date")
    if not date_str:
        return jsonify({"error": "date required"}), 400

    recon_date = datetime.strptime(date_str, "%Y-%m-%d").date()

    existing = (
        Reconciliation.query
        .filter_by(date=recon_date)
        .order_by(Reconciliation.created_at.desc())
        .first()
    )

    if not existing:
        return jsonify({"status": "none"}), 200

    # Check if new sales exist
    latest_close = (
        DailyClose.query
        .filter(db.func.date(DailyClose.date) == recon_date)
        .order_by(DailyClose.date.desc())
        .first()
    )

    has_new_sales = (
        latest_close and latest_close.date > existing.created_at
    )

    return jsonify({
        "status": "locked" if existing.is_locked else "open",
        "has_new_sales": bool(has_new_sales),
        "reconciliation_id": existing.id
    }), 200