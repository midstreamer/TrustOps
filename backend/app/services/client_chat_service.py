"""Client-facing SOC assistant chat."""

import json
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.ai.prompts import CLIENT_SOC_CHAT_SYSTEM_PROMPT
from app.ai.provider import AIProvider
from app.models import Client, Report, User
from app.services.dashboard_service import DashboardService
from app.services.report_service import ReportService


class ClientChatService:
    MAX_HISTORY = 10

    def __init__(self, db: Session):
        self.db = db
        self.provider = AIProvider()

    def _build_context(self, client_id: uuid.UUID, *, period_days: int = 30) -> dict[str, Any]:
        client = self.db.query(Client).filter(Client.id == client_id).first()
        metrics = DashboardService(self.db).client_metrics(
            client_id,
            published_only=True,
            days=period_days,
        )
        latest_report = ReportService.pick_latest_published(
            self.db.query(Report)
            .filter(Report.client_id == client_id, Report.status == "Published")
            .all()
        )
        report_summary = None
        if latest_report and latest_report.executive_summary:
            report_summary = latest_report.executive_summary[:500]

        return {
            "client_name": client.name if client else "Client",
            "period_days": period_days,
            "open_cases": metrics.get("open_cases", 0),
            "closed_cases_this_month": metrics.get("closed_cases_this_month", 0),
            "sla_performance": metrics.get("sla_performance", 0),
            "notable_incidents": metrics.get("notable_incidents", []),
            "cases_by_severity": metrics.get("cases_by_severity", {}),
            "cases_by_disposition": metrics.get("cases_by_disposition", {}),
            "workflow_funnel": metrics.get("workflow_funnel"),
            "published_reports": metrics.get("monthly_reports", []),
            "latest_report_summary": report_summary,
        }

    def ask(
        self,
        client_id: uuid.UUID,
        message: str,
        *,
        history: list[dict[str, str]] | None = None,
        period_days: int = 30,
    ) -> dict[str, Any]:
        message = message.strip()
        if not message:
            raise ValueError("Message is required")

        context = self._build_context(client_id, period_days=period_days)
        context_block = json.dumps(context, default=str, indent=2)
        system_prompt = (
            f"{CLIENT_SOC_CHAT_SYSTEM_PROMPT}\n\n"
            f"Operational context (JSON, last {period_days} days):\n{context_block}"
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
            "client_id": str(client_id),
            "period_days": period_days,
        }
