"""Webhook alert ingestion for external SIEM/SOAR integrations."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.constants import PRIORITIES, SEVERITIES
from app.models import Client, User
from app.services.audit_service import AuditLogService
from app.services.case_service import CaseService
from app.services.sla_service import SLAService


class WebhookAlertService:
    def __init__(self, db: Session):
        self.db = db
        self.case_service = CaseService(db)
        self.sla_service = SLAService(db)

    def ingest(
        self,
        *,
        organization_id: uuid.UUID,
        client_id: uuid.UUID,
        title: str,
        severity: str,
        actor: User | None = None,
        description: str | None = None,
        source_system: str | None = None,
        source_alert_id: str | None = None,
        priority: str | None = None,
        asset_name: str | None = None,
        username: str | None = None,
        source_ip: str | None = None,
        destination_ip: str | None = None,
        mitre_tactic: str | None = None,
        mitre_technique: str | None = None,
        raw_event: str | None = None,
        detected_at: datetime | None = None,
    ) -> dict:
        if not title.strip():
            raise HTTPException(status_code=400, detail="title is required")
        if severity not in SEVERITIES:
            raise HTTPException(status_code=400, detail=f"Invalid severity. Allowed: {SEVERITIES}")
        if priority and priority not in PRIORITIES:
            raise HTTPException(status_code=400, detail=f"Invalid priority. Allowed: {PRIORITIES}")

        client = (
            self.db.query(Client)
            .filter(Client.id == client_id, Client.organization_id == organization_id)
            .first()
        )
        if not client:
            raise HTTPException(status_code=404, detail="client_id not found in organization")

        detected = detected_at or datetime.now(timezone.utc)
        alert_data = {
            "title": title,
            "description": description,
            "source_system": source_system,
            "source_alert_id": source_alert_id,
            "asset_name": asset_name,
            "username": username,
            "source_ip": source_ip,
            "destination_ip": destination_ip,
            "mitre_tactic": mitre_tactic,
            "mitre_technique": mitre_technique,
            "raw_event": raw_event,
            "detected_at": detected,
        }

        case = self.case_service.create_case(
            organization_id=organization_id,
            client_id=client_id,
            title=title,
            severity=severity,
            created_by=actor,
            description=description,
            source_system=source_system,
            source_alert_id=source_alert_id,
            priority=priority,
            detected_at=detected,
            alert_data=alert_data,
        )
        self.case_service.add_event(
            case.id,
            "Alert Ingested via Webhook",
            f"Source: {source_system or 'webhook'}",
            actor,
        )
        self.sla_service.create_sla_events_for_case(case)

        AuditLogService.log(
            self.db,
            event_type="webhook_alert_ingested",
            user=actor,
            organization_id=organization_id,
            client_id=client_id,
            case_id=case.id,
            entity_type="case",
            entity_id=case.id,
            new_value={"source_system": source_system, "source_alert_id": source_alert_id},
        )

        return {
            "case_id": str(case.id),
            "case_number": case.case_number,
            "client_id": str(client_id),
            "status": case.status,
        }
