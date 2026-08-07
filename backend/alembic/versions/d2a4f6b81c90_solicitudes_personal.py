"""solicitudes_personal

Revision ID: d2a4f6b81c90
Revises: c7e29b45a1f0
Create Date: 2026-08-06 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd2a4f6b81c90'
down_revision: Union[str, Sequence[str], None] = 'c7e29b45a1f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('solicitudes_personal',
        sa.Column('id_solicitud', sa.Integer(), nullable=False),
        sa.Column('nombre_completo', sa.String(length=150), nullable=False),
        sa.Column('correo', sa.String(length=150), nullable=False),
        sa.Column('telefono', sa.String(length=20), nullable=True),
        sa.Column('telefono_familiar', sa.String(length=20), nullable=True),
        sa.Column('imagen_url', sa.String(length=255), nullable=True),
        sa.Column('horas_semanales', sa.Integer(), nullable=True),
        sa.Column('rol_solicitado', sa.String(length=50), nullable=False),
        sa.Column('id_carrera', sa.Integer(), nullable=True),
        sa.Column('estado', sa.Enum('PENDIENTE', 'ACEPTADA', 'RECHAZADA', name='estadosolicitudenum'), nullable=True),
        sa.Column('id_usuario_solicitante', sa.Integer(), nullable=False),
        sa.Column('motivo_rechazo', sa.Text(), nullable=True),
        sa.Column('fecha_solicitud', sa.DateTime(), nullable=True),
        sa.Column('fecha_resolucion', sa.DateTime(), nullable=True),
        sa.Column('id_usuario_resolutor', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['id_carrera'], ['carreras.id_carrera'], ),
        sa.ForeignKeyConstraint(['id_usuario_solicitante'], ['usuarios.id_usuario'], ),
        sa.ForeignKeyConstraint(['id_usuario_resolutor'], ['usuarios.id_usuario'], ),
        sa.PrimaryKeyConstraint('id_solicitud')
    )
    op.create_index(op.f('ix_solicitudes_personal_id_solicitud'), 'solicitudes_personal', ['id_solicitud'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_solicitudes_personal_id_solicitud'), table_name='solicitudes_personal')
    op.drop_table('solicitudes_personal')