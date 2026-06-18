from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.security import enforce_client_access, get_current_user, is_client_user
from app.db.session import get_db
from app.models import Case, CaseNote, User
from app.schemas import CaseNoteCreate, CaseNoteResponse, CaseNoteUpdate
from app.services.case_service import CaseService

router = APIRouter(prefix="/cases", tags=["case-notes"])


@router.get("/{case_id}/notes", response_model=list[CaseNoteResponse])
def list_notes(
    case_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    enforce_client_access(user, case.client_id)
    q = db.query(CaseNote).filter(CaseNote.case_id == case_id)
    if is_client_user(user):
        q = q.filter(CaseNote.visibility == "Client Visible")
    return q.order_by(CaseNote.created_at.desc()).all()


@router.post("/{case_id}/notes", response_model=CaseNoteResponse)
def create_note(
    case_id: UUID,
    payload: CaseNoteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if is_client_user(user) and payload.visibility == "Internal":
        raise HTTPException(status_code=403, detail="Cannot create internal notes")
    note = CaseService(db).add_note(case_id, user, payload.note_text, payload.visibility)
    db.commit()
    db.refresh(note)
    return note


@router.patch("/{case_id}/notes/{note_id}", response_model=CaseNoteResponse)
def update_note(
    case_id: UUID,
    note_id: UUID,
    payload: CaseNoteUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    note = db.query(CaseNote).filter(CaseNote.id == note_id, CaseNote.case_id == case_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(note, k, v)
    db.commit()
    db.refresh(note)
    return note
