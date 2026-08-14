from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b764b0becdf0'
down_revision: Union[str, Sequence[str], None] = '6db0e3030183'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Inyectamos los tres roles que faltan en el enum directamente en Postgres
    # El IF NOT EXISTS nos salva de errores si la migración se vuelve a ejecutar por accidente
    op.execute("ALTER TYPE rolenum ADD VALUE IF NOT EXISTS 'DIRECTOR'")
    op.execute("ALTER TYPE rolenum ADD VALUE IF NOT EXISTS 'RRHH'")
    op.execute("ALTER TYPE rolenum ADD VALUE IF NOT EXISTS 'PSICOPEDAGOGIA'")


def downgrade() -> None:
    # Postgres bloquea eliminar valores individuales de un enum, así que lo pasamos.
    # Si de verdad se ocupa revertir esto, tocaría hacer un desmadre: crear un tipo nuevo, pasar los datos y borrar el viejo.
    pass