"""Trust Metrics dashboard assistant chat."""

import json
import uuid
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.ai.prompts import TRUST_METRICS_CHAT_SYSTEM_PROMPT
from app.ai.provider import AIProvider
from app.models import Client
from app.services.trust_metrics_service import TrustMetricsService


class TrustMetricsChatService:
    MAX_HISTORY = 10

    def __init__(self, db: Session):
        self.db = db
        self.provider = AIProvider()

    def _resolve_client_name(self, org_id: uuid.UUID, client_id: uuid.UUID | None) -> str | None:
        if not client_id:
            return None
        client = (
            self.db.query(Client)
            .filter(Client.id == client_id, Client.organization_id == org_id)
            .first()
        )
        return client.name if client else None

    def _build_context(
        self,
        org_id: uuid.UUID,
        *,
        client_id: uuid.UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict[str, Any]:
        metrics = TrustMetricsService(self.db).get_metrics(
            org_id,
            client_id=client_id,
            start_date=start_date,
            end_date=end_date,
        )
        trends = metrics.get("weekly_trends") or []

        return {
            "context_type": "trust_metrics",
            "scope": {
                "client_id": str(client_id) if client_id else None,
                "client_name": self._resolve_client_name(org_id, client_id),
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
                "label": (
                    self._resolve_client_name(org_id, client_id) or "All clients"
                ),
            },
            "trust_calibration_score": metrics.get("trust_calibration_score"),
            "trust_calibration_definition": metrics.get("trust_calibration_definition"),
            "trust_calibration_components": metrics.get("trust_calibration_components"),
            "decision_count": metrics.get("decision_count"),
            "ai_recommendation_count": metrics.get("ai_recommendation_count"),
            "ai_acceptance_rate": metrics.get("ai_acceptance_rate"),
            "ai_modification_rate": metrics.get("ai_modification_rate"),
            "ai_rejection_rate": metrics.get("ai_rejection_rate"),
            "human_ai_agreement_rate": metrics.get("human_ai_agreement_rate"),
            "override_count": metrics.get("override_count"),
            "average_ai_confidence": metrics.get("average_ai_confidence"),
            "average_analyst_confidence": metrics.get("average_analyst_confidence"),
            "ai_high_confidence_accepted": metrics.get("ai_high_confidence_accepted"),
            "ai_high_confidence_rejected": metrics.get("ai_high_confidence_rejected"),
            "ai_low_confidence_accepted": metrics.get("ai_low_confidence_accepted"),
            "analyst_low_confidence_escalations": metrics.get("analyst_low_confidence_escalations"),
            "qa_review_count": metrics.get("qa_review_count"),
            "decision_reversal_rate_after_qa": metrics.get("decision_reversal_rate_after_qa"),
            "qa_confirmed_override_accuracy": metrics.get("qa_confirmed_override_accuracy"),
            "ai_action_breakdown": metrics.get("ai_action_breakdown"),
            "override_reasons_by_category": metrics.get("override_reasons_by_category"),
            "overrides_by_analyst": metrics.get("overrides_by_analyst"),
            "overrides_by_disposition": metrics.get("overrides_by_disposition"),
            "human_ai_disagreement_rate_by_severity": metrics.get(
                "human_ai_disagreement_rate_by_severity"
            ),
            "weekly_trends_recent": trends[-6:],
        }

    def ask(
        self,
        org_id: uuid.UUID,
        message: str,
        *,
        history: list[dict[str, str]] | None = None,
        client_id: uuid.UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict[str, Any]:
        message = message.strip()
        if not message:
            raise ValueError("Message is required")

        context = self._build_context(
            org_id,
            client_id=client_id,
            start_date=start_date,
            end_date=end_date,
        )
        context_block = json.dumps(context, default=str, indent=2)
        system_prompt = (
            f"{TRUST_METRICS_CHAT_SYSTEM_PROMPT}\n\n"
            f"Trust metrics context (JSON):\n{context_block}"
        )

        trimmed_history = (history or [])[-self.MAX_HISTORY :]
        messages = [
            *[{"role": m["role"], "content": m["content"]} for m in trimmed_history if m.get("content")],
            {"role": "user", "content": message},
        ]

        reply = self.provider.complete_chat(system_prompt, messages, mock_context=context)
        return {
            "reply": reply,
            "source": "openai" if self.provider.is_live else "mock",
        }
