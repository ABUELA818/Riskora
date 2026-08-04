"""ampliar_precision_calificaciones

Revision ID: d630ed70cece
Revises: acf4b5a8f767
Create Date: 2026-08-03 20:04:11.294699

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd630ed70cece'
down_revision: Union[str, Sequence[str], None] = 'acf4b5a8f767'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        'calificaciones', 'valor',
        existing_type=sa.DECIMAL(precision=4, scale=2),
        type_=sa.DECIMAL(precision=5, scale=2)
    )
    op.alter_column(
        'calificaciones', 'promedio_calculado',
        existing_type=sa.DECIMAL(precision=4, scale=2),
        type_=sa.DECIMAL(precision=5, scale=2)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'calificaciones', 'valor',
        existing_type=sa.DECIMAL(precision=5, scale=2),
        type_=sa.DECIMAL(precision=4, scale=2)
    )
    op.alter_column(
        'calificaciones', 'promedio_calculado',
        existing_type=sa.DECIMAL(precision=5, scale=2),
        type_=sa.DECIMAL(precision=4, scale=2)
    )