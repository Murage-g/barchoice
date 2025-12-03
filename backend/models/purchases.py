from datetime import datetime
from ..extensions import db

class Supplier(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    contact_person = db.Column(db.String(120))
    phone = db.Column(db.String(40))
    email = db.Column(db.String(120))

    purchases = db.relationship("Purchase", backref="supplier", lazy=True)

    total_amount_owed = db.Column(db.Float, default=0)
    total_amount_paid = db.Column(db.Float, default=0)
    status = db.Column(db.String(50), default="unpaid")

    def remaining_balance(self):
        return self.total_amount_owed - self.total_amount_paid

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "contact_person": self.contact_person,
            "phone": self.phone,
            "email": self.email,
            "total_amount_owed": self.total_amount_owed,
            "total_amount_paid": self.total_amount_paid,
            "remaining_balance": self.remaining_balance(),
            "status": self.status,
        }



class Purchase(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey("supplier.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_cost = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)
    purchase_date = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "supplier_id": self.supplier_id,
            "quantity": self.quantity,
            "unit_cost": float(self.unit_cost),
            "total_cost": float(self.total_cost),
            "purchase_date": self.purchase_date.isoformat(),
        }
