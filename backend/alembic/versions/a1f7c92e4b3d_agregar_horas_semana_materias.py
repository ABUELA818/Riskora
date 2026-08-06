"""agregar_horas_semana_materias

Revision ID: a1f7c92e4b3d
Revises: 3be9fdda03f4
Create Date: 2026-08-06 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1f7c92e4b3d'
down_revision: Union[str, Sequence[str], None] = '3be9fdda03f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('materias', sa.Column('horas_semana', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('materias', 'horas_semana')