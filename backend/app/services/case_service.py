import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.models import Alert, Case, CaseEvent, CaseEvidence, CaseNote, User


class CaseService:
    def __init__(self, db: Session):
        self.db = db

    def _next_case_number(self, org_id: uuid.UUID) -> str:
        count = self.db.query(Case).filter(Case.organization_id == org_id).count()
        return f"CASE-{count + 1:05d}"

    def create_case(
        self,
        *,
        organization_id: uuid.UUID,
        client_id: uuid.UUID,
        title: str,
        severity: str,
        created_by: User | None = None,
        description: str | None = None,
        source_system: str | None = None,
        source_alert_id: str | None = None,
        priority: str | None = None,
        detected_at: datetime | None = None,
        assigned_to_user_id: uuid.UUID | None = None,
        alert_data: dict | None = None,
    ) -> Case:
        case = Case(
            case_number=self._next_case_number(organization_id),
            organization_id=organization_id,
            client_id=client_id,
            title=title,
            description=description,
            source_system=source_system,
            source_alert_id=source_alert_id,
            severity=severity,
            priority=priority,
            detected_at=detected_at,
            assigned_to_user_id=assigned_to_user_id,
            status="New",
        )
        self.db.add(case)
        self.db.flush()

        if alert_data:
            alert = Alert(case_id=case.id, client_id=client_id, severity=severity, **alert_data)
            self.db.add(alert)

        self.add_event(case.id, "Case Created", f"Case {case.case_number} created", created_by)
        if created_by:
            from app.services.audit_service import AuditLogService

            AuditLogService.log(
                self.db,
                event_type="case_created",
                user=created_by,
                client_id=client_id,
                case_id=case.id,
                entity_type="case",
                entity_id=case.id,
                new_value={"case_number": case.case_number, "title": title, "severity": severity},
            )
        return case

    def update_case(self, case: Case, **fields: Any) -> Case:
        for key, value in fields.items():
            if value is not None and hasattr(case, key):
                setattr(case, key, value)
        return case

    def assign_case(self, case: Case, user_id: uuid.UUID, assigned_by: User) -> Case:
        case.assigned_to_user_id = user_id
        case.status = case.status if case.status != "New" else "Investigating"
        self.add_event(case.id, "Case Assigned", f"Assigned to user {user_id}", assigned_by)
        return case

    def close_case(self, case: Case, user: User, disposition: str | None = None) -> Case:
        now = datetime.now(timezone.utc)
        case.status = "Closed"
        case.closed_at = now
        if disposition:
            case.disposition = disposition
        self.add_event(case.id, "Case Closed", "Case closed", user)
        return case

    def add_event(
        self,
        case_id: uuid.UUID,
        event_type: str,
        description: str | None = None,
        user: User | None = None,
    ) -> CaseEvent:
        event = CaseEvent(
            case_id=case_id,
            event_type=event_type,
            event_description=description,
            created_by_user_id=user.id if user else None,
        )
        self.db.add(event)
        return event

    def get_timeline(self, case_id: uuid.UUID) -> list[CaseEvent]:
        return (
            self.db.query(CaseEvent)
            .filter(CaseEvent.case_id == case_id)
            .order_by(CaseEvent.created_at.asc())
            .all()
        )

    def get_case_with_details(self, case_id: uuid.UUID) -> Case | None:
        return (
            self.db.query(Case)
            .options(
                joinedload(Case.client),
                joinedload(Case.assigned_to),
                joinedload(Case.alerts),
                joinedload(Case.notes),
                joinedload(Case.evidence),
                joinedload(Case.ai_recommendations),
                joinedload(Case.analyst_decisions),
                joinedload(Case.sla_events),
                joinedload(Case.events),
            )
            .filter(Case.id == case_id)
            .first()
        )

    def list_cases(
        self,
        organization_id: uuid.UUID,
        *,
        client_id: uuid.UUID | None = None,
        severity: str | None = None,
        priority: str | None = None,
        status: str | None = None,
        assigned_to_me: uuid.UUID | None = None,
        search: str | None = None,
        client_ids: list[uuid.UUID] | None = None,
    ) -> list[Case]:
        q = (
            self.db.query(Case)
            .options(
                joinedload(Case.client),
                joinedload(Case.assigned_to),
                joinedload(Case.sla_events),
                joinedload(Case.ai_recommendations),
            )
            .filter(Case.organization_id == organization_id)
        )
        if client_id:
            q = q.filter(Case.client_id == client_id)
        if client_ids is not None:
            q = q.filter(Case.client_id.in_(client_ids))
        if severity:
            q = q.filter(Case.severity == severity)
        if priority:
            q = q.filter(Case.priority == priority)
        if status:
            q = q.filter(Case.status == status)
        if assigned_to_me:
            q = q.filter(Case.assigned_to_user_id == assigned_to_me)
        if search:
            term = f"%{search}%"
            q = q.filter((Case.title.ilike(term)) | (Case.case_number.ilike(term)))
        return q.order_by(Case.created_at.desc()).all()

    def add_note(
        self, case_id: uuid.UUID, user: User, note_text: str, visibility: str = "Internal"
    ) -> CaseNote:
        note = CaseNote(
            case_id=case_id,
            created_by_user_id=user.id,
            note_text=note_text,
            visibility=visibility,
        )
        self.db.add(note)
        return note

    def add_evidence(
        self,
        case_id: uuid.UUID,
        user: User,
        evidence_type: str,
        title: str,
        content: str | None = None,
        source: str | None = None,
    ) -> CaseEvidence:
        evidence = CaseEvidence(
            case_id=case_id,
            created_by_user_id=user.id,
            evidence_type=evidence_type,
            title=title,
            content=content,
            source=source,
        )
        self.db.add(evidence)
        return evidence
