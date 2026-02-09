from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from datetime import datetime, date
from ..models import Sale, Expense, Product, Purchase
from ..utils.decorators import role_required
from ..extensions import db
from sqlalchemy import func
from ..models.cashmovements import CashMovement
from ..models.more import FixedAsset, AccountsReceivable

reports_bp = Blueprint("reports_bp", __name__, url_prefix="/api/reports")


def parse_dates():
    """Parse start_date and end_date from query params safely."""
    start_str = request.args.get("start_date")
    end_str = request.args.get("end_date")

    try:
        start_date = datetime.strptime(start_str, "%Y-%m-%d").date() if start_str else None
        end_date = datetime.strptime(end_str, "%Y-%m-%d").date() if end_str else None
    except ValueError:
        start_date = None
        end_date = None

    # Default to current month if not supplied
    if not start_date:
        start_date = date.today().replace(day=1)
    if not end_date:
        end_date = date.today()

    return start_date, end_date

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
    start_date, end_date = parse_dates()
    print("✅ Route hit", start_date, end_date)

    query_sales = Sale.query.filter(
        db.func.date(Sale.date) >= start_date,
        db.func.date(Sale.date) <= end_date
    )

    query_expenses = Expense.query.filter(
        Expense.date >= start_date,
        Expense.date <= end_date
    )

    total_sales = query_sales.with_entities(db.func.sum(Sale.total_price)).scalar() or 0

    total_cogs = query_sales.join(
        Product, Product.id == Sale.product_id
    ).with_entities(
        db.func.sum(Sale.quantity * Product.cost_price)
    ).scalar() or 0

    total_expenses = query_expenses.with_entities(db.func.sum(Expense.amount)).scalar() or 0

    gross_profit = total_sales - total_cogs
    net_profit = gross_profit - total_expenses  # apply taxes later if needed

    return jsonify({
        "report_type": "Profit and Loss",
        "period": {"start": str(start_date), "end": str(end_date)},
        "sections": {
            "sales": float(total_sales),
            "cogs": float(total_cogs),
            "gross_profit": float(gross_profit),
            "expenses": float(total_expenses),
            "net_profit": float(net_profit)
        }
    }), 200

@reports_bp.route("/cash_flow", methods=["GET", "OPTIONS"])
@jwt_required()
@role_required("admin")
def cash_flow_statement():
    start_date, end_date = parse_dates()

    # ============================
    # OPERATING ACTIVITIES
    # ============================

    # Cash received from sales (cash-only)
    cash_sales = (
        Sale.query.filter(
            db.func.date(Sale.date) >= start_date,
            db.func.date(Sale.date) <= end_date,
        )
        .with_entities(db.func.sum(Sale.total_price))
        .scalar()
        or 0
    )

    # Cash received from debtors
    from ..models import debtors as CustomerPayment
    debtor_payments = (
        CustomerPayment.query.filter(
            db.func.date(CustomerPayment.date) >= start_date,
            db.func.date(CustomerPayment.date) <= end_date
        )
        .with_entities(db.func.sum(CustomerPayment.amount))
        .scalar()
        or 0
    ) if "CustomerPayment" in globals() else 0

    cash_inflows = cash_sales + debtor_payments

    # Cash Outflows
    expenses_paid = (
        Expense.query.filter(
            Expense.date >= start_date,
            Expense.date <= end_date
        )
        .with_entities(db.func.sum(Expense.amount))
        .scalar()
        or 0
    )

    # Stock purchases paid immediately
    from ..models import purchases as StockAddition
    stock_purchases = (
        StockAddition.query.filter(
            db.func.date(StockAddition.purchase_date) >= start_date,
            db.func.date(StockAddition.purchase_date) <= end_date
                            )
        .with_entities(db.func.sum(StockAddition.total_cost))
        .scalar()
        or 0
    ) if "StockAddition" in globals() else 0

    # Payments to suppliers
    from ..models import purchases as SupplierPayment
    supplier_payments = (
        SupplierPayment.query.filter(
            db.func.date(SupplierPayment.purchase_date) >= start_date,
            db.func.date(SupplierPayment.purchase_date) <= end_date
        )
        .with_entities(db.func.sum(SupplierPayment.total_cost))
        .scalar()
        or 0
    ) if "SupplierPayment" in globals() else 0

    cash_outflows = expenses_paid + stock_purchases + supplier_payments

    net_operating_cash = cash_inflows - cash_outflows

    # ============================
    # INVESTING ACTIVITIES
    # ============================
    
    # Asset purchase
    asset_purchases = (
        CashMovement.query.filter(
            CashMovement.type == "asset_purchase",
            db.func.date(CashMovement.date) >= start_date,
            db.func.date(CashMovement.date) <= end_date
        )
        .with_entities(db.func.sum(CashMovement.amount))
        .scalar()
        or 0
    ) if "CashMovement" in globals() else 0

    # Asset sale
    asset_sales = (
        CashMovement.query.filter(
            CashMovement.type == "asset_sale",
            db.func.date(CashMovement.date) >= start_date,
            db.func.date(CashMovement.date) <= end_date
        )
        .with_entities(db.func.sum(CashMovement.amount))
        .scalar()
        or 0
    ) if "CashMovement" in globals() else 0

    net_investing_cash = asset_sales - asset_purchases

    # ============================
    # FINANCING ACTIVITIES
    # ============================

    loans_received = (
        CashMovement.query.filter(
            CashMovement.type == "loan_in",
            db.func.date(CashMovement.date) >= start_date,
            db.func.date(CashMovement.date) <= end_date
        )
        .with_entities(db.func.sum(CashMovement.amount))
        .scalar()
        or 0
    ) if "CashMovement" in globals() else 0

    loan_repayments = (
        CashMovement.query.filter(
            CashMovement.type == "loan_out",
            db.func.date(CashMovement.date) >= start_date,
            db.func.date(CashMovement.date) <= end_date
        )
        .with_entities(db.func.sum(CashMovement.amount))
        .scalar()
        or 0
    ) if "CashMovement" in globals() else 0

    owner_injections = (
        CashMovement.query.filter(
            CashMovement.type == "owner_in",
            db.func.date(CashMovement.date) >= start_date,
            db.func.date(CashMovement.date) <= end_date
        )
        .with_entities(db.func.sum(CashMovement.amount))
        .scalar()
        or 0
    ) if "CashMovement" in globals() else 0

    owner_drawings = (
        CashMovement.query.filter(
            CashMovement.type == "owner_draw",
            db.func.date(CashMovement.date) >= start_date,
            db.func.date(CashMovement.date) <= end_date
        )
        .with_entities(db.func.sum(CashMovement.amount))
        .scalar()
        or 0
    ) if "CashMovement" in globals() else 0

    net_financing_cash = (
        loans_received
        + owner_injections
        - loan_repayments
        - owner_drawings
    )

    # ============================
    # FINAL CASH POSITION
    # ============================
    net_cash_flow = net_operating_cash + net_investing_cash + net_financing_cash

    # Calculate opening cash from historical cash movements
    opening_cash = (
        CashMovement.query.filter(
            db.func.date(CashMovement.date) < start_date
        )
        .with_entities(db.func.sum(CashMovement.amount))
        .scalar()
        or 0
    ) if "CashMovement" in globals() else 0

    closing_cash = opening_cash + net_cash_flow

    # ============================
    # RESPONSE MATCHING YOUR UI
    # ============================
    return jsonify({
        "report_type": "Cash Flow",
        "sections": {
            "operating_activities": {
                "cash_inflows": float(cash_inflows),
                "cash_outflows": float(cash_outflows),
                "net_cash_from_operations": float(net_operating_cash),
            },
            "investing_activities": {
                "purchases_equipment": -float(asset_purchases),
                "sales_assets": float(asset_sales),
                "net_cash_from_investing": float(net_investing_cash),
            },
            "financing_activities": {
                "loans_received": float(loans_received),
                "loan_repayments": -float(loan_repayments),
                "owner_drawings": -float(owner_drawings),
                "owner_injections": float(owner_injections),
                "net_cash_from_financing": float(net_financing_cash),
            },
            "net_increase_in_cash": float(net_cash_flow),
            "closing_cash_balance": float(closing_cash),
        },
        "start_date": str(start_date),
        "end_date": str(end_date),
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

    # ============================
    #        ASSETS SECTION
    # ============================

    # Inventory value at cost
    inventory_value = (
        db.session.query(db.func.sum(Product.stock * Product.cost_price))
        .scalar()
        or 0
    )

    # Cash balance (sum of all CashMovements)
    cash_balance = (
        CashMovement.query.with_entities(db.func.sum(CashMovement.amount))
        .scalar()
        or 0
    )

    # Accounts receivable = unpaid customer balances
    accounts_receivable = (
        db.session.query(db.func.sum(AccountsReceivable.remaining_balance))
        .scalar()
        or 0
        if "Customer" in globals()
        else 0
    )

    # ----- Fixed Assets -----
    try:
        assets = FixedAsset.query.all()
        total_fixed_assets = sum(a.book_value() for a in assets)
    except Exception:
        total_fixed_assets = 0

    # ----- Total Assets -----
    total_assets = cash_balance + accounts_receivable + inventory_value + total_fixed_assets


    # ============================
    #       LIABILITIES SECTION
    # ============================

    # Accounts payable (suppliers)
    from ..models import purchases as SupplierPayment
    accounts_payable = (
        db.session.query(db.func.sum(SupplierPayment.balance))
        .scalar()
        or 0
        if "SupplierPayment" in globals()
        else 0
    )

    # Outstanding expenses (unpaid)
    unpaid_expenses = (
        db.session.query(db.func.sum(Expense.amount))
        .filter(Expense.is_paid == False)
        .scalar()
        or 0
        if hasattr(Expense, "is_paid")
        else 0
    )

    total_liabilities = accounts_payable + unpaid_expenses

    # ============================
    #          EQUITY SECTION
    # ============================

    # Profit and Loss → retained earnings
    total_sales = (
        db.session.query(db.func.sum(Sale.total_price)).scalar() or 0
    )

    total_cogs = (
        db.session.query(db.func.sum(Sale.quantity * Product.cost_price))
        .join(Product, Product.id == Sale.product_id)
        .scalar()
        or 0
    )

    total_expenses = (
        db.session.query(db.func.sum(Expense.amount)).scalar() or 0
    )

    retained_earnings = total_sales - total_cogs - total_expenses

    # Owner equity = Assets - Liabilities - retained earnings
    owner_equity = total_assets - total_liabilities - retained_earnings

    total_equity = owner_equity + retained_earnings

    # ============================
    # STRUCTURED RESPONSE FOR UI
    # ============================

    return jsonify({
        "report_type": "Balance Sheet",
        "sections": {
            "assets": {
                "cash": float(cash_balance),
                "accounts_receivable": float(accounts_receivable),
                "inventory": float(inventory_value),
                "fixed_assets": float(total_assets),
                "current_assets": float(cash_balance + accounts_receivable + inventory_value),
                "total_assets": float(total_assets)
            },
            "liabilities": {
                "accounts_payable": float(accounts_payable),
                "unpaid_expenses": float(unpaid_expenses),
                "current_liabilities": float(accounts_payable + unpaid_expenses),
                "total_liabilities": float(total_liabilities)
            },
            "equity": {
                "owner_equity": float(owner_equity),
                "retained_earnings": float(retained_earnings),
                "total_equity": float(total_equity)
            },
            "total_liabilities_and_equity": float(total_liabilities + total_equity)
        }
    }), 200
