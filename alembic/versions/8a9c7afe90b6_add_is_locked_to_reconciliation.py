from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '123456abcdef'  # auto-generated
down_revision = 'previous_revision_id'  # check the previous migration
branch_labels = None
depends_on = None

def upgrade():
    op.add_column(
        'reconciliation',
        sa.Column('is_locked', sa.Boolean(), nullable=False, server_default=sa.false())
    )

def downgrade():
    op.drop_column('reconciliation', 'is_locked')