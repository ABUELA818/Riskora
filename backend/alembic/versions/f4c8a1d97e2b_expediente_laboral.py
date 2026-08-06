"""expediente_laboral

Revision ID: f4c8a1d97e2b
Revises: a1f7c92e4b3d
Create Date: 2026-08-06 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4c8a1d97e2b'
down_revision: Union[str, Sequence[str], None] = 'a1f7c92e4b3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('usuarios', sa.Column('telefono', sa.String(length=20), nullable=True))
    op.add_column('usuarios', sa.Column('telefono_familiar', sa.String(length=20), nullable=True))
    op.add_column('usuarios', sa.Column('imagen_url', sa.String(length=255), nullable=True))

    op.create_table('docente_materia',
        sa.Column('id_docente_materia', sa.Integer(), nullable=False),
        sa.Column('id_docente', sa.Integer(), nullable=False),
        sa.Column('id_materia', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['id_docente'], ['docentes.id_docente'], ),
        sa.ForeignKeyConstraint(['id_materia'], ['materias.id_materia'], ),
        sa.PrimaryKeyConstraint('id_docente_materia'),
        sa.UniqueConstraint('id_docente', 'id_materia', name='uq_docente_materia')
    )
    op.create_index(op.f('ix_docente_materia_id_docente_materia'), 'docente_materia', ['id_docente_materia'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_docente_materia_id_docente_materia'), table_name='docente_materia')
    op.drop_table('docente_materia')
    op.drop_column('usuarios', 'imagen_url')
    op.drop_column('usuarios', 'telefono_familiar')
    op.drop_column('usuarios', 'telefono')