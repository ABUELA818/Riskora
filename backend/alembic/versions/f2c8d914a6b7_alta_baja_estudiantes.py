"""alta_baja_estudiantes

Revision ID: f2c8d914a6b7
Revises: e9b1a3c05d17
Create Date: 2026-08-06 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f2c8d914a6b7'
down_revision: Union[str, Sequence[str], None] = 'e9b1a3c05d17'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('estudiantes', sa.Column('edad', sa.Integer(), nullable=True))
    op.add_column('estudiantes', sa.Column('celular', sa.String(length=20), nullable=True))
    op.add_column('estudiantes', sa.Column('motivo_baja', sa.Text(), nullable=True))
    op.add_column('estudiantes', sa.Column('fecha_baja', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('estudiantes', 'fecha_baja')
    op.drop_column('estudiantes', 'motivo_baja')
    op.drop_column('estudiantes', 'celular')
    op.drop_column('estudiantes', 'edad')