"""Per-client integration key management — hash-only storage."""

import hashlib
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Client, IntegrationKey, User
from app.services.audit_service import AuditLogService

KEY_PREFIX_LEN = 12
STATUSES_ACTIVE = {"Active"}


def _hash_key(raw_key: str) -> str:
    material = f"{settings.jwt_secret}:{raw_key}"
    return hashlib.sha256(material.encode()).hexdigest()


def _generate_raw_key() -> str:
    return f"tos_{secrets.token_urlsafe(24)}"


class IntegrationKeyService:
    def __init__(self, db: Session):
        self.db = db

    def list_keys(
        self,
        organization_id: uuid.UUID,
        *,
        client_id: uuid.UUID | None = None,
    ) -> list[IntegrationKey]:
        q = self.db.query(IntegrationKey).filter(IntegrationKey.organization_id == organization_id)
        if client_id:
            q = q.filter(IntegrationKey.client_id == client_id)
        return q.order_by(IntegrationKey.created_at.desc()).all()

    def create_key(
        self,
        *,
        organization_id: uuid.UUID,
        client_id: uuid.UUID,
        integration_name: str,
        source_system: str,
        actor: User,
    ) -> dict:
        client = (
            self.db.query(Client)
            .filter(Client.id == client_id, Client.organization_id == organization_id)
            .first()
        )
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        raw_key = _generate_raw_key()
        record = IntegrationKey(
            organization_id=organization_id,
            client_id=client_id,
            integration_name=integration_name,
            source_system=source_system,
            key_hash=_hash_key(raw_key),
            key_prefix=raw_key[:KEY_PREFIX_LEN],
            status="Active",
            created_by_user_id=actor.id,
        )
        self.db.add(record)
        self.db.flush()

        AuditLogService.log(
            self.db,
            event_type="integration_key_created",
            user=actor,
            organization_id=organization_id,
            client_id=client_id,
            entity_type="integration_key",
            entity_id=record.id,
            new_value={"key_prefix": record.key_prefix, "integration_name": integration_name},
        )

        return {
            "id": record.id,
            "client_id": client_id,
            "integration_name": integration_name,
            "source_system": source_system,
            "key_prefix": record.key_prefix,
            "raw_key": raw_key,
            "status": record.status,
            "created_at": record.created_at,
        }

    def rotate_key(self, key_id: uuid.UUID, organization_id: uuid.UUID, actor: User) -> dict:
        old = self._get_key(key_id, organization_id)
        if old.status != "Active":
            raise HTTPException(status_code=400, detail="Only active keys can be rotated")

        now = datetime.now(timezone.utc)
        old.status = "Rotated"
        old.rotated_at = now

        raw_key = _generate_raw_key()
        new_key = IntegrationKey(
            organization_id=old.organization_id,
            client_id=old.client_id,
            integration_name=old.integration_name,
            source_system=old.source_system,
            key_hash=_hash_key(raw_key),
            key_prefix=raw_key[:KEY_PREFIX_LEN],
            status="Active",
            created_by_user_id=actor.id,
        )
        self.db.add(new_key)
        self.db.flush()

        AuditLogService.log(
            self.db,
            event_type="integration_key_rotated",
            user=actor,
            organization_id=organization_id,
            client_id=old.client_id,
            entity_type="integration_key",
            entity_id=new_key.id,
            previous_value={"old_key_id": str(old.id), "old_prefix": old.key_prefix},
            new_value={"new_key_id": str(new_key.id), "new_prefix": new_key.key_prefix},
        )

        return {
            "id": new_key.id,
            "client_id": new_key.client_id,
            "integration_name": new_key.integration_name,
            "source_system": new_key.source_system,
            "key_prefix": new_key.key_prefix,
            "raw_key": raw_key,
            "status": new_key.status,
            "created_at": new_key.created_at,
        }

    def revoke_key(self, key_id: uuid.UUID, organization_id: uuid.UUID, actor: User) -> IntegrationKey:
        key = self._get_key(key_id, organization_id)
        key.status = "Revoked"
        key.revoked_at = datetime.now(timezone.utc)
        AuditLogService.log(
            self.db,
            event_type="integration_key_revoked",
            user=actor,
            organization_id=organization_id,
            client_id=key.client_id,
            entity_type="integration_key",
            entity_id=key.id,
            new_value={"key_prefix": key.key_prefix},
        )
        return key

    def disable_key(self, key_id: uuid.UUID, organization_id: uuid.UUID, actor: User) -> IntegrationKey:
        key = self._get_key(key_id, organization_id)
        key.status = "Disabled"
        AuditLogService.log(
            self.db,
            event_type="integration_key_disabled",
            user=actor,
            organization_id=organization_id,
            client_id=key.client_id,
            entity_type="integration_key",
            entity_id=key.id,
            new_value={"key_prefix": key.key_prefix},
        )
        return key

    def authenticate(self, raw_key: str | None, client_id: uuid.UUID) -> IntegrationKey | None:
        if not raw_key:
            return None
        key_hash = _hash_key(raw_key)
        record = (
            self.db.query(IntegrationKey)
            .filter(
                IntegrationKey.key_hash == key_hash,
                IntegrationKey.client_id == client_id,
                IntegrationKey.status == "Active",
            )
            .first()
        )
        if record:
            record.last_used_at = datetime.now(timezone.utc)
        return record

    def env_key_allowed(self) -> bool:
        return settings.deployment_mode == "local-demo"

    def verify_env_key(self, raw_key: str | None) -> bool:
        if not self.env_key_allowed():
            return False
        expected = settings.sentinel_api_key or settings.webhook_api_key
        return bool(raw_key and expected and raw_key == expected)

    def _get_key(self, key_id: uuid.UUID, organization_id: uuid.UUID) -> IntegrationKey:
        key = (
            self.db.query(IntegrationKey)
            .filter(IntegrationKey.id == key_id, IntegrationKey.organization_id == organization_id)
            .first()
        )
        if not key:
            raise HTTPException(status_code=404, detail="Integration key not found")
        return key
