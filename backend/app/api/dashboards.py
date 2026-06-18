from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.security import (
    CLIENT_ROLES,
    MANAGER_ROLES,
    SOC_ROLES,
    enforce_client_access,
    get_current_user,
    get_user_roles,
    is_client_user,
    require_roles,
)
from app.db.session import get_db
from app.models import User
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


@router.get("/soc-manager")
def soc_manager_dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    return DashboardService(db).soc_manager_metrics(user.organization_id)


@router.get("/analyst")
def analyst_dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*SOC_ROLES)),
):
    return DashboardService(db).analyst_metrics(user.organization_id, user.id)


@router.get("/client/{client_id}")
def client_dashboard(
    client_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    enforce_client_access(user, client_id)
    published_only = is_client_user(user)
    return DashboardService(db).client_metrics(client_id, published_only=published_only)


@router.get("/executive")
def executive_dashboard(
    client_id: UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if is_client_user(user):
        if not user.client_id:
            raise HTTPException(status_code=403, detail="No client assigned")
        return DashboardService(db).client_metrics(user.client_id, published_only=True)
    if client_id:
        return DashboardService(db).client_metrics(client_id)
    return DashboardService(db).soc_manager_metrics(user.organization_id)


@router.get("/trust-metrics")
def trust_metrics_dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    from app.services.trust_metrics_service import TrustMetricsService

    return TrustMetricsService(db).get_metrics(user.organization_id)
