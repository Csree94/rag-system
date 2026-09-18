"""add dashboard tables: notebooks, documents, notes, saved_answers

Revision ID: add_dashboard_tables
Revises: create_users_table
Create Date: 2026-09-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_dashboard_tables'
down_revision: Union[str, None] = 'create_users_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- notebooks ---
    op.create_table('notebooks',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
    sa.Column('name', sa.String(120), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('color', sa.String(20), nullable=False, server_default='lavender'),
    sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default='false'),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notebooks_user_id'), 'notebooks', ['user_id'], unique=False)

    # --- documents (metadata; chunks remain in document_chunks) ---
    op.create_table('documents',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('notebook_id', sa.Integer(), sa.ForeignKey('notebooks.id'), nullable=False),
    sa.Column('document_uuid', sa.String(64), nullable=False),
    sa.Column('filename', sa.String(255), nullable=False),
    sa.Column('file_type', sa.String(20), nullable=False, server_default='pdf'),
    sa.Column('size_bytes', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('page_count', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('chunk_count', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('status', sa.String(20), nullable=False, server_default='ready'),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_documents_notebook_id'), 'documents', ['notebook_id'], unique=False)
    op.create_index(op.f('ix_documents_document_uuid'), 'documents', ['document_uuid'], unique=False)
    op.create_index('ix_documents_notebook_created', 'documents', ['notebook_id', 'created_at'], unique=False)

    # --- notes ---
    op.create_table('notes',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
    sa.Column('notebook_id', sa.Integer(), sa.ForeignKey('notebooks.id'), nullable=True),
    sa.Column('title', sa.String(200), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('tags', sa.String(500), nullable=False, server_default=''),
    sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default='false'),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notes_user_id'), 'notes', ['user_id'], unique=False)

    # --- saved_answers ---
    op.create_table('saved_answers',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
    sa.Column('notebook_id', sa.Integer(), sa.ForeignKey('notebooks.id'), nullable=True),
    sa.Column('question', sa.Text(), nullable=False),
    sa.Column('answer', sa.Text(), nullable=False),
    sa.Column('sources_json', sa.Text(), nullable=False, server_default='[]'),
    sa.Column('source_count', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_saved_answers_user_id'), 'saved_answers', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_saved_answers_user_id'), table_name='saved_answers')
    op.drop_table('saved_answers')

    op.drop_index(op.f('ix_notes_user_id'), table_name='notes')
    op.drop_table('notes')

    op.drop_index('ix_documents_notebook_created', table_name='documents')
    op.drop_index(op.f('ix_documents_document_uuid'), table_name='documents')
    op.drop_index(op.f('ix_documents_notebook_id'), table_name='documents')
    op.drop_table('documents')

    op.drop_index(op.f('ix_notebooks_user_id'), table_name='notebooks')
    op.drop_table('notebooks')
