"""add is_locked to reconciliation

Revision ID: ec4b6e60e008
Revises: baseline_001
Create Date: 2026-02-23 22:26:48.426849

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec4b6e60e008'
down_revision: Union[str, Sequence[str], None] = 'baseline_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
