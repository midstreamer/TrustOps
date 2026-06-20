"""Integration health status for SOC manager operational visibility."""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Client, IntegrationEvent

INTEGRATION_DEFS = [
    {
        "key": "microsoft-sentinel",
        "integration_name": "Microsoft Sentinel",
        "source_system": "Sentinel",
        "integration_source": "sentinel",
    },
    {
        "key": "generic-webhook",
        "integration_name": "Generic Webhook",
        "source_system": "Webhook",
        "integration_source": "webhook",
    },
]


class IntegrationStatusService:
    def __init__(self, db: Session):
        self.db = db

    def list_status(self, organization_id: uuid.UUID) -> list[dict]:
        client_count = (
            self.db.query(func.count(Client.id))
            .filter(Client.organization_id == organization_id, Client.status == "active")
            .scalar()
            or 0
        )
        mapping_status = "Configured" if client_count > 0 else "No Clients"
        api_configured = bool(settings.sentinel_api_key or settings.webhook_api_key)

        return [
            self._status_for_integration(
                organization_id,
                definition,
                api_key_configured=api_configured,
                client_mapping_status=mapping_status,
            )
            for definition in INTEGRATION_DEFS
        ]

    def get_status(self, organization_id: uuid.UUID, integration_key: str) -> dict | None:
        definition = next((d for d in INTEGRATION_DEFS if d["key"] == integration_key), None)
        if not definition:
            return None
        client_count = (
            self.db.query(func.count(Client.id))
            .filter(Client.organization_id == organization_id, Client.status == "active")
            .scalar()
            or 0
        )
        return self._status_for_integration(
            organization_id,
            definition,
            api_key_configured=bool(settings.sentinel_api_key or settings.webhook_api_key),
            client_mapping_status="Configured" if client_count > 0 else "No Clients",
        )

    def _status_for_integration(
        self,
        organization_id: uuid.UUID,
        definition: dict,
        *,
        api_key_configured: bool,
        client_mapping_status: str,
    ) -> dict:
        now = datetime.now(timezone.utc)
        since_24h = now - timedelta(hours=24)
        source = definition["integration_source"]

        events = (
            self.db.query(IntegrationEvent)
            .filter(
                IntegrationEvent.organization_id == organization_id,
                IntegrationEvent.integration_source == source,
            )
            .order_by(IntegrationEvent.created_at.desc())
            .limit(500)
            .all()
        )

        success_events = [
            e for e in events if e.status == "success" and e.event_type in ("alert_ingested",)
        ]
        failed_events = [e for e in events if e.status == "error"]
        recent_success = [e for e in success_events if self._aware(e.created_at) >= since_24h]
        recent_failed = [e for e in failed_events if self._aware(e.created_at) >= since_24h]

        last_success = success_events[0] if success_events else None
        last_error_event = failed_events[0] if failed_events else None

        status = self._derive_status(
            api_key_configured=api_key_configured,
            has_any_success=bool(success_events),
            recent_success=bool(recent_success),
            recent_failed_count=len(recent_failed),
            total_failed_count=len(failed_events),
        )

        return {
            "integration_key": definition["key"],
            "integration_name": definition["integration_name"],
            "source_system": definition["source_system"],
            "status": status,
            "last_alert_received_at": last_success.created_at.isoformat() if last_success else None,
            "alerts_received_last_24h": len(recent_success),
            "failed_payloads_last_24h": len(recent_failed),
            "last_error": last_error_event.error_message if last_error_event else None,
            "api_key_configured": api_key_configured,
            "client_mapping_status": client_mapping_status,
        }

    @staticmethod
    def _aware(dt: datetime) -> datetime:
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    @staticmethod
    def _derive_status(
        *,
        api_key_configured: bool,
        has_any_success: bool,
        recent_success: bool,
        recent_failed_count: int,
        total_failed_count: int,
    ) -> str:
        if not api_key_configured:
            return "Not Configured"
        if not has_any_success and total_failed_count == 0:
            return "No Recent Data"
        if recent_failed_count >= 3 or (recent_failed_count >= 1 and not recent_success):
            return "Error"
        if recent_success and recent_failed_count == 0:
            return "Healthy"
        if recent_failed_count > 0 or not recent_success:
            return "Warning"
        return "Warning"
