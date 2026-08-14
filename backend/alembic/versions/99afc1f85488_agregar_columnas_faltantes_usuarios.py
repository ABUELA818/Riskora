"""agregar_columnas_faltantes_usuarios

Revision ID: 99afc1f85488
Revises: b3d7e2f91a4c
Create Date: 2026-08-10 00:06:19.937396

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99afc1f85488'
down_revision: Union[str, Sequence[str], None] = 'b3d7e2f91a4c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Agregar columnas faltantes a usuarios
    # op.add_column('usuarios', sa.Column('token_version', sa.Integer(), server_default='1', nullable=True))
    # op.add_column('usuarios', sa.Column('telefono', sa.String(length=20), nullable=True))
    # op.add_column('usuarios', sa.Column('telefono_familiar', sa.String(length=20), nullable=True))
    # op.add_column('usuarios', sa.Column('imagen_url', sa.String(length=255), nullable=True))
    
    # Agregar columna faltante a intervenciones
    # op.add_column('intervenciones', sa.Column('escalado', sa.Boolean(), nullable=True))
    pass


def downgrade() -> None:
    """Downgrade schema."""
    # op.drop_column('usuarios', 'imagen_url')
    # op.drop_column('usuarios', 'telefono_familiar')
    # op.drop_column('usuarios', 'telefono')
    # op.drop_column('usuarios', 'token_version')
    # op.drop_column('intervenciones', 'escalado')
    pass
