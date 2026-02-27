"""fixed  purchases_offer table

Revision ID: a28680e07ea2
Revises: 7f2b5e98252c
Create Date: 2026-02-27 19:36:25.483648

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a28680e07ea2'
down_revision: Union[str, Sequence[str], None] = '7f2b5e98252c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
