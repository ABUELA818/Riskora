"""agregar_carrera_a_materias

Revision ID: a7f3c9e21b56
Revises: 3be9fdda03f4
Create Date: 2026-08-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7f3c9e21b56'
down_revision: Union[str, Sequence[str], None] = '3be9fdda03f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('materias', sa.Column('id_carrera', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'materias', 'carreras', ['id_carrera'], ['id_carrera'])


def downgrade() -> None:
    op.drop_constraint(None, 'materias', type_='foreignkey')
    op.drop_column('materias', 'id_carrera')