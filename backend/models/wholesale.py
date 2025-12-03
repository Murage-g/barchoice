from datetime import datetime
from ..extensions import db

class WholesaleClient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    contact_person = db.Column(db.String(120))
    phone = db.Column(db.String(40))
    current_debt = db.Column(db.Float, default=0.0)
    sales = db.relationship("WholesaleSale", backref="client", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "contact_person": self.contact_person,
            "phone": self.phone,
            "current_debt": float(self.current_debt),
        }


class WholesaleSale(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey("wholesale_client.id"), nullable=False)
    products_sold = db.Column(db.JSON, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    is_paid = db.Column(db.Boolean, default=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "client_id": self.client_id,
            "products_sold": self.products_sold,
            "total_amount": float(self.total_amount),
            "is_paid": self.is_paid,
            "date": self.date.isoformat(),
        }
