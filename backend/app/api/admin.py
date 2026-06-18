from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.security import MANAGER_ROLES, get_current_user, require_roles
from app.db.session import get_db
from app.models import User
from app.schemas import ClientResponse, SLAPolicyResponse, WebhookAlertResponse
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])


class DemoCaseRequest(BaseModel):
    title: str | None = None


@router.get("/overview")
def admin_overview(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin", *MANAGER_ROLES)),
):
    """Setup status for MDR multi-client onboarding."""
    return AdminService(db).get_overview(user.organization_id)


@router.post("/clients/{client_id}/default-sla-policies", response_model=list[SLAPolicyResponse])
def apply_default_sla_policies(
    client_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin", *MANAGER_ROLES)),
):
    """Apply standard Critical/High SLA templates to a managed client."""
    policies = AdminService(db).apply_default_sla_policies(client_id, user.organization_id)
    db.commit()
    return policies


@router.post("/clients/{client_id}/demo-case", response_model=WebhookAlertResponse)
def create_demo_case(
    client_id: UUID,
    payload: DemoCaseRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin", *MANAGER_ROLES)),
):
    """Generate a sample case for onboarding validation."""
    result = AdminService(db).create_demo_case(
        organization_id=user.organization_id,
        client_id=client_id,
        actor=user,
        title=payload.title,
    )
    db.commit()
    return result
