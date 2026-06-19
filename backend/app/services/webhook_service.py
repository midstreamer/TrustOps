"""Webhook alert ingestion for external SIEM/SOAR integrations."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.constants import PRIORITIES, SEVERITIES
from app.models import Case, Client, User
from app.services.audit_service import AuditLogService
from app.services.case_service import CaseService
from app.services.integration_log_service import IntegrationLogService
from app.services.sla_service import SLAService


class WebhookAlertService:
    def __init__(self, db: Session):
        self.db = db
        self.case_service = CaseService(db)
        self.sla_service = SLAService(db)
        self.log_service = IntegrationLogService(db)

    def _dedup_key_system(self, source_system: str | None, integration_source: str) -> str:
        if source_system:
            return source_system
        if integration_source == "sentinel":
            return "Microsoft Sentinel"
        return integration_source

    def find_duplicate_case(
        self,
        client_id: uuid.UUID,
        source_system: str | None,
        source_alert_id: str | None,
        integration_source: str,
    ) -> Case | None:
        if not source_alert_id or not str(source_alert_id).strip():
            return None
        dedup_system = self._dedup_key_system(source_system, integration_source)
        return (
            self.db.query(Case)
            .filter(
                Case.client_id == client_id,
                Case.source_system == dedup_system,
                Case.source_alert_id == str(source_alert_id).strip(),
            )
            .first()
        )

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
        integration_source: str = "webhook",
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

        dedup_system = self._dedup_key_system(source_system, integration_source)
        existing = self.find_duplicate_case(client_id, source_system, source_alert_id, integration_source)
        if existing:
            self.log_service.log(
                organization_id=organization_id,
                client_id=client_id,
                integration_source=integration_source,
                event_type="duplicate_detected",
                status="duplicate",
                source_system=dedup_system,
                source_alert_id=str(source_alert_id).strip() if source_alert_id else None,
                case_id=existing.id,
                case_number=existing.case_number,
            )
            return {
                "case_id": str(existing.id),
                "case_number": existing.case_number,
                "client_id": str(client_id),
                "status": existing.status,
                "duplicate": True,
                "ingestion_status": "duplicate",
            }

        detected = detected_at or datetime.now(timezone.utc)
        normalized_alert_id = str(source_alert_id).strip() if source_alert_id else None
        alert_data = {
            "title": title,
            "description": description,
            "source_system": dedup_system,
            "source_alert_id": normalized_alert_id,
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
            source_system=dedup_system,
            source_alert_id=normalized_alert_id,
            priority=priority,
            detected_at=detected,
            alert_data=alert_data,
        )
        source_label = "Sentinel" if integration_source == "sentinel" else (source_system or "webhook")
        self.case_service.add_event(
            case.id,
            f"Alert Ingested via {source_label}",
            f"Source: {dedup_system}",
            actor,
        )
        self.sla_service.create_sla_events_for_case(case)

        AuditLogService.log(
            self.db,
            event_type=f"{integration_source}_alert_ingested",
            user=actor,
            organization_id=organization_id,
            client_id=client_id,
            case_id=case.id,
            entity_type="case",
            entity_id=case.id,
            new_value={"source_system": dedup_system, "source_alert_id": normalized_alert_id},
        )

        self.log_service.log(
            organization_id=organization_id,
            client_id=client_id,
            integration_source=integration_source,
            event_type="alert_ingested",
            status="success",
            source_system=dedup_system,
            source_alert_id=normalized_alert_id,
            case_id=case.id,
            case_number=case.case_number,
        )

        return {
            "case_id": str(case.id),
            "case_number": case.case_number,
            "client_id": str(client_id),
            "status": case.status,
            "duplicate": False,
            "ingestion_status": "created",
        }
