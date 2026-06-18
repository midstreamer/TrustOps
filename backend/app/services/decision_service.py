import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.constants import AI_ACTIONS, DISPOSITIONS, PRIORITIES
from app.models import AIRecommendation, AnalystDecision, Case, User
from app.services.audit_service import AuditLogService
from app.services.case_service import CaseService
from app.services.sla_service import SLAService


class AnalystDecisionService:
    def __init__(self, db: Session):
        self.db = db
        self.case_service = CaseService(db)
        self.sla_service = SLAService(db)

    def validate_and_create(
        self,
        case: Case,
        user: User,
        *,
        selected_disposition: str,
        selected_priority: str,
        analyst_confidence: int,
        ai_action: str,
        ai_recommendation_id: uuid.UUID | None = None,
        override_reason: str | None = None,
        escalation_needed: bool = False,
        client_notification_needed: bool = False,
        decision_notes: str | None = None,
    ) -> AnalystDecision:
        if selected_disposition not in DISPOSITIONS:
            raise HTTPException(status_code=400, detail="Invalid disposition")
        if selected_priority not in PRIORITIES:
            raise HTTPException(status_code=400, detail="Invalid priority")
        if ai_action not in AI_ACTIONS:
            raise HTTPException(status_code=400, detail="Invalid AI action")
        if ai_action in ("Modified", "Rejected") and not override_reason:
            raise HTTPException(status_code=400, detail="Override reason required")

        ai_rec: AIRecommendation | None = None
        if ai_recommendation_id:
            ai_rec = self.db.query(AIRecommendation).filter_by(id=ai_recommendation_id).first()

        human_ai_agreement = None
        if ai_rec:
            human_ai_agreement = (
                ai_rec.recommended_disposition == selected_disposition
                and ai_rec.recommended_priority == selected_priority
            )

        now = datetime.now(timezone.utc)
        time_to_decision = None
        if case.created_at:
            created = case.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            time_to_decision = int((now - created).total_seconds())

        decision = AnalystDecision(
            case_id=case.id,
            analyst_user_id=user.id,
            ai_recommendation_id=ai_recommendation_id,
            selected_disposition=selected_disposition,
            selected_priority=selected_priority,
            analyst_confidence=analyst_confidence,
            ai_action=ai_action,
            override_reason=override_reason,
            escalation_needed=escalation_needed,
            client_notification_needed=client_notification_needed,
            decision_notes=decision_notes,
            time_to_decision_seconds=time_to_decision,
            human_ai_agreement=human_ai_agreement,
        )
        self.db.add(decision)

        case.disposition = selected_disposition
        case.priority = selected_priority
        if not case.triaged_at:
            case.triaged_at = now
            self.sla_service.complete_sla(case.id, "Triage")
        case.dispositioned_at = now
        self.sla_service.complete_sla(case.id, "Disposition")
        if client_notification_needed:
            case.notified_at = now
            self.sla_service.complete_sla(case.id, "Notification")
        if escalation_needed:
            case.status = "Escalated"
        elif case.status == "New":
            case.status = "Triaged"

        self.case_service.add_event(
            case.id, "Analyst Decision Submitted", f"Disposition: {selected_disposition}", user
        )
        AuditLogService.log(
            self.db,
            event_type="analyst_decision",
            user=user,
            case_id=case.id,
            entity_type="analyst_decision",
            new_value={
                "disposition": selected_disposition,
                "priority": selected_priority,
                "ai_action": ai_action,
                "human_ai_agreement": human_ai_agreement,
            },
        )
        return decision
