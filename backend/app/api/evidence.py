from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.security import enforce_client_access, get_current_user
from app.db.session import get_db
from app.models import Case, User
from app.schemas import CaseEvidenceCreate, CaseEvidenceResponse
from app.services.case_service import CaseService

router = APIRouter(prefix="/cases", tags=["case-evidence"])


@router.get("/{case_id}/evidence", response_model=list[CaseEvidenceResponse])
def list_evidence(
    case_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    enforce_client_access(user, case.client_id)
    case = CaseService(db).get_case_with_details(case_id)
    return case.evidence if case else []


@router.post("/{case_id}/evidence", response_model=CaseEvidenceResponse)
def create_evidence(
    case_id: UUID,
    payload: CaseEvidenceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    evidence = CaseService(db).add_evidence(
        case_id, user, payload.evidence_type, payload.title, payload.content, payload.source
    )
    db.commit()
    db.refresh(evidence)
    return evidence
