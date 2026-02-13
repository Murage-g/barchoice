from datetime import datetime, timedelta
from ..extensions import db


class Debtor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(40))

    transactions = db.relationship("DebtTransaction", backref="debtor", lazy=True)

    @property
    def total_debt(self):
        total = 0
        for t in self.transactions:
            total += t.outstanding_amount
        return float(total)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "total_debt": self.total_debt
        }

class DebtTransaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    debtor_id = db.Column(db.Integer, db.ForeignKey("debtor.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(255))
    issued_by = db.Column(db.String(80))
    date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime, nullable=False,
                         default=lambda: datetime.utcnow() + timedelta(days=5))

    payments = db.relationship("DebtPayment", backref="transaction", lazy=True)

    @property
    def paid_amount(self):
        return sum(p.amount for p in self.payments)

    @property
    def outstanding_amount(self):
        return float(self.amount - self.paid_amount)

    @property
    def is_paid(self):
        return self.outstanding_amount <= 0

    def to_dict(self):
        return {
            "id": self.id,
            "debtor_id": self.debtor_id,
            "amount": float(self.amount),
            "paid_amount": float(self.paid_amount),
            "outstanding_amount": float(self.outstanding_amount),
            "is_paid": self.is_paid,
            "description": self.description,
            "issued_by": self.issued_by,
            "date": self.date.isoformat(),
            "due_date": self.due_date.isoformat(),
        }

class DebtPayment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(
        db.Integer,
        db.ForeignKey("debt_transaction.id"),
        nullable=False
    )
    amount = db.Column(db.Float, nullable=False)
    received_by = db.Column(db.String(80))
    date = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "transaction_id": self.transaction_id,
            "amount": float(self.amount),
            "received_by": self.received_by,
            "date": self.date.isoformat()
        }
