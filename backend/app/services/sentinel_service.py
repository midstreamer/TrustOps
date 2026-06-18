"""Microsoft Sentinel alert ingestion — maps Sentinel payloads to TrustOps cases."""

import json
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.constants import SEVERITIES
from app.models import Client, User
from app.services.webhook_service import WebhookAlertService

SENTINEL_SEVERITY_MAP = {
    "high": "High",
    "medium": "Medium",
    "low": "Low",
    "informational": "Informational",
    "critical": "Critical",
}


def _map_severity(value: str | None) -> str:
    if not value:
        return "Medium"
    normalized = value.strip()
    if normalized in SEVERITIES:
        return normalized
    mapped = SENTINEL_SEVERITY_MAP.get(normalized.lower())
    if mapped:
        return mapped
    raise HTTPException(status_code=400, detail=f"Invalid severity: {value}")


def _entity_value(entities: list | None, entity_type: str, field: str) -> str | None:
    if not entities:
        return None
    for entity in entities:
        if isinstance(entity, dict) and entity.get("$id") == entity_type:
            return entity.get(field) or entity.get("properties", {}).get(field)
        if isinstance(entity, dict) and entity.get("kind", "").lower() == entity_type.lower():
            return entity.get(field) or entity.get("properties", {}).get(field)
    return None


def _extract_entities(entities: list | None) -> dict[str, str | None]:
    username = _entity_value(entities, "Account", "name") or _entity_value(entities, "account", "name")
    asset = _entity_value(entities, "Host", "hostName") or _entity_value(entities, "host", "hostName")
    source_ip = _entity_value(entities, "Ip", "address") or _entity_value(entities, "ip", "address")
    return {"username": username, "asset_name": asset, "source_ip": source_ip}


class SentinelAlertService:
    def __init__(self, db: Session):
        self.db = db
        self.webhook = WebhookAlertService(db)

    def ingest(self, payload: dict, actor: User | None = None) -> dict:
        client_id_raw = payload.get("client_id")
        if not client_id_raw:
            raise HTTPException(status_code=400, detail="client_id is required")

        try:
            client_id = uuid.UUID(str(client_id_raw))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="client_id must be a valid UUID") from exc

        client = self.db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="client_id not found")

        title = (
            payload.get("title")
            or payload.get("displayName")
            or payload.get("alertDisplayName")
        )
        if not title or not str(title).strip():
            raise HTTPException(status_code=400, detail="title or displayName is required")

        severity = _map_severity(payload.get("severity"))
        entities = payload.get("entities")
        extracted = _extract_entities(entities if isinstance(entities, list) else None)

        tactics = payload.get("tactics") or payload.get("mitre_tactic")
        if isinstance(tactics, list):
            mitre_tactic = ", ".join(tactics) if tactics else None
        else:
            mitre_tactic = tactics

        techniques = payload.get("techniques") or payload.get("mitre_technique")
        if isinstance(techniques, list):
            mitre_technique = ", ".join(techniques) if techniques else None
        else:
            mitre_technique = techniques

        detected_raw = (
            payload.get("detected_at")
            or payload.get("endTimeUtc")
            or payload.get("startTimeUtc")
            or payload.get("timeGenerated")
        )
        detected_at = None
        if detected_raw:
            try:
                detected_at = datetime.fromisoformat(str(detected_raw).replace("Z", "+00:00"))
            except ValueError:
                detected_at = datetime.now(timezone.utc)

        source_alert_id = (
            payload.get("source_alert_id")
            or payload.get("systemAlertId")
            or payload.get("alertId")
        )

        serializable = {k: str(v) if isinstance(v, uuid.UUID) else v for k, v in payload.items()}
        result = self.webhook.ingest(
            organization_id=client.organization_id,
            client_id=client_id,
            title=str(title).strip(),
            severity=severity,
            actor=actor,
            description=payload.get("description") or payload.get("alertDescription"),
            source_system="Microsoft Sentinel",
            source_alert_id=str(source_alert_id) if source_alert_id else None,
            priority=payload.get("priority"),
            asset_name=payload.get("asset_name") or extracted["asset_name"],
            username=payload.get("username") or extracted["username"],
            source_ip=payload.get("source_ip") or extracted["source_ip"],
            destination_ip=payload.get("destination_ip"),
            mitre_tactic=mitre_tactic,
            mitre_technique=mitre_technique,
            raw_event=json.dumps(serializable) if serializable else None,
            detected_at=detected_at,
            integration_source="sentinel",
        )
        result["integration"] = "microsoft-sentinel"
        return result
