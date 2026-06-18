import uuid
from collections import Counter

from sqlalchemy.orm import Session

from app.models import QAReview, User


class QAService:
    def __init__(self, db: Session):
        self.db = db

    def create_review(
        self,
        case_id: uuid.UUID,
        reviewer: User,
        **fields,
    ) -> QAReview:
        scores = [
            fields.get("evidence_quality_score"),
            fields.get("documentation_quality_score"),
            fields.get("client_communication_score"),
        ]
        numeric = [s for s in scores if s is not None]
        overall = fields.get("overall_score")
        if overall is None and numeric:
            overall = round(sum(numeric) / len(numeric))

        review = QAReview(
            case_id=case_id,
            reviewer_user_id=reviewer.id,
            disposition_correct=fields.get("disposition_correct"),
            priority_correct=fields.get("priority_correct"),
            evidence_quality_score=fields.get("evidence_quality_score"),
            documentation_quality_score=fields.get("documentation_quality_score"),
            client_communication_score=fields.get("client_communication_score"),
            ai_usage_appropriate=fields.get("ai_usage_appropriate"),
            overall_score=overall,
            review_notes=fields.get("review_notes"),
        )
        self.db.add(review)
        return review

    def update_review(self, review: QAReview, **fields) -> QAReview:
        for key, value in fields.items():
            if value is not None and hasattr(review, key):
                setattr(review, key, value)
        return review

    def get_metrics(self, reviews: list[QAReview]) -> dict:
        if not reviews:
            return {"qa_review_count": 0, "average_qa_score": 0}
        scores = [r.overall_score for r in reviews if r.overall_score is not None]
        return {
            "qa_review_count": len(reviews),
            "average_qa_score": round(sum(scores) / len(scores), 1) if scores else 0,
            "disposition_correctness_rate": round(
                sum(1 for r in reviews if r.disposition_correct) / len(reviews) * 100, 1
            ),
            "priority_correctness_rate": round(
                sum(1 for r in reviews if r.priority_correct) / len(reviews) * 100, 1
            ),
        }
