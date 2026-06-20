"""Pilot admin: integration keys, report branding, evidence files, external tickets."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "integration_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("integration_name", sa.String(100), nullable=False),
        sa.Column("source_system", sa.String(100), nullable=False),
        sa.Column("key_hash", sa.String(128), nullable=False),
        sa.Column("key_prefix", sa.String(32), nullable=False),
        sa.Column("status", sa.String(20), server_default="Active", nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rotated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_integration_keys_key_hash", "integration_keys", ["key_hash"])

    op.create_table(
        "report_branding",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id"), nullable=True),
        sa.Column("provider_name", sa.String(255), nullable=True),
        sa.Column("provider_logo_url", sa.String(500), nullable=True),
        sa.Column("client_logo_url", sa.String(500), nullable=True),
        sa.Column("report_title", sa.String(255), server_default="SOC Monthly Value Report", nullable=False),
        sa.Column("prepared_by", sa.String(255), nullable=True),
        sa.Column("prepared_for", sa.String(255), nullable=True),
        sa.Column("confidentiality_footer", sa.Text(), nullable=True),
        sa.Column("cover_page_enabled", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("theme_name", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.add_column("case_evidence", sa.Column("file_name", sa.String(255), nullable=True))
    op.add_column("case_evidence", sa.Column("file_path", sa.String(500), nullable=True))
    op.add_column("case_evidence", sa.Column("mime_type", sa.String(100), nullable=True))
    op.add_column("case_evidence", sa.Column("file_size_bytes", sa.Integer(), nullable=True))
    op.add_column("case_evidence", sa.Column("file_hash", sa.String(128), nullable=True))
    op.add_column("case_evidence", sa.Column("visibility", sa.String(50), server_default="Internal", nullable=False))
    op.add_column("case_evidence", sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("cases", sa.Column("external_ticket_system", sa.String(100), nullable=True))
    op.add_column("cases", sa.Column("external_ticket_id", sa.String(255), nullable=True))
    op.add_column("cases", sa.Column("external_ticket_url", sa.String(500), nullable=True))
    op.add_column("cases", sa.Column("external_ticket_synced_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("cases", "external_ticket_synced_at")
    op.drop_column("cases", "external_ticket_url")
    op.drop_column("cases", "external_ticket_id")
    op.drop_column("cases", "external_ticket_system")
    op.drop_column("case_evidence", "uploaded_at")
    op.drop_column("case_evidence", "visibility")
    op.drop_column("case_evidence", "file_hash")
    op.drop_column("case_evidence", "file_size_bytes")
    op.drop_column("case_evidence", "mime_type")
    op.drop_column("case_evidence", "file_path")
    op.drop_column("case_evidence", "file_name")
    op.drop_table("report_branding")
    op.drop_index("ix_integration_keys_key_hash", table_name="integration_keys")
    op.drop_table("integration_keys")
