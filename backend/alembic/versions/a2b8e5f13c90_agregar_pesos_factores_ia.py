"""agregar_pesos_factores_ia

Revision ID: a2b8e5f13c90
Revises: 17d4cc644ee1
Create Date: 2026-08-15 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a2b8e5f13c90'
down_revision: Union[str, Sequence[str], None] = '17d4cc644ee1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('pesos_factores_ia',
        sa.Column('id_peso', sa.Integer(), nullable=False),
        sa.Column('nombre_factor', sa.String(length=50), nullable=False),
        sa.Column('etiqueta', sa.String(length=100), nullable=False),
        sa.Column('peso', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.PrimaryKeyConstraint('id_peso'),
        sa.UniqueConstraint('nombre_factor')
    )
    op.create_index(op.f('ix_pesos_factores_ia_id_peso'), 'pesos_factores_ia', ['id_peso'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_pesos_factores_ia_id_peso'), table_name='pesos_factores_ia')
    op.drop_table('pesos_factores_ia')