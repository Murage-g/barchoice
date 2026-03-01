import os
from alembic import context
from sqlalchemy import create_engine, pool

from backend.extensions import db

# Import ALL models so they register with metadata
from backend.models.product import Product, DailyStock, DailyClose
from backend.models.sales import Sale
from backend.models.debtors import Debtor, DebtTransaction
from backend.models.reconciliation import Expense, Reconciliation, ReconciliationLine
from backend.models.purchases import Supplier, Purchase
from backend.models.wholesale import WholesaleClient, WholesaleSale
from backend.models.waiter import Waiter, WaiterBill
from backend.models.user import User
from backend.models.more import FixedAsset, AccountsReceivable
from backend.models.ConversionHistory import ConversionHistory
from backend.models.cashmovements import CashMovement
from backend.models.purchase_undo import PurchaseUndoLog
from backend.models.purchase_offer import PurchaseOffer

target_metadata = db.metadata
config = context.config


def run_migrations_online():
    connectable = create_engine(
        os.getenv("DATABASE_URL"),
        poolclass=pool.NullPool,
        pool_pre_ping=True,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()