"""SOC manager dashboard assistant chat."""

import json
import uuid
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.ai.prompts import MANAGER_SOC_CHAT_SYSTEM_PROMPT
from app.ai.provider import AIProvider
from app.models import Case
from app.services.dashboard_service import DashboardService
from app.services.sla_service import SLAService


class ManagerChatService:
    MAX_HISTORY = 10

    def __init__(self, db: Session):
        self.db = db
        self.provider = AIProvider()

    def _at_risk_cases(self, org_id: uuid.UUID, *, limit: int = 6) -> list[dict[str, Any]]:
        sla_svc = SLAService(self.db)
        cases = (
            self.db.query(Case)
            .filter(Case.organization_id == org_id)
            .options(joinedload(Case.client), joinedload(Case.assigned_to))
            .order_by(Case.updated_at.desc())
            .all()
        )
        at_risk: list[dict[str, Any]] = []
        for case in cases:
            if sla_svc.get_case_sla_summary(case.id) != "At Risk":
                continue
            at_risk.append(
                {
                    "case_number": case.case_number,
                    "title": case.title,
                    "client_name": case.client.name if case.client else None,
                    "assigned_to": case.assigned_to.name if case.assigned_to else None,
                    "priority": case.priority,
                    "status": case.status,
                    "severity": case.severity,
                }
            )
            if len(at_risk) >= limit:
                break
        return at_risk

    def _build_context(self, org_id: uuid.UUID) -> dict[str, Any]:
        metrics = DashboardService(self.db).soc_manager_metrics(org_id)
        return {
            "context_type": "soc_manager",
            **metrics,
            "at_risk_cases": self._at_risk_cases(org_id),
        }

    def ask(
        self,
        org_id: uuid.UUID,
        message: str,
        *,
        history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        message = message.strip()
        if not message:
            raise ValueError("Message is required")

        context = self._build_context(org_id)
        context_block = json.dumps(context, default=str, indent=2)
        system_prompt = (
            f"{MANAGER_SOC_CHAT_SYSTEM_PROMPT}\n\n"
            f"Operational context (JSON):\n{context_block}"
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
