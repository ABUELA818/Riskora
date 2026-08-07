"""agregar_revisado_intervenciones

Revision ID: e9b1a3c05d17
Revises: c7e29b45a1f0
Create Date: 2026-08-06 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9b1a3c05d17'
down_revision: Union[str, Sequence[str], None] = 'd2a4f6b81c90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('intervenciones', sa.Column('revisado', sa.Boolean(), nullable=True, server_default=sa.false()))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('intervenciones', 'revisado')