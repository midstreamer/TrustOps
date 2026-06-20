"""External ticket export stubs for ServiceNow, Jira, and generic ITSM."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.auth.security import is_client_user, SOC_ROLES, get_user_roles
from app.models import AnalystDecision, Case, User
from app.services.audit_service import AuditLogService
from app.services.sla_service import SLAService


class ExternalTicketService:
    def __init__(self, db: Session):
        self.db = db

    def summary(self, case: Case, target: str) -> dict:
        if target not in ("servicenow", "jira", "generic"):
            raise HTTPException(status_code=400, detail="target must be servicenow, jira, or generic")

        latest_decision = (
            sorted(case.analyst_decisions, key=lambda d: d.created_at, reverse=True)[0]
            if case.analyst_decisions
            else None
        )
        latest_ai = (
            sorted(case.ai_recommendations, key=lambda r: r.created_at, reverse=True)[0]
            if case.ai_recommendations
            else None
        )
        sla_status = SLAService(self.db).get_case_sla_summary(case.id)

        lines = [
            f"TrustOps Case: {case.case_number}",
            f"Client: {case.client.name if case.client else 'N/A'}",
            f"Title: {case.title}",
            f"Severity: {case.severity} | Priority: {case.priority or 'Unset'} | Status: {case.status}",
            f"SLA Status: {sla_status}",
        ]
        if latest_ai:
            lines.append(f"AI Recommendation: {latest_ai.recommended_disposition} (confidence {latest_ai.confidence_score}%)")
            lines.append(f"AI Summary: {latest_ai.summary[:500]}")
        if latest_decision:
            lines.append(
                f"Analyst Decision: {latest_decision.selected_disposition} "
                f"({latest_decision.ai_action}, confidence {latest_decision.analyst_confidence}%)"
            )
            if latest_decision.decision_notes:
                lines.append(f"Decision Notes: {latest_decision.decision_notes}")
        if case.evidence:
            lines.append(f"Evidence items: {len(case.evidence)}")

        description = "\n".join(lines)
        short = f"{case.title} - {case.client.name if case.client else 'Client'}"

        base = {
            "target": target,
            "short_description": short[:160],
            "description": description,
            "priority": case.priority or "P3 Medium",
            "external_reference": case.case_number,
        }

        if target == "servicenow":
            base.update({
                "category": "Security Incident",
                "subcategory": "SOC Triage",
                "assignment_group": None,
            })
        elif target == "jira":
            base.update({
                "issue_type": "Task",
                "project_key": None,
                "labels": ["security", "soc", case.severity.lower()],
            })
        else:
            base.update({"category": "Security", "subcategory": "SOC Case"})

        return base

    def link_ticket(
        self,
        case: Case,
        user: User,
        *,
        external_ticket_system: str,
        external_ticket_id: str,
        external_ticket_url: str | None = None,
    ) -> Case:
        if is_client_user(user):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        if not any(r in SOC_ROLES for r in get_user_roles(user)):
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        case.external_ticket_system = external_ticket_system
        case.external_ticket_id = external_ticket_id
        case.external_ticket_url = external_ticket_url
        case.external_ticket_synced_at = datetime.now(timezone.utc)

        AuditLogService.log(
            self.db,
            event_type="external_ticket_linked",
            user=user,
            organization_id=case.organization_id,
            client_id=case.client_id,
            case_id=case.id,
            entity_type="case",
            entity_id=case.id,
            new_value={
                "system": external_ticket_system,
                "ticket_id": external_ticket_id,
                "url": external_ticket_url,
            },
        )
        return case
