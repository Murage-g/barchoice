"""added purchases_offer table

Revision ID: 7f2b5e98252c
Revises: 123456abcdef
Create Date: 2026-02-27 18:53:25.680977

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7f2b5e98252c'
down_revision: Union[str, Sequence[str], None] = '123456abcdef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
