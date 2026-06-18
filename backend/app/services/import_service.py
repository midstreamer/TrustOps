import csv
import io
import uuid
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import AlertImport, Client, User
from app.services.case_service import CaseService
from app.services.sla_service import SLAService

REQUIRED_COLUMNS = [
    "client_name",
    "alert_title",
    "alert_description",
    "source_system",
    "severity",
    "detected_at",
]

OPTIONAL_COLUMNS = [
    "source_alert_id",
    "asset_name",
    "username",
    "source_ip",
    "destination_ip",
    "mitre_tactic",
    "mitre_technique",
    "raw_event",
]


class AlertImportService:
    def __init__(self, db: Session):
        self.db = db
        self.case_service = CaseService(db)
        self.sla_service = SLAService(db)

    def parse_csv(self, content: str) -> list[dict]:
        reader = csv.DictReader(io.StringIO(content))
        return list(reader)

    def validate_row(self, row: dict, clients_by_name: dict[str, Client]) -> list[str]:
        errors = []
        for col in REQUIRED_COLUMNS:
            if not row.get(col, "").strip():
                errors.append(f"Missing required field: {col}")
        client_name = row.get("client_name", "").strip()
        if client_name and client_name not in clients_by_name:
            errors.append(f"Unknown client: {client_name}")
        detected = row.get("detected_at", "").strip()
        if detected:
            try:
                datetime.fromisoformat(detected.replace("Z", "+00:00"))
            except ValueError:
                errors.append("Invalid detected_at format (use ISO 8601)")
        return errors

    def preview(self, organization_id: uuid.UUID, user: User, filename: str, content: str) -> AlertImport:
        rows = self.parse_csv(content)
        if not rows:
            raise HTTPException(status_code=400, detail="CSV is empty")

        clients = (
            self.db.query(Client).filter(Client.organization_id == organization_id).all()
        )
        clients_by_name = {c.name: c for c in clients}

        valid_rows = []
        failed_rows = []
        for i, row in enumerate(rows, start=2):
            errors = self.validate_row(row, clients_by_name)
            if errors:
                failed_rows.append({"row": i, "data": row, "errors": errors})
            else:
                valid_rows.append({"row": i, "data": row})

        imp = AlertImport(
            organization_id=organization_id,
            uploaded_by_user_id=user.id,
            filename=filename,
            status="preview",
            preview_json={"valid_rows": valid_rows, "failed_rows": failed_rows, "raw": rows},
        )
        self.db.add(imp)
        self.db.commit()
        self.db.refresh(imp)
        return imp

    def confirm(self, import_id: uuid.UUID) -> dict:
        imp = self.db.query(AlertImport).filter(AlertImport.id == import_id).first()
        if not imp or not imp.preview_json:
            raise HTTPException(status_code=404, detail="Import not found")
        if imp.status == "confirmed":
            raise HTTPException(status_code=400, detail="Import already confirmed")

        clients = (
            self.db.query(Client).filter(Client.organization_id == imp.organization_id).all()
        )
        clients_by_name = {c.name: c for c in clients}
        created_cases = []

        for item in imp.preview_json.get("valid_rows", []):
            row = item["data"]
            client = clients_by_name[row["client_name"].strip()]
            detected_at = None
            if row.get("detected_at"):
                detected_at = datetime.fromisoformat(row["detected_at"].replace("Z", "+00:00"))

            case = self.case_service.create_case(
                organization_id=imp.organization_id,
                client_id=client.id,
                title=row["alert_title"].strip(),
                description=row.get("alert_description", "").strip() or None,
                source_system=row.get("source_system", "").strip() or None,
                source_alert_id=row.get("source_alert_id", "").strip() or None,
                severity=row["severity"].strip(),
                detected_at=detected_at,
                alert_data={
                    "title": row["alert_title"].strip(),
                    "description": row.get("alert_description", "").strip() or None,
                    "source_system": row.get("source_system", "").strip() or None,
                    "source_alert_id": row.get("source_alert_id", "").strip() or None,
                    "asset_name": row.get("asset_name", "").strip() or None,
                    "username": row.get("username", "").strip() or None,
                    "source_ip": row.get("source_ip", "").strip() or None,
                    "destination_ip": row.get("destination_ip", "").strip() or None,
                    "mitre_tactic": row.get("mitre_tactic", "").strip() or None,
                    "mitre_technique": row.get("mitre_technique", "").strip() or None,
                    "raw_event": row.get("raw_event", "").strip() or None,
                    "detected_at": detected_at,
                },
            )
            self.sla_service.create_sla_events_for_case(case)
            created_cases.append(str(case.id))

        imp.status = "confirmed"
        self.db.commit()
        return {"created_count": len(created_cases), "case_ids": created_cases}
