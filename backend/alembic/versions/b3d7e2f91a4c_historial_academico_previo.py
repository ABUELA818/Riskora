"""historial_academico_previo

Revision ID: b3d7e2f91a4c
Revises: f2c8d914a6b7
Create Date: 2026-08-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3d7e2f91a4c'
down_revision: Union[str, Sequence[str], None] = 'f2c8d914a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('historial_academico_previo',
        sa.Column('id_historial', sa.Integer(), nullable=False),
        sa.Column('id_estudiante', sa.Integer(), nullable=False),
        sa.Column('institucion', sa.String(length=150), nullable=False),
        sa.Column('nivel', sa.String(length=50), nullable=False),
        sa.Column('periodo', sa.String(length=50), nullable=True),
        sa.Column('documento_url', sa.String(length=255), nullable=True),
        sa.Column('fecha_registro', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['id_estudiante'], ['estudiantes.id_estudiante'], ),
        sa.PrimaryKeyConstraint('id_historial')
    )
    op.create_index(op.f('ix_historial_academico_previo_id_historial'), 'historial_academico_previo', ['id_historial'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_historial_academico_previo_id_historial'), table_name='historial_academico_previo')
    op.drop_table('historial_academico_previo')