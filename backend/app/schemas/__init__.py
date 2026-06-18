from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: str
    password: str


class RoleResponse(BaseModel):
    name: str

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: UUID
    organization_id: UUID
    client_id: UUID | None
    name: str
    email: str
    status: str
    roles: list[str] = []

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role_names: list[str] = []
    client_id: UUID | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    client_id: UUID | None = None


class ClientResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    industry: str | None
    service_tier: str | None
    timezone: str
    status: str

    class Config:
        from_attributes = True


class ClientCreate(BaseModel):
    name: str
    industry: str | None = None
    service_tier: str | None = None
    timezone: str = "UTC"
    primary_contact_name: str | None = None
    primary_contact_email: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    industry: str | None = None
    service_tier: str | None = None
    timezone: str | None = None
    status: str | None = None


class AlertResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    severity: str
    source_system: str | None
    asset_name: str | None
    username: str | None
    source_ip: str | None
    destination_ip: str | None
    mitre_tactic: str | None
    mitre_technique: str | None
    raw_event: str | None
    detected_at: datetime | None

    class Config:
        from_attributes = True


class SLAEventResponse(BaseModel):
    id: UUID
    sla_type: str
    target_minutes: int
    due_at: datetime
    completed_at: datetime | None
    status: str
    breached: bool

    class Config:
        from_attributes = True


class AIRecommendationResponse(BaseModel):
    id: UUID
    case_id: UUID
    model_name: str
    model_provider: str
    prompt_version: str
    summary: str
    key_evidence_json: dict | None
    recommended_disposition: str | None
    recommended_priority: str | None
    confidence_score: int | None
    rationale: str | None
    suggested_next_steps_json: dict | None
    mitre_tactics_json: dict | None
    mitre_techniques_json: dict | None
    client_notification_draft: str | None
    closure_summary_draft: str | None
    limitations_json: dict | None
    created_at: datetime

    class Config:
        from_attributes = True


class AnalystDecisionResponse(BaseModel):
    id: UUID
    selected_disposition: str
    selected_priority: str
    analyst_confidence: int
    ai_action: str
    override_reason: str | None
    human_ai_agreement: bool | None
    created_at: datetime

    class Config:
        from_attributes = True


class CaseResponse(BaseModel):
    id: UUID
    case_number: str
    organization_id: UUID
    client_id: UUID
    client_name: str | None = None
    title: str
    description: str | None
    source_system: str | None
    source_alert_id: str | None
    severity: str
    priority: str | None
    status: str
    disposition: str | None
    assigned_to_user_id: UUID | None
    assigned_to_name: str | None = None
    detected_at: datetime | None
    triaged_at: datetime | None
    dispositioned_at: datetime | None
    closed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    sla_status: str | None = None
    ai_confidence: int | None = None
    alerts: list[AlertResponse] = []
    sla_events: list[SLAEventResponse] = []

    class Config:
        from_attributes = True


class CaseCreate(BaseModel):
    client_id: UUID
    title: str
    description: str | None = None
    source_system: str | None = None
    source_alert_id: str | None = None
    severity: str
    priority: str | None = None
    detected_at: datetime | None = None
    assigned_to_user_id: UUID | None = None
    asset_name: str | None = None
    username: str | None = None
    source_ip: str | None = None
    destination_ip: str | None = None
    raw_event: str | None = None


class CaseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: str | None = None
    priority: str | None = None
    status: str | None = None
    disposition: str | None = None
    assigned_to_user_id: UUID | None = None


class CaseAssign(BaseModel):
    user_id: UUID


class CaseClose(BaseModel):
    disposition: str | None = None


class CaseNoteCreate(BaseModel):
    note_text: str
    visibility: str = "Internal"


class CaseNoteUpdate(BaseModel):
    note_text: str | None = None
    visibility: str | None = None


class CaseNoteResponse(BaseModel):
    id: UUID
    note_text: str
    visibility: str
    created_by_user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class CaseEvidenceCreate(BaseModel):
    evidence_type: str
    title: str
    content: str | None = None
    source: str | None = None


class CaseEvidenceResponse(BaseModel):
    id: UUID
    evidence_type: str
    title: str
    content: str | None
    source: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class CaseEventResponse(BaseModel):
    id: UUID
    event_type: str
    event_description: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class AnalystDecisionCreate(BaseModel):
    selected_disposition: str
    selected_priority: str
    analyst_confidence: int = Field(ge=0, le=100)
    ai_action: str
    ai_recommendation_id: UUID | None = None
    override_reason: str | None = None
    escalation_needed: bool = False
    client_notification_needed: bool = False
    decision_notes: str | None = None


class SLAPolicyCreate(BaseModel):
    priority: str | None = None
    severity: str | None = None
    time_to_triage_minutes: int | None = 30
    time_to_disposition_minutes: int | None = 240
    time_to_notify_minutes: int | None = 60
    time_to_close_minutes: int | None = 1440
    business_hours_only: bool = False
    active: bool = True


class SLAPolicyUpdate(BaseModel):
    priority: str | None = None
    severity: str | None = None
    time_to_triage_minutes: int | None = None
    time_to_disposition_minutes: int | None = None
    time_to_notify_minutes: int | None = None
    time_to_close_minutes: int | None = None
    business_hours_only: bool | None = None
    active: bool | None = None


class SLAPolicyResponse(BaseModel):
    id: UUID
    client_id: UUID
    priority: str | None
    severity: str | None
    time_to_triage_minutes: int | None
    time_to_disposition_minutes: int | None
    time_to_notify_minutes: int | None
    time_to_close_minutes: int | None
    business_hours_only: bool
    active: bool

    class Config:
        from_attributes = True


class QAReviewCreate(BaseModel):
    disposition_correct: bool | None = None
    priority_correct: bool | None = None
    evidence_quality_score: int | None = Field(None, ge=0, le=100)
    documentation_quality_score: int | None = Field(None, ge=0, le=100)
    client_communication_score: int | None = Field(None, ge=0, le=100)
    ai_usage_appropriate: bool | None = None
    overall_score: int | None = Field(None, ge=0, le=100)
    review_notes: str | None = None


class QAReviewResponse(BaseModel):
    id: UUID
    case_id: UUID
    disposition_correct: bool | None
    priority_correct: bool | None
    evidence_quality_score: int | None
    documentation_quality_score: int | None
    client_communication_score: int | None
    ai_usage_appropriate: bool | None
    overall_score: int | None
    review_notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class ReportGenerateRequest(BaseModel):
    client_id: UUID
    reporting_period_start: date
    reporting_period_end: date


class ReportUpdate(BaseModel):
    title: str | None = None
    executive_summary: str | None = None
    status: str | None = None


class ReportResponse(BaseModel):
    id: UUID
    client_id: UUID
    report_type: str
    reporting_period_start: date
    reporting_period_end: date
    title: str
    executive_summary: str | None
    case_summary_json: dict | None
    sla_summary_json: dict | None
    notable_incidents_json: dict | None
    recurring_themes_json: dict | None
    recommendations_json: dict | None
    status: str
    published_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class ImportPreviewResponse(BaseModel):
    id: UUID
    filename: str
    status: str
    preview_json: dict | None

    class Config:
        from_attributes = True
