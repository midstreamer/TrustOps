from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.security import MANAGER_ROLES, require_roles
from app.core.config import settings
from app.db.session import get_db
from app.models import Client, User
from app.schemas import IntegrationEventResponse, SentinelAlertPayload, WebhookAlertPayload, WebhookAlertResponse
from app.services.integration_log_service import IntegrationLogService
from app.services.sentinel_service import SentinelAlertService
from app.services.webhook_service import WebhookAlertService

router = APIRouter(prefix="/integrations", tags=["integrations"])


def verify_webhook_key(x_trustops_webhook_key: str | None = Header(None)) -> None:
    key = settings.sentinel_api_key or settings.webhook_api_key
    if not x_trustops_webhook_key or x_trustops_webhook_key != key:
        raise HTTPException(status_code=401, detail="Invalid or missing webhook API key")


def _log_ingestion_error(
    db: Session,
    *,
    organization_id,
    client_id,
    integration_source: str,
    exc: HTTPException,
    payload: dict | None = None,
) -> None:
    IntegrationLogService(db).log(
        organization_id=organization_id,
        client_id=client_id,
        integration_source=integration_source,
        event_type="validation_error" if exc.status_code == 400 else "ingestion_error",
        status="error",
        error_message=str(exc.detail),
        payload=payload,
    )


@router.get("/logs", response_model=list[IntegrationEventResponse])
def list_integration_logs(
    client_id: UUID | None = None,
    status: str | None = None,
    integration_source: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin", *MANAGER_ROLES)),
):
    """Recent integration ingestion events for troubleshooting."""
    events = IntegrationLogService(db).list_events(
        user.organization_id,
        client_id=client_id,
        status=status,
        integration_source=integration_source,
        limit=limit,
    )
    return events


@router.post("/webhook/alerts", response_model=WebhookAlertResponse)
def ingest_webhook_alert(
    payload: WebhookAlertPayload,
    db: Session = Depends(get_db),
    _: None = Depends(verify_webhook_key),
):
    """Ingest an external alert via webhook. Requires X-TrustOps-Webhook-Key header."""
    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="client_id not found")

    try:
        result = WebhookAlertService(db).ingest(
            organization_id=client.organization_id,
            client_id=payload.client_id,
            title=payload.title,
            severity=payload.severity,
            actor=None,
            description=payload.description,
            source_system=payload.source_system,
            source_alert_id=payload.source_alert_id,
            priority=payload.priority,
            asset_name=payload.asset_name,
            username=payload.username,
            source_ip=payload.source_ip,
            destination_ip=payload.destination_ip,
            mitre_tactic=payload.mitre_tactic,
            mitre_technique=payload.mitre_technique,
            raw_event=payload.raw_event,
            detected_at=payload.detected_at,
        )
        db.commit()
        return result
    except HTTPException as exc:
        _log_ingestion_error(
            db,
            organization_id=client.organization_id,
            client_id=payload.client_id,
            integration_source="webhook",
            exc=exc,
            payload=payload.model_dump(mode="json"),
        )
        db.commit()
        raise


@router.get("/sentinel/health")
def sentinel_health():
    """Health check for Microsoft Sentinel integration connectivity."""
    return {
        "status": "ok",
        "integration": "microsoft-sentinel",
        "api_key_configured": bool(settings.sentinel_api_key or settings.webhook_api_key),
        "endpoint": "/integrations/sentinel/alerts",
        "deduplication": "enabled",
    }


@router.post("/sentinel/alerts", response_model=WebhookAlertResponse)
def ingest_sentinel_alert(
    payload: SentinelAlertPayload,
    db: Session = Depends(get_db),
    _: None = Depends(verify_webhook_key),
):
    """Ingest a Microsoft Sentinel alert. Requires X-TrustOps-Webhook-Key header."""
    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="client_id not found")

    try:
        result = SentinelAlertService(db).ingest(payload.model_dump(exclude_none=True))
        db.commit()
        return result
    except HTTPException as exc:
        _log_ingestion_error(
            db,
            organization_id=client.organization_id,
            client_id=payload.client_id,
            integration_source="sentinel",
            exc=exc,
            payload=payload.model_dump(mode="json"),
        )
        db.commit()
        raise
