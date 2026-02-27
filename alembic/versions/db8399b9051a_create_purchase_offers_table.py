"""create purchase_offers table

Revision ID: db8399b9051a
Revises: e8688a5531a5
Create Date: 2026-02-27 21:12:15.038359

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'db8399b9051a'
down_revision = 'e8688a5531a5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'purchase_offers',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('purchase_id', sa.Integer, sa.ForeignKey('purchases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', sa.Integer, sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
        sa.Column('quantity', sa.Integer, nullable=False),
        sa.Column('offer_date', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('created_by', sa.String(length=120), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('purchase_offers')