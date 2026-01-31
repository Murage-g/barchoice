# backend/utils/expense_helpers.py

from ..models.reconciliation import Expense
from ..models.cashmovements import CashMovement
from ..extensions import db

def record_expense(date, amount, description, category, user_id):
    """
    Creates:
      - Expense row
      - CashMovement row (outflow)
    Returns the Expense object.
    """

    # Create expense table record
    expense = Expense(
        created_by=user_id,
        date=date,
        amount=amount,
        description=description,
        category=category
    )
    db.session.add(expense)

    # Create cash movement record
    movement = CashMovement(
        date=date,
        source=f"Expense - {category}" if category else "Expense",
        type="outflow",
        amount=amount,
        description=description,
        recorded_by=user_id
    )
    db.session.add(movement)

    return expense
