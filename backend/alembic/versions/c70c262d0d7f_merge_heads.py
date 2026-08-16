"""merge heads

Revision ID: c70c262d0d7f
Revises: a2b8e5f13c90, c1a2b3d4e5f6
Create Date: 2026-08-15 21:48:01.359830

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c70c262d0d7f'
down_revision: Union[str, Sequence[str], None] = ('a2b8e5f13c90', 'c1a2b3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
