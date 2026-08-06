"""agregar_contacto_estudiantes

Revision ID: c7e29b45a1f0
Revises: f4c8a1d97e2b
Create Date: 2026-08-06 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7e29b45a1f0'
down_revision: Union[str, Sequence[str], None] = 'f4c8a1d97e2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('estudiantes', sa.Column('correo_institucional', sa.String(length=150), nullable=True))
    op.add_column('estudiantes', sa.Column('contacto_emergencia_nombre', sa.String(length=150), nullable=True))
    op.add_column('estudiantes', sa.Column('contacto_emergencia_telefono', sa.String(length=20), nullable=True))
    op.create_index(op.f('ix_estudiantes_correo_institucional'), 'estudiantes', ['correo_institucional'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_estudiantes_correo_institucional'), table_name='estudiantes')
    op.drop_column('estudiantes', 'contacto_emergencia_telefono')
    op.drop_column('estudiantes', 'contacto_emergencia_nombre')
    op.drop_column('estudiantes', 'correo_institucional')