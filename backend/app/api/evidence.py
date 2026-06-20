from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth.security import enforce_client_access, get_current_user, is_client_user
from app.db.session import get_db
from app.models import Case, CaseEvidence, User
from app.schemas import CaseEvidenceCreate, CaseEvidenceResponse
from app.services.case_service import CaseService
from app.services.evidence_file_service import EvidenceFileService

router = APIRouter(prefix="/cases", tags=["case-evidence"])


def _evidence_response(e: CaseEvidence) -> CaseEvidenceResponse:
    data = CaseEvidenceResponse.model_validate(e)
    return data.model_copy(update={"has_file": bool(e.file_path)})


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
    items = EvidenceFileService(db).filter_for_user(case.evidence if case else [], user)
    return [_evidence_response(e) for e in items]


@router.post("/{case_id}/evidence", response_model=CaseEvidenceResponse)
def create_evidence(
    case_id: UUID,
    payload: CaseEvidenceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if is_client_user(user):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    evidence = CaseService(db).add_evidence(
        case_id, user, payload.evidence_type, payload.title, payload.content, payload.source
    )
    db.commit()
    db.refresh(evidence)
    return _evidence_response(evidence)


@router.post("/{case_id}/evidence/upload", response_model=CaseEvidenceResponse)
async def upload_evidence(
    case_id: UUID,
    file: UploadFile = File(...),
    visibility: str = Form("Internal"),
    title: str | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    evidence = EvidenceFileService(db).upload(case, user, file, visibility=visibility, title=title)
    db.commit()
    db.refresh(evidence)
    return _evidence_response(evidence)


@router.get("/{case_id}/evidence/{evidence_id}/download")
def download_evidence(
    case_id: UUID,
    evidence_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    evidence = db.query(CaseEvidence).filter(CaseEvidence.id == evidence_id, CaseEvidence.case_id == case_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    path = EvidenceFileService(db).get_download_path(evidence, user, case)
    db.commit()
    return FileResponse(
        path,
        media_type=evidence.mime_type or "application/octet-stream",
        filename=evidence.file_name or path.name,
    )
