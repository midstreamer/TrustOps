"""Controlled evidence file uploads."""

import hashlib
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth.security import is_client_user
from app.core.config import settings
from app.models import Case, CaseEvidence, User
from app.services.audit_service import AuditLogService

ALLOWED_EXTENSIONS = {".txt", ".log", ".csv", ".json", ".png", ".jpg", ".jpeg", ".pdf"}
MIME_MAP = {
    ".txt": "text/plain",
    ".log": "text/plain",
    ".csv": "text/csv",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
}


class EvidenceFileService:
    def __init__(self, db: Session):
        self.db = db
        self.max_bytes = settings.max_evidence_file_mb * 1024 * 1024
        self.storage_root = Path(settings.evidence_storage_path)

    def upload(
        self,
        case: Case,
        user: User,
        file: UploadFile,
        *,
        visibility: str = "Internal",
        title: str | None = None,
    ) -> CaseEvidence:
        if is_client_user(user):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        if visibility not in ("Internal", "Client Visible"):
            raise HTTPException(status_code=400, detail="Invalid visibility")

        ext = self._safe_extension(file.filename or "")
        content = file.file.read()
        if len(content) > self.max_bytes:
            raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_evidence_file_mb}MB limit")
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file")

        file_hash = hashlib.sha256(content).hexdigest()
        safe_name = f"{uuid.uuid4().hex}{ext}"
        dest_dir = self.storage_root / str(case.organization_id) / str(case.id)
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / safe_name
        dest_path.write_bytes(content)

        evidence = CaseEvidence(
            case_id=case.id,
            evidence_type="File",
            title=title or (file.filename or "Uploaded file"),
            content=None,
            source="upload",
            created_by_user_id=user.id,
            file_name=file.filename,
            file_path=str(dest_path.relative_to(self.storage_root)),
            mime_type=file.content_type or MIME_MAP.get(ext, "application/octet-stream"),
            file_size_bytes=len(content),
            file_hash=file_hash,
            visibility=visibility,
            uploaded_at=datetime.now(timezone.utc),
        )
        self.db.add(evidence)
        self.db.flush()

        AuditLogService.log(
            self.db,
            event_type="evidence_file_uploaded",
            user=user,
            organization_id=case.organization_id,
            client_id=case.client_id,
            case_id=case.id,
            entity_type="evidence",
            entity_id=evidence.id,
            new_value={"file_name": evidence.file_name, "visibility": visibility, "file_hash": file_hash},
        )
        return evidence

    def get_download_path(self, evidence: CaseEvidence, user: User, case: Case) -> Path:
        if not evidence.file_path:
            raise HTTPException(status_code=404, detail="Not a file evidence item")

        if is_client_user(user):
            if user.client_id != case.client_id:
                raise HTTPException(status_code=403, detail="Access denied")
            if evidence.visibility != "Client Visible":
                raise HTTPException(status_code=403, detail="Evidence not visible to client")

        full_path = self.storage_root / evidence.file_path
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="File not found on disk")

        AuditLogService.log(
            self.db,
            event_type="evidence_file_downloaded",
            user=user,
            organization_id=case.organization_id,
            client_id=case.client_id,
            case_id=case.id,
            entity_type="evidence",
            entity_id=evidence.id,
            new_value={"file_name": evidence.file_name},
        )
        return full_path

    @staticmethod
    def _safe_extension(filename: str) -> str:
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )
        return ext

    @staticmethod
    def filter_for_user(evidence: list[CaseEvidence], user: User) -> list[CaseEvidence]:
        if not is_client_user(user):
            return evidence
        return [e for e in evidence if e.visibility == "Client Visible"]
