import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.ai.prompts import PROMPT_VERSION, SOC_TRIAGE_SYSTEM_PROMPT, SOC_TRIAGE_USER_TEMPLATE
from app.ai.provider import AIProvider
from app.core.constants import DISPOSITIONS, PRIORITIES
from app.models import AIRecommendation, Case, User
from app.services.case_service import CaseService
from app.services.sla_service import SLAService


class AIRecommendationService:
    def __init__(self, db: Session):
        self.db = db
        self.provider = AIProvider()
        self.case_service = CaseService(db)
        self.sla_service = SLAService(db)

    def generate(self, case_id: uuid.UUID, user: User) -> AIRecommendation:
        case = self.case_service.get_case_with_details(case_id)
        if not case:
            raise ValueError("Case not found")

        alert = case.alerts[0] if case.alerts else None
        evidence_text = "; ".join(
            f"{e.title}: {e.content or ''}" for e in case.evidence[:10]
        ) or "None"
        sla_context = self.sla_service.get_case_sla_summary(case.id)

        user_prompt = SOC_TRIAGE_USER_TEMPLATE.format(
            client_name=case.client.name if case.client else "",
            case_title=case.title,
            source_system=case.source_system or (alert.source_system if alert else ""),
            severity=case.severity,
            description=case.description or (alert.description if alert else ""),
            asset_name=alert.asset_name if alert else "",
            username=alert.username if alert else "",
            source_ip=alert.source_ip if alert else "",
            destination_ip=alert.destination_ip if alert else "",
            raw_event=(alert.raw_event or "")[:2000] if alert else "",
            evidence=evidence_text,
            sla_context=sla_context,
        )

        parsed, raw_text = self.provider.complete_json(SOC_TRIAGE_SYSTEM_PROMPT, user_prompt)

        rec_disposition = parsed.get("recommended_disposition")
        if rec_disposition not in DISPOSITIONS:
            rec_disposition = "Needs More Information"
        rec_priority = parsed.get("recommended_priority")
        if rec_priority not in PRIORITIES:
            rec_priority = "P3 Medium"

        recommendation = AIRecommendation(
            case_id=case.id,
            model_name=self.provider.model,
            model_provider="openai" if self.provider.client else "mock",
            prompt_version=PROMPT_VERSION,
            summary=parsed.get("summary", ""),
            key_evidence_json={"items": parsed.get("key_evidence", [])},
            recommended_disposition=rec_disposition,
            recommended_priority=rec_priority,
            confidence_score=int(parsed.get("confidence_score", 0)),
            rationale=parsed.get("rationale"),
            suggested_next_steps_json={"items": parsed.get("suggested_next_steps", [])},
            mitre_tactics_json={"items": parsed.get("mitre_tactics", [])},
            mitre_techniques_json={"items": parsed.get("mitre_techniques", [])},
            client_notification_draft=parsed.get("client_notification_draft"),
            closure_summary_draft=parsed.get("closure_summary_draft"),
            limitations_json={"items": parsed.get("limitations", [])},
            raw_prompt=user_prompt,
            raw_response={"text": raw_text, "parsed": parsed},
        )
        self.db.add(recommendation)
        self.case_service.add_event(
            case.id, "AI Recommendation Generated", "AI triage recommendation created", user
        )
        return recommendation

    def get_for_case(self, case_id: uuid.UUID) -> list[AIRecommendation]:
        return (
            self.db.query(AIRecommendation)
            .filter(AIRecommendation.case_id == case_id)
            .order_by(AIRecommendation.created_at.desc())
            .all()
        )
