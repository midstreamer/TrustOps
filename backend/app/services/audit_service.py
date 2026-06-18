import uuid

from sqlalchemy.orm import Session

from app.models import AuditLog, User


class AuditLogService:
    @staticmethod
    def log(
        db: Session,
        *,
        event_type: str,
        user: User | None = None,
        organization_id: uuid.UUID | None = None,
        client_id: uuid.UUID | None = None,
        case_id: uuid.UUID | None = None,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
        previous_value: dict | None = None,
        new_value: dict | None = None,
        ip_address: str | None = None,
    ) -> AuditLog:
        entry = AuditLog(
            organization_id=organization_id or (user.organization_id if user else None),
            client_id=client_id,
            user_id=user.id if user else None,
            case_id=case_id,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            previous_value_json=previous_value,
            new_value_json=new_value,
            ip_address=ip_address,
        )
        db.add(entry)
        return entry
