"""agregar_rol_mixto

Revision ID: c1a2b3d4e5f6
Revises: 17d4cc644ee1
Create Date: 2026-08-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '17d4cc644ee1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Mismo patrón que b764b0becdf0: ALTER TYPE ... ADD VALUE no puede correr
    # dentro de una transacción normal en algunos entornos, pero Alembic/psycopg2
    # ya maneja esto igual que en la migración previa de roles.
    op.execute("ALTER TYPE rolenum ADD VALUE IF NOT EXISTS 'MIXTO'")


def downgrade() -> None:
    # Postgres no permite eliminar un valor individual de un enum.
    # Igual que en b764b0becdf0, se deja como no-op.
    pass