# backend/models/sale.py

from datetime import datetime
from ..extensions import db


class Sale(db.Model):
    __tablename__ = "sale"

    id = db.Column(db.Integer, primary_key=True)

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("product.id"),
        nullable=False
    )

    quantity = db.Column(db.Integer, nullable=False)
    total_price = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)

    sale_type = db.Column(db.String(50), nullable=False)  # cash | debt
    issued_by = db.Column(db.String(80), nullable=False)

    date = db.Column(db.DateTime, default=datetime.utcnow)

    product = db.relationship("Product", backref="sales")
    adjustments = db.relationship(
        "SaleAdjustment",
        backref="sale",
        lazy=True
    )

    # =============================
    # Computed Financial Values
    # =============================

    @property
    def adjusted_quantity(self):
        return self.quantity + sum(
            a.quantity_delta for a in self.adjustments if not a.is_voided
        )

    @property
    def adjusted_total_price(self):
        return self.total_price + sum(
            a.price_delta for a in self.adjustments if not a.is_voided
        )

    @property
    def adjusted_total_cost(self):
        return self.total_cost + sum(
            a.cost_delta for a in self.adjustments if not a.is_voided
        )

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "quantity": self.quantity,
            "adjusted_quantity": self.adjusted_quantity,
            "total_price": float(self.total_price),
            "adjusted_total_price": float(self.adjusted_total_price),
            "total_cost": float(self.total_cost),
            "adjusted_total_cost": float(self.adjusted_total_cost),
            "sale_type": self.sale_type,
            "issued_by": self.issued_by,
            "date": self.date.isoformat(),
        }


class SaleAdjustment(db.Model):
    __tablename__ = "sale_adjustments"

    id = db.Column(db.Integer, primary_key=True)

    sale_id = db.Column(
        db.Integer,
        db.ForeignKey("sale.id"),
        nullable=False
    )

    price_delta = db.Column(db.Float, nullable=False, default=0)
    cost_delta = db.Column(db.Float, nullable=False, default=0)
    quantity_delta = db.Column(db.Integer, nullable=False, default=0)

    previous_total_price = db.Column(db.Float, nullable=False)
    previous_total_cost = db.Column(db.Float, nullable=False)
    previous_quantity = db.Column(db.Integer, nullable=False)

    reason = db.Column(db.String(255), nullable=False)
    created_by = db.Column(db.String(80), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    is_voided = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id,
            "sale_id": self.sale_id,
            "price_delta": self.price_delta,
            "cost_delta": self.cost_delta,
            "quantity_delta": self.quantity_delta,
            "previous_total_price": self.previous_total_price,
            "previous_total_cost": self.previous_total_cost,
            "previous_quantity": self.previous_quantity,
            "reason": self.reason,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat(),
            "is_voided": self.is_voided,
        }
