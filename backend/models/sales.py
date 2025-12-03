from datetime import datetime
from ..extensions import db

class Sale(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    total_price = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)
    sale_type = db.Column(db.String(50), nullable=False)  # 'cash' or 'debt'
    issued_by = db.Column(db.String(80))
    date = db.Column(db.DateTime, default=datetime.utcnow)

    product = db.relationship("Product", backref="sales")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "quantity": self.quantity,
            "total_price": float(self.total_price),
            "total_cost": float(self.total_cost),
            "sale_type": self.sale_type,
            "issued_by": self.issued_by,
            "date": self.date.isoformat(),
        }
