"""Integration event logging for webhook and Sentinel ingestion."""

import json
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import IntegrationEvent


class IntegrationLogService:
    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        *,
        organization_id: uuid.UUID,
        integration_source: str,
        event_type: str,
        status: str,
        client_id: uuid.UUID | None = None,
        source_system: str | None = None,
        source_alert_id: str | None = None,
        case_id: uuid.UUID | None = None,
        case_number: str | None = None,
        error_message: str | None = None,
        payload: dict | None = None,
    ) -> IntegrationEvent:
        summary = None
        if payload:
            raw = json.dumps(payload, default=str)
            summary = raw[:2000] + ("..." if len(raw) > 2000 else "")

        event = IntegrationEvent(
            organization_id=organization_id,
            client_id=client_id,
            integration_source=integration_source,
            event_type=event_type,
            status=status,
            source_system=source_system,
            source_alert_id=source_alert_id,
            case_id=case_id,
            case_number=case_number,
            error_message=error_message,
            payload_summary=summary,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(event)
        return event

    def list_events(
        self,
        organization_id: uuid.UUID,
        *,
        client_id: uuid.UUID | None = None,
        status: str | None = None,
        integration_source: str | None = None,
        limit: int = 50,
    ) -> list[IntegrationEvent]:
        q = self.db.query(IntegrationEvent).filter(
            IntegrationEvent.organization_id == organization_id
        )
        if client_id:
            q = q.filter(IntegrationEvent.client_id == client_id)
        if status:
            q = q.filter(IntegrationEvent.status == status)
        if integration_source:
            q = q.filter(IntegrationEvent.integration_source == integration_source)
        return q.order_by(IntegrationEvent.created_at.desc()).limit(min(limit, 200)).all()
