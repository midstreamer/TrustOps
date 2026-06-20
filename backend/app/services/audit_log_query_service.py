"""Query service for audit log viewer."""

import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import AuditLog, Case, Client, User

EVENT_TYPE_LABELS = {
    "case_created": "Case Created",
    "case_assigned": "Case Assigned",
    "case_status_changed": "Case Status Changed",
    "ai_recommendation_generated": "AI Recommendation Generated",
    "analyst_decision_submitted": "Analyst Decision Submitted",
    "sla_breached": "SLA Breached",
    "qa_review_submitted": "QA Review Submitted",
    "report_generated": "Report Generated",
    "report_published": "Report Published",
    "sentinel_alert_ingested": "Sentinel Alert Ingested",
    "webhook_alert_ingested": "Webhook Alert Ingested",
    "user_role_changed": "User Role Changed",
    "integration_key_rotated": "Integration Key Rotated",
}


class AuditLogQueryService:
    def __init__(self, db: Session):
        self.db = db

    def list_logs(
        self,
        organization_id: uuid.UUID,
        *,
        user_id: uuid.UUID | None = None,
        client_id: uuid.UUID | None = None,
        case_id: uuid.UUID | None = None,
        event_type: str | None = None,
        entity_type: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        q = self.db.query(AuditLog).filter(AuditLog.organization_id == organization_id)

        if user_id:
            q = q.filter(AuditLog.user_id == user_id)
        if client_id:
            q = q.filter(AuditLog.client_id == client_id)
        if case_id:
            q = q.filter(AuditLog.case_id == case_id)
        if event_type:
            q = q.filter(AuditLog.event_type == event_type)
        if entity_type:
            q = q.filter(AuditLog.entity_type == entity_type)
        if start_date:
            q = q.filter(AuditLog.created_at >= datetime.combine(start_date, time.min, tzinfo=timezone.utc))
        if end_date:
            end_exclusive = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=timezone.utc)
            q = q.filter(AuditLog.created_at < end_exclusive)

        if search:
            term = f"%{search.strip()}%"
            filters = [AuditLog.event_type.ilike(term)]
            case_ids = [
                row[0]
                for row in self.db.query(Case.id)
                .filter(Case.organization_id == organization_id, Case.case_number.ilike(term))
                .all()
            ]
            user_ids = [
                row[0]
                for row in self.db.query(User.id)
                .filter(User.organization_id == organization_id, User.name.ilike(term))
                .all()
            ]
            if case_ids:
                filters.append(AuditLog.case_id.in_(case_ids))
            if user_ids:
                filters.append(AuditLog.user_id.in_(user_ids))
            q = q.filter(or_(*filters))

        total = q.count()
        logs = q.order_by(AuditLog.created_at.desc()).offset(offset).limit(min(limit, 200)).all()

        case_ids_needed = {log.case_id for log in logs if log.case_id}
        client_ids_needed = {log.client_id for log in logs if log.client_id}
        user_ids_needed = {log.user_id for log in logs if log.user_id}

        cases_by_id = {}
        if case_ids_needed:
            cases = self.db.query(Case).filter(Case.id.in_(case_ids_needed)).all()
            cases_by_id = {c.id: c for c in cases}
            client_ids_needed |= {c.client_id for c in cases}

        clients_by_id = {}
        if client_ids_needed:
            clients = self.db.query(Client).filter(Client.id.in_(client_ids_needed)).all()
            clients_by_id = {c.id: c for c in clients}

        users_by_id = {}
        if user_ids_needed:
            users = self.db.query(User).filter(User.id.in_(user_ids_needed)).all()
            users_by_id = {u.id: u for u in users}

        items = []
        for log in logs:
            case = cases_by_id.get(log.case_id) if log.case_id else None
            client_id = log.client_id or (case.client_id if case else None)
            client = clients_by_id.get(client_id) if client_id else None
            user = users_by_id.get(log.user_id) if log.user_id else None
            items.append(
                {
                    "id": log.id,
                    "event_type": log.event_type,
                    "event_type_label": EVENT_TYPE_LABELS.get(log.event_type, log.event_type.replace("_", " ").title()),
                    "entity_type": log.entity_type,
                    "entity_id": log.entity_id,
                    "client_id": client_id,
                    "client_name": client.name if client else None,
                    "case_id": log.case_id,
                    "case_number": case.case_number if case else None,
                    "user_id": log.user_id,
                    "user_name": user.name if user else None,
                    "created_at": log.created_at,
                    "previous_value_json": log.previous_value_json,
                    "new_value_json": log.new_value_json,
                }
            )

        return {"items": items, "total": total, "limit": limit, "offset": offset}
