from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth.security import SOC_ROLES, get_current_user, get_user_roles
from app.db.session import get_db
from app.models import AlertImport, User
from app.schemas import ImportPreviewResponse
from app.services.import_service import AlertImportService

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/alerts/csv", response_model=ImportPreviewResponse)
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not any(r in SOC_ROLES for r in get_user_roles(user)):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    content = (await file.read()).decode("utf-8")
    imp = AlertImportService(db).preview(
        user.organization_id, user, file.filename or "import.csv", content
    )
    return imp


@router.get("/{import_id}/preview", response_model=ImportPreviewResponse)
def get_preview(
    import_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    imp = db.query(AlertImport).filter(AlertImport.id == import_id).first()
    if not imp:
        raise HTTPException(status_code=404, detail="Import not found")
    return imp


@router.post("/{import_id}/confirm")
def confirm_import(
    import_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not any(r in SOC_ROLES for r in get_user_roles(user)):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    result = AlertImportService(db).confirm(import_id)
    return result
