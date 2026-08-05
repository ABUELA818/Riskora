"""agregar_carreras_y_relaciones

Revision ID: e628e0133ad6
Revises: 0337384599f6
Create Date: 2026-08-04 19:45:30.499387

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e628e0133ad6'
down_revision: Union[str, Sequence[str], None] = '0337384599f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Crear tabla de catálogo de carreras
    op.create_table('carreras',
        sa.Column('id_carrera', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint('id_carrera'),
        sa.UniqueConstraint('nombre')
    )
    op.create_index(op.f('ix_carreras_id_carrera'), 'carreras', ['id_carrera'], unique=False)

    # 2. Tablas de asignación
    op.create_table('director_carrera',
        sa.Column('id_director_carrera', sa.Integer(), nullable=False),
        sa.Column('id_usuario', sa.Integer(), nullable=False),
        sa.Column('id_carrera', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['id_carrera'], ['carreras.id_carrera'], ),
        sa.ForeignKeyConstraint(['id_usuario'], ['usuarios.id_usuario'], ),
        sa.PrimaryKeyConstraint('id_director_carrera')
    )
    op.create_index(op.f('ix_director_carrera_id_director_carrera'), 'director_carrera', ['id_director_carrera'], unique=False)

    op.create_table('docente_carrera',
        sa.Column('id_docente_carrera', sa.Integer(), nullable=False),
        sa.Column('id_docente', sa.Integer(), nullable=False),
        sa.Column('id_carrera', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['id_carrera'], ['carreras.id_carrera'], ),
        sa.ForeignKeyConstraint(['id_docente'], ['docentes.id_docente'], ),
        sa.PrimaryKeyConstraint('id_docente_carrera')
    )
    op.create_index(op.f('ix_docente_carrera_id_docente_carrera'), 'docente_carrera', ['id_docente_carrera'], unique=False)

    # 3. Agregar id_carrera a grupos (nullable por ahora, se llena abajo)
    op.add_column('grupos', sa.Column('id_carrera', sa.Integer(), nullable=True))

    # 4. Migrar datos: poblar 'carreras' con los valores distintos que ya existen en grupos.carrera
    connection = op.get_bind()

    carreras_existentes = connection.execute(
        sa.text("SELECT DISTINCT carrera FROM grupos WHERE carrera IS NOT NULL")
    ).fetchall()

    for (nombre_carrera,) in carreras_existentes:
        connection.execute(
            sa.text("INSERT INTO carreras (nombre) VALUES (:nombre) ON CONFLICT (nombre) DO NOTHING"),
            {"nombre": nombre_carrera}
        )

    # 5. Mapear cada grupo a su id_carrera correspondiente
    connection.execute(sa.text("""
        UPDATE grupos g
        SET id_carrera = c.id_carrera
        FROM carreras c
        WHERE g.carrera = c.nombre
    """))

    # 6. Ahora sí, agregar la FK y eliminar la columna vieja
    op.create_foreign_key(None, 'grupos', 'carreras', ['id_carrera'], ['id_carrera'])
    op.drop_column('grupos', 'carrera')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('grupos', sa.Column('carrera', sa.VARCHAR(length=100), autoincrement=False, nullable=True))

    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE grupos g
        SET carrera = c.nombre
        FROM carreras c
        WHERE g.id_carrera = c.id_carrera
    """))

    op.drop_constraint(None, 'grupos', type_='foreignkey')
    op.drop_column('grupos', 'id_carrera')
    op.drop_index(op.f('ix_docente_carrera_id_docente_carrera'), table_name='docente_carrera')
    op.drop_table('docente_carrera')
    op.drop_index(op.f('ix_director_carrera_id_director_carrera'), table_name='director_carrera')
    op.drop_table('director_carrera')
    op.drop_index(op.f('ix_carreras_id_carrera'), table_name='carreras')
    op.drop_table('carreras')