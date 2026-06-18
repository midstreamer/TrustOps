from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.security import MANAGER_ROLES, enforce_client_access, get_current_user, require_roles
from app.db.session import get_db
from app.models import Case, Client, SLAPolicy, SLAEvent, User
from app.schemas import SLAPolicyCreate, SLAPolicyResponse, SLAPolicyUpdate, SLAEventResponse
from app.services.sla_service import SLAService

router = APIRouter(tags=["sla"])


@router.get("/clients/{client_id}/sla-policies", response_model=list[SLAPolicyResponse])
def list_sla_policies(
    client_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    enforce_client_access(user, client_id)
    return db.query(SLAPolicy).filter(SLAPolicy.client_id == client_id).all()


@router.post("/clients/{client_id}/sla-policies", response_model=SLAPolicyResponse)
def create_sla_policy(
    client_id: UUID,
    payload: SLAPolicyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    policy = SLAPolicy(client_id=client_id, **payload.model_dump())
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@router.patch("/sla-policies/{sla_policy_id}", response_model=SLAPolicyResponse)
def update_sla_policy(
    sla_policy_id: UUID,
    payload: SLAPolicyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    policy = db.query(SLAPolicy).filter(SLAPolicy.id == sla_policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="SLA policy not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(policy, k, v)
    db.commit()
    db.refresh(policy)
    return policy


@router.get("/cases/{case_id}/sla-events", response_model=list[SLAEventResponse])
def get_case_sla_events(
    case_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    enforce_client_access(user, case.client_id)
    sla_svc = SLAService(db)
    events = db.query(SLAEvent).filter(SLAEvent.case_id == case_id).all()
    for e in events:
        sla_svc.refresh_sla_status(e)
    db.commit()
    return events
