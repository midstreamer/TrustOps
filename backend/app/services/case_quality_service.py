"""
Case quality scoring for SOC manager case quality management.

Transparent MVP formula (0–100):
- Evidence completeness: 20 pts — at least one evidence item
- Analyst decision present: 20 pts — at least one analyst decision
- SLA compliance: 20 pts — no breached SLA events (At Risk = 10, Breached = 0)
- Closure/summary completeness: 15 pts — closed case with decision notes or description
- QA review score contribution: 15 pts — scaled from latest QA overall_score (0–100 → 0–15)
- Client communication handling: 10 pts — notification need met or not required
"""

import uuid

from sqlalchemy.orm import Session

from app.models import AnalystDecision, Case, QAReview
from app.services.sla_service import SLAService

LOW_ANALYST_CONFIDENCE = 60
GRADE_THRESHOLDS = [
    (90, "Excellent"),
    (75, "Good"),
    (60, "Needs Attention"),
    (0, "Poor"),
]


class CaseQualityService:
    def __init__(self, db: Session):
        self.db = db
        self.sla_service = SLAService(db)

    def score_case(self, case: Case) -> dict:
        evidence_count = len(case.evidence) if case.evidence is not None else 0
        decisions = sorted(case.analyst_decisions or [], key=lambda d: d.created_at, reverse=True)
        latest_decision = decisions[0] if decisions else None
        qa_reviews = sorted(case.qa_reviews or [], key=lambda q: q.created_at, reverse=True)
        latest_qa = qa_reviews[0] if qa_reviews else None

        sla_status = self.sla_service.get_case_sla_summary(case.id)
        sla_events = case.sla_events or []
        breached = any(e.breached for e in sla_events)

        evidence_pts = 20 if evidence_count >= 1 else 0
        decision_pts = 20 if latest_decision else 0

        if breached or sla_status == "Breached":
            sla_pts = 0
        elif sla_status == "At Risk":
            sla_pts = 10
        else:
            sla_pts = 20

        closure_pts = 0
        if case.status in ("Resolved", "Closed"):
            if latest_decision and (latest_decision.decision_notes or case.description):
                closure_pts = 15
            elif case.description:
                closure_pts = 8

        qa_pts = 0
        if latest_qa and latest_qa.overall_score is not None:
            qa_pts = round(latest_qa.overall_score * 15 / 100)
        elif latest_qa:
            scores = [
                s
                for s in (
                    latest_qa.evidence_quality_score,
                    latest_qa.documentation_quality_score,
                    latest_qa.client_communication_score,
                )
                if s is not None
            ]
            if scores:
                qa_pts = round(sum(scores) / len(scores) * 15 / 100)

        comm_pts = 10
        if latest_decision and latest_decision.client_notification_needed:
            comm_pts = 10 if case.notified_at else 0

        breakdown = {
            "evidence_completeness": evidence_pts,
            "analyst_decision_present": decision_pts,
            "sla_compliance": sla_pts,
            "closure_completeness": closure_pts,
            "qa_score_contribution": qa_pts,
            "client_communication": comm_pts,
        }
        total = sum(breakdown.values())
        grade = self._grade(total)
        flags = self._flags(case, latest_decision, evidence_count, sla_status, breached, total)

        return {
            "case_id": case.id,
            "case_number": case.case_number,
            "quality_score": total,
            "quality_grade": grade,
            "flags": flags,
            "score_breakdown": breakdown,
        }

    def score_cases(self, cases: list[Case]) -> dict[uuid.UUID, dict]:
        return {case.id: self.score_case(case) for case in cases}

    @staticmethod
    def _grade(score: int) -> str:
        for threshold, label in GRADE_THRESHOLDS:
            if score >= threshold:
                return label
        return "Poor"

    @staticmethod
    def _flags(
        case: Case,
        latest_decision: AnalystDecision | None,
        evidence_count: int,
        sla_status: str | None,
        breached: bool,
        total_score: int,
    ) -> list[str]:
        flags: list[str] = []
        if evidence_count == 0:
            flags.append("Missing evidence")
        if not latest_decision:
            flags.append("No analyst decision")
        elif latest_decision.ai_action in ("Modified", "Rejected") and not latest_decision.override_reason:
            flags.append("Override reason missing")
        if breached or sla_status == "Breached":
            flags.append("SLA breached")
        if case.status in ("Resolved", "Closed") and not (latest_decision and latest_decision.decision_notes):
            flags.append("No closure summary")
        if latest_decision and latest_decision.client_notification_needed and not case.notified_at:
            flags.append("Client notification needed but not completed")
        if latest_decision and latest_decision.human_ai_agreement is False:
            flags.append("Human-AI disagreement")
        if latest_decision and latest_decision.analyst_confidence < LOW_ANALYST_CONFIDENCE:
            flags.append("Low analyst confidence")
        if total_score < 75 or "Human-AI disagreement" in flags:
            flags.append("QA review recommended")
        return flags
