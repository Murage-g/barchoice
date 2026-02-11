from datetime import datetime
from ..extensions import db

class Waiter(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    daily_salary = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default="active")  # active, fired, suspended
    bills = db.relationship('WaiterBill', backref='waiter', lazy=True)

    def total_outstanding(self):
        return sum(b.total_amount for b in self.bills if not b.is_settled)

    def to_dict(self, include_bills=False, include_outstanding=False):
        data = {
            "id": self.id,
            "name": self.name,
            "daily_salary": self.daily_salary,
            "status": self.status,
        }

        if include_bills:
            data["bills"] = [b.to_dict() for b in self.bills]

        if include_outstanding:
            data["total_outstanding"] = self.total_outstanding()

        return data


class WaiterBill(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    waiter_id = db.Column(db.Integer, db.ForeignKey('waiter.id'), nullable=False)
    bill_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    total_amount = db.Column(db.Float, default=0.0)
    description = db.Column(db.String(255))
    is_settled = db.Column(db.Boolean, default=False)
    settled_date = db.Column(db.Date)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "waiter_id": self.waiter_id,
            "total_amount": self.total_amount,
            "description": self.description,
            "is_settled": self.is_settled,
            "bill_date": self.bill_date.isoformat(),
            "settled_date": self.settled_date.isoformat() if self.settled_date else None,
            "date": self.date.isoformat(),
        }
