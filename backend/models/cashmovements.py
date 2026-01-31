from datetime import datetime
from ..extensions import db

class CashMovement(db.Model):
    __tablename__ = "cash_movements"

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    source = db.Column(db.String(50), nullable=False)  # e.g. "Sales", "Mpesa Till 1", "Bank", "Cash"
    type = db.Column(db.String(10), nullable=False)    # "inflow" or "outflow"
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(255))
    reference = db.Column(db.String(100))              # optional: transaction ID, invoice ref, etc.
    recorded_by = db.Column(db.String(50))             # user who recorded this movement

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date.strftime("%Y-%m-%d"),
            "source": self.source,
            "type": self.type,
            "amount": self.amount,
            "description": self.description,
            "reference": self.reference,
            "recorded_by": self.recorded_by,
        }
