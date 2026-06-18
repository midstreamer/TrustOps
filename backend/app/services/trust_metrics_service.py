"""Trust metrics v2 — human-AI decision quality and calibration indicators."""

import uuid
from collections import Counter, defaultdict

from sqlalchemy.orm import Session

from app.models import AIRecommendation, AnalystDecision, Case, QAReview, User

HIGH_CONFIDENCE = 80
LOW_CONFIDENCE = 60

OVERRIDE_CATEGORIES = {
    "Incorrect AI Assessment": ("incorrect", "wrong", "misclass", "inaccurate"),
    "Insufficient Context": ("context", "missing", "incomplete", "unclear"),
    "Policy or Client Exception": ("policy", "exception", "client", "authorized"),
    "Escalation Required": ("escalat", "urgent", "incident", "critical"),
}


def _categorize_override(reason: str | None) -> str:
    if not reason:
        return "Other"
    lower = reason.lower()
    for category, keywords in OVERRIDE_CATEGORIES.items():
        if any(kw in lower for kw in keywords):
            return category
    return "Other"


class TrustMetricsService:
    def __init__(self, db: Session):
        self.db = db

    def get_metrics(self, organization_id: uuid.UUID) -> dict:
        decisions = (
            self.db.query(AnalystDecision)
            .join(Case)
            .filter(Case.organization_id == organization_id)
            .all()
        )
        ai_recs = (
            self.db.query(AIRecommendation)
            .join(Case)
            .filter(Case.organization_id == organization_id)
            .all()
        )
        ai_by_id = {r.id: r for r in ai_recs}
        case_by_id = {c.id: c for c in self.db.query(Case).filter(Case.organization_id == organization_id).all()}

        total = len(decisions)
        base = self._base_metrics(decisions, ai_recs, total)
        v2 = self._v2_metrics(decisions, ai_by_id, case_by_id, organization_id)
        calibration = self._calibration_score(decisions, ai_by_id, v2)

        return {**base, **v2, **calibration}

    def _base_metrics(self, decisions: list, ai_recs: list, total: int) -> dict:
        if total == 0:
            return {
                "ai_recommendation_count": len(ai_recs),
                "ai_acceptance_rate": 0,
                "ai_modification_rate": 0,
                "ai_rejection_rate": 0,
                "ai_not_used_rate": 0,
                "ai_escalated_rate": 0,
                "human_ai_agreement_rate": 0,
                "average_ai_confidence": 0,
                "average_analyst_confidence": 0,
                "override_count": 0,
                "overrides_by_analyst": {},
                "overrides_by_disposition": {},
                "ai_action_breakdown": {},
            }

        accept = sum(1 for d in decisions if d.ai_action == "Accepted")
        modified = sum(1 for d in decisions if d.ai_action == "Modified")
        rejected = sum(1 for d in decisions if d.ai_action == "Rejected")
        not_used = sum(1 for d in decisions if d.ai_action == "Not Used")
        escalated = sum(1 for d in decisions if d.ai_action == "Escalated")
        agreed = sum(1 for d in decisions if d.human_ai_agreement is True)
        agreement_known = sum(1 for d in decisions if d.human_ai_agreement is not None)
        overrides = [d for d in decisions if d.ai_action in ("Modified", "Rejected")]

        analyst_names: dict[str, int] = {}
        for d in overrides:
            user = self.db.query(User).filter(User.id == d.analyst_user_id).first()
            name = user.name if user else str(d.analyst_user_id)
            analyst_names[name] = analyst_names.get(name, 0) + 1

        ai_confidences = [r.confidence_score for r in ai_recs if r.confidence_score is not None]
        analyst_confidences = [d.analyst_confidence for d in decisions]

        return {
            "ai_recommendation_count": len(ai_recs),
            "ai_acceptance_rate": round(accept / total * 100, 1),
            "ai_modification_rate": round(modified / total * 100, 1),
            "ai_rejection_rate": round(rejected / total * 100, 1),
            "ai_not_used_rate": round(not_used / total * 100, 1),
            "ai_escalated_rate": round(escalated / total * 100, 1),
            "human_ai_agreement_rate": round(agreed / agreement_known * 100, 1)
            if agreement_known
            else 0,
            "average_ai_confidence": round(sum(ai_confidences) / len(ai_confidences), 1)
            if ai_confidences
            else 0,
            "average_analyst_confidence": round(sum(analyst_confidences) / len(analyst_confidences), 1),
            "override_count": len(overrides),
            "overrides_by_analyst": analyst_names,
            "overrides_by_disposition": dict(Counter(d.selected_disposition for d in overrides)),
            "ai_action_breakdown": dict(Counter(d.ai_action for d in decisions)),
        }

    def _v2_metrics(
        self,
        decisions: list,
        ai_by_id: dict,
        case_by_id: dict,
        organization_id: uuid.UUID,
    ) -> dict:
        high_conf_accepted = 0
        high_conf_rejected = 0
        low_conf_accepted = 0
        low_conf_escalations = 0
        disagreement_by_severity: dict[str, int] = defaultdict(int)
        disagreement_totals: dict[str, int] = defaultdict(int)
        override_categories: Counter = Counter()

        for d in decisions:
            ai_rec = ai_by_id.get(d.ai_recommendation_id) if d.ai_recommendation_id else None
            ai_conf = ai_rec.confidence_score if ai_rec else None
            case = case_by_id.get(d.case_id)
            severity = case.severity if case else "Unknown"

            if d.human_ai_agreement is not None:
                disagreement_totals[severity] += 1
                if d.human_ai_agreement is False:
                    disagreement_by_severity[severity] += 1

            if ai_conf is not None and ai_conf >= HIGH_CONFIDENCE:
                if d.ai_action == "Accepted":
                    high_conf_accepted += 1
                elif d.ai_action == "Rejected":
                    high_conf_rejected += 1
            if ai_conf is not None and ai_conf < LOW_CONFIDENCE and d.ai_action == "Accepted":
                low_conf_accepted += 1
            if d.analyst_confidence < LOW_CONFIDENCE and (
                d.ai_action == "Escalated" or d.escalation_needed
            ):
                low_conf_escalations += 1

            if d.ai_action in ("Modified", "Rejected"):
                override_categories[_categorize_override(d.override_reason)] += 1

        qa_reviews = (
            self.db.query(QAReview)
            .join(Case)
            .filter(Case.organization_id == organization_id)
            .all()
        )
        reversals = sum(1 for q in qa_reviews if q.disposition_correct is False)
        qa_total = len(qa_reviews) or 1

        override_decisions = [d for d in decisions if d.ai_action in ("Modified", "Rejected")]
        qa_by_case = {q.case_id: q for q in qa_reviews}
        qa_confirmed = sum(
            1
            for d in override_decisions
            if (q := qa_by_case.get(d.case_id)) and q.ai_usage_appropriate is True
        )
        qa_override_total = sum(
            1 for d in override_decisions if d.case_id in qa_by_case
        )

        disagreement_rates = {
            sev: round(disagreement_by_severity[sev] / disagreement_totals[sev] * 100, 1)
            for sev in disagreement_totals
            if disagreement_totals[sev] > 0
        }

        return {
            "ai_high_confidence_accepted": high_conf_accepted,
            "ai_high_confidence_rejected": high_conf_rejected,
            "ai_low_confidence_accepted": low_conf_accepted,
            "analyst_low_confidence_escalations": low_conf_escalations,
            "human_ai_disagreement_rate_by_severity": disagreement_rates,
            "override_reasons_by_category": dict(override_categories),
            "decision_reversal_rate_after_qa": round(reversals / qa_total * 100, 1),
            "qa_confirmed_override_accuracy": round(qa_confirmed / qa_override_total * 100, 1)
            if qa_override_total
            else 0,
            "qa_review_count": len(qa_reviews),
        }

    def _calibration_score(self, decisions: list, ai_by_id: dict, v2: dict) -> dict:
        """Operational calibration indicator — not a statistical certification."""
        if not decisions:
            return {
                "trust_calibration_score": 0,
                "trust_calibration_definition": self._calibration_definition(),
                "trust_calibration_components": {
                    "agreement_component": 0,
                    "high_confidence_alignment": 0,
                    "qa_validation_component": 0,
                },
            }

        agreement_known = [d for d in decisions if d.human_ai_agreement is not None]
        agreement_rate = (
            sum(1 for d in agreement_known if d.human_ai_agreement) / len(agreement_known) * 100
            if agreement_known
            else 0
        )

        high_conf_decisions = [
            d
            for d in decisions
            if d.ai_recommendation_id
            and (ai := ai_by_id.get(d.ai_recommendation_id))
            and ai.confidence_score is not None
            and ai.confidence_score >= HIGH_CONFIDENCE
        ]
        high_conf_alignment = (
            sum(1 for d in high_conf_decisions if d.ai_action == "Accepted")
            / len(high_conf_decisions)
            * 100
            if high_conf_decisions
            else agreement_rate
        )

        qa_validation = v2.get("qa_confirmed_override_accuracy", 0)

        score = round(
            0.5 * agreement_rate + 0.3 * high_conf_alignment + 0.2 * qa_validation,
            1,
        )

        return {
            "trust_calibration_score": min(100, max(0, score)),
            "trust_calibration_definition": self._calibration_definition(),
            "trust_calibration_components": {
                "agreement_component": round(agreement_rate, 1),
                "high_confidence_alignment": round(high_conf_alignment, 1),
                "qa_validation_component": round(qa_validation, 1),
            },
        }

    @staticmethod
    def _calibration_definition() -> str:
        return (
            "Trust Calibration Score is an operational indicator (0–100) measuring alignment "
            "between AI triage recommendations and analyst decisions. It combines human-AI "
            "agreement (50%), high-confidence AI acceptance alignment (30%), and QA-validated "
            "override appropriateness (20%). It is not a statistical certification of AI accuracy "
            "and should be interpreted alongside case volume, severity mix, and QA review trends."
        )
