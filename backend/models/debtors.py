from datetime import datetime
from ..extensions import db

class Debtor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(40))
    total_debt = db.Column(db.Float, default=0.0)
    transactions = db.relationship("DebtTransaction", backref="debtor", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "total_debt": float(self.total_debt),
        }


class DebtTransaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    debtor_id = db.Column(db.Integer, db.ForeignKey("debtor.id"), nullable=False)
    amount = db.Column(db.Float, default=0.0)
    is_paid = db.Column(db.Boolean, default=False)
    outstanding_debt = db.Column(db.Float, default=0.0)
    description = db.Column(db.String(255))
    issued_by = db.Column(db.String(80))
    date = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "debtor_id": self.debtor_id,
            "amount": float(self.amount),
            "is_paid": self.is_paid,
            "outstanding_debt": float(self.outstanding_debt),
            "description": self.description,
            "issued_by": self.issued_by,
            "date": self.date.isoformat(),
        }
