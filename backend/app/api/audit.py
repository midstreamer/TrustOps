from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.security import MANAGER_ROLES, require_roles
from app.db.session import get_db
from app.models import User
from app.schemas import AuditLogListResponse
from app.services.audit_log_query_service import AuditLogQueryService

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    user_id: UUID | None = None,
    client_id: UUID | None = None,
    case_id: UUID | None = None,
    event_type: str | None = None,
    entity_type: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin", *MANAGER_ROLES)),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be on or before end_date")
    return AuditLogQueryService(db).list_logs(
        user.organization_id,
        user_id=user_id,
        client_id=client_id,
        case_id=case_id,
        event_type=event_type,
        entity_type=entity_type,
        start_date=start_date,
        end_date=end_date,
        search=search,
        limit=limit,
        offset=offset,
    )
