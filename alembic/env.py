from backend.app import create_app
from backend.extensions import db

app = create_app()
app.app_context().push()

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