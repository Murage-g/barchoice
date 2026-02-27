from datetime import datetime
from ..extensions import db


class PurchaseOffer(db.Model):
    __tablename__ = "purchase_offers"

    id = db.Column(db.Integer, primary_key=True)

    purchase_id = db.Column(
        db.Integer,
        db.ForeignKey("purchase.id"),
        nullable=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("product.id"),
        nullable=False
    )

    quantity = db.Column(db.Integer, nullable=False)

    offer_date = db.Column(db.DateTime, default=datetime.utcnow)

    created_by = db.Column(db.String(100), nullable=False)

    # ✅ Correct relationship
    product = db.relationship("Product", back_populates="offers")
    purchase = db.relationship("Purchase", back_populates="offers")