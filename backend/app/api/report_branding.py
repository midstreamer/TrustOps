from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.security import MANAGER_ROLES, enforce_client_access, get_current_user, is_client_user, require_roles
from app.db.session import get_db
from app.models import User
from app.schemas import ReportBrandingCreate, ReportBrandingResponse
from app.services.report_branding_service import ReportBrandingService

router = APIRouter(prefix="/report-branding", tags=["report-branding"])


@router.get("", response_model=list[ReportBrandingResponse])
def list_report_branding(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin", *MANAGER_ROLES)),
):
    items = ReportBrandingService(db).list_branding(user.organization_id)
    return [ReportBrandingResponse.model_validate(b) for b in items]


@router.post("", response_model=ReportBrandingResponse)
def create_org_report_branding(
    payload: ReportBrandingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin", *MANAGER_ROLES)),
):
    branding = ReportBrandingService(db).upsert(
        user.organization_id,
        client_id=payload.client_id,
        data=payload.model_dump(exclude_unset=True),
    )
    db.commit()
    db.refresh(branding)
    return ReportBrandingResponse.model_validate(branding)


@router.get("/clients/{client_id}")
def get_client_report_branding(
    client_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    enforce_client_access(user, client_id)
    return ReportBrandingService(db).resolve(user.organization_id, client_id)


@router.post("/clients/{client_id}", response_model=ReportBrandingResponse)
def upsert_client_report_branding(
    client_id: UUID,
    payload: ReportBrandingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin", *MANAGER_ROLES)),
):
    branding = ReportBrandingService(db).upsert(
        user.organization_id,
        client_id=client_id,
        data=payload.model_dump(exclude_unset=True),
    )
    db.commit()
    db.refresh(branding)
    return ReportBrandingResponse.model_validate(branding)
