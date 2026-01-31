# backend/models/reconciliation.py
from datetime import datetime
from ..extensions import db

class Expense(db.Model):
    __tablename__ = "expense"
    id = db.Column(db.Integer, primary_key=True)
    created_by = db.Column(db.Integer, nullable=True)   # optional user id
    date = db.Column(db.Date, default=datetime.utcnow().date)
    category = db.Column(db.String(120), nullable=True)
    description = db.Column(db.String(300), nullable=True)
    amount = db.Column(db.Float, nullable=False, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "created_by": self.created_by,
            "date": self.date.isoformat() if self.date else None,
            "category": self.category,
            "description": self.description,
            "amount": float(self.amount),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class Reconciliation(db.Model):
    __tablename__ = "reconciliation"
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    created_by = db.Column(db.Integer, nullable=True)
    mpesa1 = db.Column(db.Float, default=0.0)
    mpesa2 = db.Column(db.Float, default=0.0)
    mpesa3 = db.Column(db.Float, default=0.0)
    cash_on_hand = db.Column(db.Float, default=0.0)
    notes = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    lines = db.relationship("ReconciliationLine", backref="reconciliation", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date.isoformat(),
            "created_by": self.created_by,
            "mpesa1": float(self.mpesa1),
            "mpesa2": float(self.mpesa2),
            "mpesa3": float(self.mpesa3),
            "cash_on_hand": float(self.cash_on_hand),
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "lines": [l.to_dict() for l in self.lines],
        }

class ReconciliationLine(db.Model):
    __tablename__ = "reconciliation_line"
    id = db.Column(db.Integer, primary_key=True)
    reconciliation_id = db.Column(db.Integer, db.ForeignKey("reconciliation.id"), nullable=False)
    kind = db.Column(db.String(32), nullable=False)  # 'sale' | 'expense' | 'other'
    description = db.Column(db.String(300))
    amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "reconciliation_id": self.reconciliation_id,
            "kind": self.kind,
            "description": self.description,
            "amount": float(self.amount),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
