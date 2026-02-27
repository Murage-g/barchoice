"""create purchase_offers table

Revision ID: e8688a5531a5
Revises: a28680e07ea2
Create Date: 2026-02-27 21:09:52.494299

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8688a5531a5'
down_revision: Union[str, Sequence[str], None] = 'a28680e07ea2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
