from backend.extensions import db
from datetime import datetime

class ConversionHistory(db.Model):
    __tablename__ = "conversion_history"

    id = db.Column(db.Integer, primary_key=True)
    bottle_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    tot_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)

    prev_bottle_stock = db.Column(db.Float, nullable=False)
    prev_tot_stock = db.Column(db.Float, nullable=False)
    new_bottle_stock = db.Column(db.Float, nullable=False)
    new_tot_stock = db.Column(db.Float, nullable=False)

    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # relationships
    bottle = db.relationship("Product", foreign_keys=[bottle_id], lazy="joined")
    tot = db.relationship("Product", foreign_keys=[tot_id], lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "bottle_id": self.bottle_id,
            "bottle_name": self.bottle.name if self.bottle else None,
            "tot_id": self.tot_id,
            "tot_name": self.tot.name if self.tot else None,
            "prev_bottle_stock": self.prev_bottle_stock,
            "prev_tot_stock": self.prev_tot_stock,
            "new_bottle_stock": self.new_bottle_stock,
            "new_tot_stock": self.new_tot_stock,
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        }
