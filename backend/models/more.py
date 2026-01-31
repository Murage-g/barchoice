from datetime import datetime, date
from ..extensions import db

class FixedAsset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    purchase_date = db.Column(db.Date, nullable=False)
    cost = db.Column(db.Float, nullable=False)
    useful_life_years = db.Column(db.Integer, nullable=False)
    salvage_value = db.Column(db.Float, default=0)

    # annual depreciation = (cost – salvage) / useful life
    def accumulated_depreciation(self):
        years_passed = max((date.today() - self.purchase_date).days // 365, 0)
        years_passed = min(years_passed, self.useful_life_years)  # avoid negative BV
        return self.annual_depreciation() * years_passed

    def book_value(self):
        return max(self.cost - self.accumulated_depreciation(), 0)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "purchase_date": str(self.purchase_date),
            "cost": self.cost,
            "useful_life_years": self.useful_life_years,
            "salvage_value": self.salvage_value,
            "annual_depreciation": self.annual_depreciation(),
            "accumulated_depreciation": self.accumulated_depreciation(),
            "book_value": self.book_value()
        }


class AccountsReceivable(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(120), nullable=False)
    sale_id = db.Column(db.Integer, db.ForeignKey("sale.id"), nullable=True)

    amount_owed = db.Column(db.Float, nullable=False)   # open balance
    amount_paid = db.Column(db.Float, default=0)        # cumulative payments
    status = db.Column(db.String(50), default="unpaid") # unpaid / partial / paid

    last_payment_date = db.Column(db.Date)

    def remaining_balance(self):
        return self.amount_owed - self.amount_paid

    def to_dict(self):
        return {
            "id": self.id,
            "customer_name": self.customer_name,
            "sale_id": self.sale_id,
            "amount_owed": self.amount_owed,
            "amount_paid": self.amount_paid,
            "remaining_balance": self.remaining_balance(),
            "status": self.status,
            "last_payment_date": str(self.last_payment_date) if self.last_payment_date else None
        }

