"""Initial schema

Revision ID: 001
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "clients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("industry", sa.String(255)),
        sa.Column("service_tier", sa.String(100)),
        sa.Column("timezone", sa.String(100), server_default="UTC"),
        sa.Column("primary_contact_name", sa.String(255)),
        sa.Column("primary_contact_email", sa.String(255)),
        sa.Column("status", sa.String(50), server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
        sa.Column("description", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id")),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), server_default="active"),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "user_roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roles.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_number", sa.String(50), unique=True, nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id")),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id")),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("source_system", sa.String(255)),
        sa.Column("source_alert_id", sa.String(255)),
        sa.Column("severity", sa.String(50), nullable=False),
        sa.Column("priority", sa.String(50)),
        sa.Column("status", sa.String(50), server_default="New"),
        sa.Column("disposition", sa.String(100)),
        sa.Column("assigned_to_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("detected_at", sa.DateTime(timezone=True)),
        sa.Column("triaged_at", sa.DateTime(timezone=True)),
        sa.Column("dispositioned_at", sa.DateTime(timezone=True)),
        sa.Column("notified_at", sa.DateTime(timezone=True)),
        sa.Column("closed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id")),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id")),
        sa.Column("source_system", sa.String(255)),
        sa.Column("source_alert_id", sa.String(255)),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("severity", sa.String(50), nullable=False),
        sa.Column("asset_name", sa.String(255)),
        sa.Column("username", sa.String(255)),
        sa.Column("source_ip", sa.String(50)),
        sa.Column("destination_ip", sa.String(50)),
        sa.Column("mitre_tactic", sa.String(100)),
        sa.Column("mitre_technique", sa.String(100)),
        sa.Column("raw_event", sa.Text),
        sa.Column("detected_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "case_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id")),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("event_description", sa.Text),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "case_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id")),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("note_text", sa.Text, nullable=False),
        sa.Column("visibility", sa.String(50), server_default="Internal"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "case_evidence",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id")),
        sa.Column("evidence_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content", sa.Text),
        sa.Column("source", sa.String(255)),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "ai_recommendations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id")),
        sa.Column("model_name", sa.String(100), nullable=False),
        sa.Column("model_provider", sa.String(100), nullable=False),
        sa.Column("prompt_version", sa.String(50), nullable=False),
        sa.Column("summary", sa.Text, nullable=False),
        sa.Column("key_evidence_json", postgresql.JSON),
        sa.Column("recommended_disposition", sa.String(100)),
        sa.Column("recommended_priority", sa.String(50)),
        sa.Column("confidence_score", sa.Integer),
        sa.Column("rationale", sa.Text),
        sa.Column("suggested_next_steps_json", postgresql.JSON),
        sa.Column("mitre_tactics_json", postgresql.JSON),
        sa.Column("mitre_techniques_json", postgresql.JSON),
        sa.Column("client_notification_draft", sa.Text),
        sa.Column("closure_summary_draft", sa.Text),
        sa.Column("limitations_json", postgresql.JSON),
        sa.Column("raw_prompt", sa.Text),
        sa.Column("raw_response", postgresql.JSON),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "analyst_decisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id")),
        sa.Column("analyst_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("ai_recommendation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_recommendations.id")),
        sa.Column("selected_disposition", sa.String(100), nullable=False),
        sa.Column("selected_priority", sa.String(50), nullable=False),
        sa.Column("analyst_confidence", sa.Integer, nullable=False),
        sa.Column("ai_action", sa.String(50), nullable=False),
        sa.Column("override_reason", sa.Text),
        sa.Column("escalation_needed", sa.Boolean, server_default="false"),
        sa.Column("client_notification_needed", sa.Boolean, server_default="false"),
        sa.Column("decision_notes", sa.Text),
        sa.Column("time_to_decision_seconds", sa.Integer),
        sa.Column("human_ai_agreement", sa.Boolean),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "sla_policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id")),
        sa.Column("priority", sa.String(50)),
        sa.Column("severity", sa.String(50)),
        sa.Column("time_to_triage_minutes", sa.Integer),
        sa.Column("time_to_disposition_minutes", sa.Integer),
        sa.Column("time_to_notify_minutes", sa.Integer),
        sa.Column("time_to_close_minutes", sa.Integer),
        sa.Column("business_hours_only", sa.Boolean, server_default="false"),
        sa.Column("active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "sla_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id")),
        sa.Column("sla_policy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sla_policies.id")),
        sa.Column("sla_type", sa.String(50), nullable=False),
        sa.Column("target_minutes", sa.Integer, nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("breached", sa.Boolean, server_default="false"),
        sa.Column("exception_reason", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "qa_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id")),
        sa.Column("reviewer_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("disposition_correct", sa.Boolean),
        sa.Column("priority_correct", sa.Boolean),
        sa.Column("evidence_quality_score", sa.Integer),
        sa.Column("documentation_quality_score", sa.Integer),
        sa.Column("client_communication_score", sa.Integer),
        sa.Column("ai_usage_appropriate", sa.Boolean),
        sa.Column("overall_score", sa.Integer),
        sa.Column("review_notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id")),
        sa.Column("report_type", sa.String(100), nullable=False),
        sa.Column("reporting_period_start", sa.Date, nullable=False),
        sa.Column("reporting_period_end", sa.Date, nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("executive_summary", sa.Text),
        sa.Column("case_summary_json", postgresql.JSON),
        sa.Column("sla_summary_json", postgresql.JSON),
        sa.Column("notable_incidents_json", postgresql.JSON),
        sa.Column("recurring_themes_json", postgresql.JSON),
        sa.Column("recommendations_json", postgresql.JSON),
        sa.Column("status", sa.String(50), server_default="Draft"),
        sa.Column("generated_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id")),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id")),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(100)),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("previous_value_json", postgresql.JSON),
        sa.Column("new_value_json", postgresql.JSON),
        sa.Column("ip_address", sa.String(50)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "alert_imports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id")),
        sa.Column("uploaded_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("status", sa.String(50), server_default="preview"),
        sa.Column("preview_json", postgresql.JSON),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )


def downgrade() -> None:
    for table in [
        "alert_imports",
        "audit_logs",
        "reports",
        "qa_reviews",
        "sla_events",
        "sla_policies",
        "analyst_decisions",
        "ai_recommendations",
        "case_evidence",
        "case_notes",
        "case_events",
        "alerts",
        "cases",
        "user_roles",
        "users",
        "roles",
        "clients",
        "organizations",
    ]:
        op.drop_table(table)
