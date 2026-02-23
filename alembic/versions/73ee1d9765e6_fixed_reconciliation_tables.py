"""Add is_locked column to reconciliation table

Revision ID: 73ee1d9765e6
Revises: 
Create Date: 2026-02-23 14:03:53.974868
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '73ee1d9765e6'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Add is_locked column to reconciliation table if it doesn't exist."""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("reconciliation")]
    
    if "is_locked" not in columns:
        op.add_column("reconciliation", sa.Column("is_locked", sa.Boolean(), nullable=True))


def downgrade() -> None:
    """Remove is_locked column from reconciliation table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("reconciliation")]
    
    if "is_locked" in columns:
        op.drop_column("reconciliation", "is_locked")