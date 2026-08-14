"""merge_heads

Revision ID: 17d4cc644ee1
Revises: a7f3c9e21b56, b764b0becdf0
Create Date: 2026-08-13 18:33:59.581946

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '17d4cc644ee1'
down_revision: Union[str, Sequence[str], None] = ('a7f3c9e21b56', 'b764b0becdf0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
