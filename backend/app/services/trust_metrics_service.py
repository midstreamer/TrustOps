"""Trust metrics aggregation for human-AI decision quality."""

import uuid
from collections import Counter

from sqlalchemy.orm import Session, joinedload

from app.models import AIRecommendation, AnalystDecision, Case, User


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

        total = len(decisions)
        if total == 0:
            return {
                "ai_recommendation_count": len(ai_recs),
                "ai_acceptance_rate": 0,
                "ai_modification_rate": 0,
                "ai_rejection_rate": 0,
                "ai_not_used_rate": 0,
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

        analyst_names = {}
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
            "overrides_by_disposition": dict(
                Counter(d.selected_disposition for d in overrides)
            ),
            "ai_action_breakdown": dict(Counter(d.ai_action for d in decisions)),
        }
