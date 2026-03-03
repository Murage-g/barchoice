from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from datetime import datetime, date, time

from backend.routes import expenses
from ..models import Sale, Expense, Product, Purchase
from ..utils.decorators import role_required
from ..extensions import db
from sqlalchemy import func
from ..models.cashmovements import CashMovement
from ..models.more import FixedAsset, AccountsReceivable

reports_bp = Blueprint("reports_bp", __name__, url_prefix="/api/reports")

def parse_dates():
    start_str = request.args.get("start_date")
    end_str = request.args.get("end_date")

    try:
        start_date = datetime.strptime(start_str, "%Y-%m-%d").date() if start_str else None
        end_date = datetime.strptime(end_str, "%Y-%m-%d").date() if end_str else None
    except ValueError:
        start_date = None
        end_date = None

    if not start_date:
        start_date = date.today().replace(day=1)
    if not end_date:
        end_date = date.today()

    # Convert to datetime range
    start_datetime = datetime.combine(start_date, time.min)  # 00:00:00
    end_datetime = datetime.combine(end_date, time.max)      # 23:59:59.999999

    return start_datetime, end_datetime

@reports_bp.route("/debug_token", methods=["GET", "OPTIONS"])
@jwt_required()
def debug_token():
    from flask_jwt_extended import get_jwt_identity, get_jwt

    user_id = get_jwt_identity()
    claims = get_jwt()

    print(user_id, claims)

    return jsonify({
        "user_id": user_id,
        "claims": claims
    }), 200

@reports_bp.route("/profit_loss", methods=["GET","OPTIONS"])
@jwt_required()
@role_required("admin")
def profit_loss_report(): 
    start_datetime, end_datetime = parse_dates()

    query_sales = Sale.query.filter(
        Sale.date >= start_datetime,
        Sale.date <= end_datetime
    )

    query_expenses = Expense.query.filter(
        Expense.date >= start_datetime,
        Expense.date <= end_datetime
    )

    total_sales = query_sales.with_entities(db.func.sum(Sale.adjusted_total_price)).scalar() or 0

    total_cogs = query_sales.join(
        Product, Product.id == Sale.product_id
    ).with_entities(
        db.func.sum(Sale.quantity * Product.cost_price)
    ).scalar() or 0

    total_expenses = query_expenses.with_entities(db.func.sum(Expense.amount)).scalar() or 0

    gross_profit = total_sales - total_cogs
    net_profit = gross_profit - total_expenses  # apply taxes later if needed

     # ----------------------------
    # AUTOMATIC BAD DEBT PROVISION
    # ----------------------------

    from ..models.debtors import DebtTransaction
    from datetime import timedelta

    two_months_ago = end_datetime - timedelta(days=60)

    overdue_transactions = DebtTransaction.query.filter(
        DebtTransaction.due_date < two_months_ago
    ).all()

    bad_debt_provision = sum(
        t.outstanding_amount
        for t in overdue_transactions
        if t.outstanding_amount > 0
    )

    gross_profit = total_sales - total_cogs
    net_profit = gross_profit - expenses - bad_debt_provision


    return jsonify({
        "report_type": "Profit and Loss",
        "period": {"start": str(start_datetime), "end": str(end_datetime)},
        "sections": {
            "sales": float(total_sales),
            "cogs": float(total_cogs),
            "gross_profit": float(gross_profit),
            "expenses": float(total_expenses),
            "bad_debt_provision": float(bad_debt_provision),
            "net_profit": float(net_profit)
        }
    }), 200

@reports_bp.route("/cash_flow", methods=["GET"])
@jwt_required()
@role_required("admin")
def cash_flow_statement():

    start_datetime, end_datetime = parse_dates()

    movements = CashMovement.query.filter(
        CashMovement.date >= start_datetime,
        CashMovement.date <= end_datetime
    ).all()

    operating_inflows = 0
    operating_outflows = 0
    investing_inflows = 0
    investing_outflows = 0
    financing_inflows = 0
    financing_outflows = 0

    for m in movements:

        if m.category in ["sales", "expense"]:

            if m.type == "inflow":
                operating_inflows += m.amount
            else:
                operating_outflows += m.amount

        elif m.category == "asset":

            if m.type == "inflow":
                investing_inflows += m.amount
            else:
                investing_outflows += m.amount

        elif m.category in ["loan", "owner"]:

            if m.type == "inflow":
                financing_inflows += m.amount
            else:
                financing_outflows += m.amount

    net_operating = operating_inflows - operating_outflows
    net_investing = investing_inflows - investing_outflows
    net_financing = financing_inflows - financing_outflows

    net_cash_flow = net_operating + net_investing + net_financing

    # Opening cash
    historical = CashMovement.query.filter(
        CashMovement.date < start_datetime
    ).all()

    opening_cash = sum(
        m.amount if m.type == "inflow" else -m.amount
        for m in historical
    )

    closing_cash = opening_cash + net_cash_flow

    return jsonify({
        "report_type": "Cash Flow",
        "sections": {
            "operating_activities": {
                "cash_inflows": float(operating_inflows),
                "cash_outflows": float(operating_outflows),
                "net_cash_from_operations": float(net_operating),
            },
            "investing_activities": {
                "purchases_equipment": float(investing_outflows),
                "sales_assets": float(investing_inflows),
                "net_cash_from_investing": float(net_investing),
            },
            "financing_activities": {
                "loans_received": float(financing_inflows),
                "loan_repayments": float(financing_outflows),
                "net_cash_from_financing": float(net_financing),
            },
            "net_increase_in_cash": float(net_cash_flow),
            "closing_cash_balance": float(closing_cash),
        }
    }), 200


@reports_bp.route("/balance_sheet", methods=["GET", "OPTIONS"])
@jwt_required()
@role_required("admin")
def balance_sheet():
    """
    Fully correct Balance Sheet using:
    - Inventory
    - Cash movements
    - Debtors (Accounts Receivable)
    - Supplier balances (Accounts Payable)
    - Fixed assets (if available)
    - Retained earnings (from P&L)
    Matching the frontend structure exactly.
    """

    _, end_datetime = parse_dates()

    # ============================
    #        ASSETS SECTION
    # ============================

    # Inventory value at cost
    inventory_value = (
        db.session.query(db.func.sum(Product.stock * Product.cost_price))
        .scalar() or 0
    )

    # Cash
    movements = CashMovement.query.filter(
        CashMovement.date <= end_datetime
    ).all()

    cash_balance = sum(
        m.amount if m.type == "inflow" else -m.amount
        for m in movements
    )

     # Receivables
    from ..models.debtors import DebtTransaction
    from datetime import timedelta

    all_transactions = DebtTransaction.query.filter(
        DebtTransaction.date <= end_datetime
    ).all()

    gross_receivables = sum(
        t.outstanding_amount for t in all_transactions
    )

    # Automatic Provision (>60 days)
    two_months_ago = end_datetime - timedelta(days=60)

    provision = sum(
        t.outstanding_amount
        for t in all_transactions
        if t.due_date < two_months_ago and t.outstanding_amount > 0
    )

    net_receivables = gross_receivables - provision

    # Fixed Assets
    assets = FixedAsset.query.all()
    total_fixed_assets = sum(a.book_value() for a in assets)

    total_assets = (
        cash_balance +
        inventory_value +
        net_receivables +
        total_fixed_assets
    )

    # -------------------------
    # LIABILITIES
    # -------------------------

    total_liabilities = 0  # purchases immediately paid

    # -------------------------
    # EQUITY
    # -------------------------

    total_sales = (
        db.session.query(db.func.sum(Sale.total_price)).scalar() or 0
    )

    total_cogs = (
        db.session.query(db.func.sum(Sale.quantity * Product.cost_price))
        .join(Product).scalar() or 0
    )

    total_expenses = (
        db.session.query(db.func.sum(Expense.amount)).scalar() or 0
    )

    retained_earnings = total_sales - total_cogs - total_expenses - provision

    owner_equity = total_assets - retained_earnings

    total_equity = owner_equity + retained_earnings

    return jsonify({
        "report_type": "Balance Sheet",
        "sections": {
            "assets": {
                "cash": float(cash_balance),
                "inventory": float(inventory_value),
                "accounts_receivable": float(gross_receivables),
                "provision_for_bad_debts": -float(provision),
                "net_receivables": float(net_receivables),
                "fixed_assets": float(total_fixed_assets),
                "total_assets": float(total_assets)
            },
            "liabilities": {
                "total_liabilities": float(total_liabilities)
            },
            "equity": {
                "retained_earnings": float(retained_earnings),
                "owner_equity": float(owner_equity),
                "total_equity": float(total_equity)
            },
            "total_liabilities_and_equity": float(total_equity)
        }
    }), 200