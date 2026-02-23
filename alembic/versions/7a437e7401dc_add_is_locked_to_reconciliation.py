"""Add is_locked column to reconciliation table

Revision ID: 73ee1d9765e6
Revises: 
Create Date: 2026-02-23 14:03:53.974868
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '73ee1d9765e6'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add is_locked column safely."""
    bind = op.get_bind()
    inspector = inspect(bind)

    # Ensure table exists first
    if "reconciliation" in inspector.get_table_names():
        columns = [c["name"] for c in inspector.get_columns("reconciliation")]

        # Add column only if it does not exist
        if "is_locked" not in columns:
            op.add_column(
                "reconciliation",
                sa.Column("is_locked", sa.Boolean(), nullable=True)
            )


def downgrade() -> None:
    """Remove is_locked column safely."""
    bind = op.get_bind()
    inspector = inspect(bind)

    if "reconciliation" in inspector.get_table_names():
        columns = [c["name"] for c in inspector.get_columns("reconciliation")]

        if "is_locked" in columns:
            op.drop_column("reconciliation", "is_locked")