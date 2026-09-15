"""alter embedding dimension to 768 for gemini embedding 2

Revision ID: alter_embedding_768
Revises: 26adc6d327f3
Create Date: 2026-09-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy


# revision identifiers, used by Alembic.
revision: str = 'alter_embedding_768'
down_revision: Union[str, None] = '26adc6d327f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop existing index on embedding column if any (pgvector creates implicit index)
    # Then alter the column type from VECTOR(384) to VECTOR(768)
    op.execute("DROP INDEX IF EXISTS ix_document_chunks_embedding")
    op.alter_column(
        'document_chunks',
        'embedding',
        type_=pgvector.sqlalchemy.Vector(dim=768),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'document_chunks',
        'embedding',
        type_=pgvector.sqlalchemy.Vector(dim=384),
        existing_nullable=False,
    )
