from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.schemas import SentinelAlertPayload, WebhookAlertPayload, WebhookAlertResponse
from app.services.sentinel_service import SentinelAlertService
from app.services.webhook_service import WebhookAlertService

router = APIRouter(prefix="/integrations", tags=["integrations"])


def verify_webhook_key(x_trustops_webhook_key: str | None = Header(None)) -> None:
    key = settings.sentinel_api_key or settings.webhook_api_key
    if not x_trustops_webhook_key or x_trustops_webhook_key != key:
        raise HTTPException(status_code=401, detail="Invalid or missing webhook API key")


@router.post("/webhook/alerts", response_model=WebhookAlertResponse)
def ingest_webhook_alert(
    payload: WebhookAlertPayload,
    db: Session = Depends(get_db),
    _: None = Depends(verify_webhook_key),
):
    """Ingest an external alert via webhook. Requires X-TrustOps-Webhook-Key header."""
    from app.models import Client

    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="client_id not found")

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


@router.get("/sentinel/health")
def sentinel_health():
    """Health check for Microsoft Sentinel integration connectivity."""
    return {
        "status": "ok",
        "integration": "microsoft-sentinel",
        "api_key_configured": bool(settings.sentinel_api_key or settings.webhook_api_key),
        "endpoint": "/integrations/sentinel/alerts",
    }


@router.post("/sentinel/alerts", response_model=WebhookAlertResponse)
def ingest_sentinel_alert(
    payload: SentinelAlertPayload,
    db: Session = Depends(get_db),
    _: None = Depends(verify_webhook_key),
):
    """Ingest a Microsoft Sentinel alert. Requires X-TrustOps-Webhook-Key header."""
    result = SentinelAlertService(db).ingest(payload.model_dump(exclude_none=True))
    db.commit()
    return result
