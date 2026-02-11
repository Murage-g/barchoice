from datetime import datetime
from ..extensions import db

class PurchaseUndoLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    purchase_id = db.Column(db.Integer, nullable=False)
    product_id = db.Column(db.Integer, nullable=False)
    quantity_reversed = db.Column(db.Integer, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    undone_by = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
