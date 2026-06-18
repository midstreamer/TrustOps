from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.security import SOC_ROLES, enforce_client_access, get_current_user, get_user_roles, is_client_user
from app.db.session import get_db
from app.models import Case, User
from app.schemas import (
    AlertResponse,
    CaseAssign,
    CaseClose,
    CaseCreate,
    CaseEventResponse,
    CaseResponse,
    CaseUpdate,
    SLAEventResponse,
)
from app.services.case_service import CaseService
from app.services.sla_service import SLAService

router = APIRouter(prefix="/cases", tags=["cases"])


def _serialize_case(case: Case, sla_service: SLAService) -> CaseResponse:
    latest_ai = case.ai_recommendations[0] if case.ai_recommendations else None
    return CaseResponse(
        id=case.id,
        case_number=case.case_number,
        organization_id=case.organization_id,
        client_id=case.client_id,
        client_name=case.client.name if case.client else None,
        title=case.title,
        description=case.description,
        source_system=case.source_system,
        source_alert_id=case.source_alert_id,
        severity=case.severity,
        priority=case.priority,
        status=case.status,
        disposition=case.disposition,
        assigned_to_user_id=case.assigned_to_user_id,
        assigned_to_name=case.assigned_to.name if case.assigned_to else None,
        detected_at=case.detected_at,
        triaged_at=case.triaged_at,
        dispositioned_at=case.dispositioned_at,
        closed_at=case.closed_at,
        created_at=case.created_at,
        updated_at=case.updated_at,
        sla_status=sla_service.get_case_sla_summary(case.id),
        ai_confidence=latest_ai.confidence_score if latest_ai else None,
        alerts=[AlertResponse.model_validate(a) for a in case.alerts],
        sla_events=[SLAEventResponse.model_validate(e) for e in case.sla_events],
    )


@router.get("", response_model=list[CaseResponse])
def list_cases(
    client_id: UUID | None = None,
    severity: str | None = None,
    priority: str | None = None,
    status: str | None = None,
    assigned_to_me: bool = False,
    sla_at_risk: bool = False,
    sla_breached: bool = False,
    search: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not any(r in SOC_ROLES for r in get_user_roles(user)):
        if not is_client_user(user):
            raise HTTPException(status_code=403, detail="Insufficient permissions")

    client_ids = None
    if is_client_user(user) and user.client_id:
        client_ids = [user.client_id]
        client_id = user.client_id

    svc = CaseService(db)
    sla_svc = SLAService(db)
    cases = svc.list_cases(
        user.organization_id,
        client_id=client_id,
        severity=severity,
        priority=priority,
        status=status,
        assigned_to_me=user.id if assigned_to_me else None,
        search=search,
        client_ids=client_ids,
    )

    results = []
    for case in cases:
        sla_status = sla_svc.get_case_sla_summary(case.id)
        if sla_at_risk and sla_status != "At Risk":
            continue
        if sla_breached and sla_status != "Breached":
            continue
        results.append(_serialize_case(case, sla_svc))
    return results


@router.post("", response_model=CaseResponse)
def create_case(
    payload: CaseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not any(r in SOC_ROLES for r in get_user_roles(user)):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    alert_data = None
    if any(
        [
            payload.asset_name,
            payload.username,
            payload.source_ip,
            payload.raw_event,
        ]
    ):
        alert_data = {
            "title": payload.title,
            "description": payload.description,
            "source_system": payload.source_system,
            "source_alert_id": payload.source_alert_id,
            "asset_name": payload.asset_name,
            "username": payload.username,
            "source_ip": payload.source_ip,
            "destination_ip": payload.destination_ip,
            "raw_event": payload.raw_event,
            "detected_at": payload.detected_at,
        }

    svc = CaseService(db)
    sla_svc = SLAService(db)
    case = svc.create_case(
        organization_id=user.organization_id,
        client_id=payload.client_id,
        title=payload.title,
        severity=payload.severity,
        created_by=user,
        description=payload.description,
        source_system=payload.source_system,
        source_alert_id=payload.source_alert_id,
        priority=payload.priority,
        detected_at=payload.detected_at,
        assigned_to_user_id=payload.assigned_to_user_id,
        alert_data=alert_data,
    )
    sla_svc.create_sla_events_for_case(case)
    db.commit()
    case = svc.get_case_with_details(case.id)
    return _serialize_case(case, sla_svc)


@router.get("/{case_id}", response_model=CaseResponse)
def get_case(
    case_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    svc = CaseService(db)
    case = svc.get_case_with_details(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    enforce_client_access(user, case.client_id)
    return _serialize_case(case, SLAService(db))


@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(
    case_id: UUID,
    payload: CaseUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    svc = CaseService(db)
    case = svc.get_case_with_details(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    svc.update_case(case, **payload.model_dump(exclude_unset=True))
    db.commit()
    case = svc.get_case_with_details(case_id)
    return _serialize_case(case, SLAService(db))


@router.post("/{case_id}/assign", response_model=CaseResponse)
def assign_case(
    case_id: UUID,
    payload: CaseAssign,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    svc = CaseService(db)
    case = svc.get_case_with_details(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    svc.assign_case(case, payload.user_id, user)
    db.commit()
    case = svc.get_case_with_details(case_id)
    return _serialize_case(case, SLAService(db))


@router.post("/{case_id}/close", response_model=CaseResponse)
def close_case(
    case_id: UUID,
    payload: CaseClose,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    svc = CaseService(db)
    sla_svc = SLAService(db)
    case = svc.get_case_with_details(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    svc.close_case(case, user, payload.disposition)
    sla_svc.complete_sla(case.id, "Closure")
    db.commit()
    case = svc.get_case_with_details(case_id)
    return _serialize_case(case, sla_svc)


@router.get("/{case_id}/timeline", response_model=list[CaseEventResponse])
def get_timeline(
    case_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    svc = CaseService(db)
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    enforce_client_access(user, case.client_id)
    return svc.get_timeline(case_id)
