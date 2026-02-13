from datetime import datetime, date
from ..extensions import db

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    stock = db.Column(db.Integer, default=0)
    unit_price = db.Column(db.Float, default=0.0)
    cost_price = db.Column(db.Float, default=0.0)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "stock": self.stock,
            "unit_price": float(self.unit_price),
            "cost_price": float(self.cost_price),
        }


class DailyStock(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    opening_stock = db.Column(db.Integer, default=0)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    product = db.relationship("Product", backref="daily_stocks")


class DailyClose(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    date = db.Column(db.Date, default=date.today)
    opening_stock = db.Column(db.Integer, nullable=False)
    closing_stock = db.Column(db.Integer, nullable=False)
    units_sold = db.Column(db.Integer, nullable=False)
    revenue = db.Column(db.Float, nullable=False)
    profit = db.Column(db.Float, nullable=False)
    processed_by = db.Column(db.String(100), nullable=False)
    product = db.relationship("Product", backref="daily_closes")

class DailyCloseAdjustment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    daily_close_id = db.Column(db.Integer, db.ForeignKey("daily_close.id"), nullable=False)
    previous_closing_stock = db.Column(db.Integer, nullable=False)
    new_closing_stock = db.Column(db.Integer, nullable=False)
    quantity_delta = db.Column(db.Integer, nullable=False)
    revenue_delta = db.Column(db.Float, nullable=False)
    profit_delta = db.Column(db.Float, nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    created_by = db.Column(db.String(80), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    daily_close = db.relationship("DailyClose", backref="adjustments")
