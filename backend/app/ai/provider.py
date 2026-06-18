import json
from typing import Any

import httpx
from openai import OpenAI

from app.core.config import settings


class AIProvider:
    """Abstraction for OpenAI / Azure OpenAI compatible APIs."""

    def __init__(self) -> None:
        kwargs: dict[str, Any] = {"api_key": settings.openai_api_key or "not-set"}
        if settings.openai_base_url:
            kwargs["base_url"] = settings.openai_base_url
        self.client = OpenAI(**kwargs) if settings.openai_api_key else None
        self.model = settings.openai_model

    def complete_json(self, system_prompt: str, user_prompt: str) -> tuple[dict[str, Any], str]:
        """Return parsed JSON and raw response text."""
        if not self.client:
            return self._mock_response(user_prompt), user_prompt

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
        return json.loads(raw), raw

    def _mock_response(self, user_prompt: str) -> dict[str, Any]:
        """Demo-friendly mock when no API key is configured."""
        if "monthly SOC value report" in user_prompt.lower():
            return {
                "executive_summary": (
                    "During this reporting period, the SOC monitored security events across your environment, "
                    "triaged alerts, and resolved cases within agreed SLA targets."
                ),
                "soc_activity_overview": "The team handled a mix of authentication, endpoint, and network alerts.",
                "notable_incidents_summary": "No confirmed major incidents requiring executive escalation.",
                "sla_performance_summary": "SLA compliance remained strong across triage and disposition targets.",
                "recurring_risk_themes": ["Suspicious authentication activity", "Endpoint policy violations"],
                "recommendations": [
                    "Enable MFA for privileged accounts",
                    "Review VPN access policies",
                ],
                "next_month_priorities": ["Reduce false positive noise from legacy scanners"],
            }
        return {
            "summary": (
                "Alert indicates potentially suspicious activity requiring analyst review. "
                "Evidence is limited to the initial detection data."
            ),
            "key_evidence": ["Source alert metadata", "Severity classification"],
            "recommended_disposition": "Needs More Information",
            "recommended_priority": "P3 Medium",
            "confidence_score": 65,
            "rationale": "Insufficient context to confirm malicious intent without further investigation.",
            "suggested_next_steps": [
                "Review authentication logs for the affected user",
                "Validate asset ownership and expected behavior",
            ],
            "mitre_tactics": ["Initial Access"],
            "mitre_techniques": ["T1078 - Valid Accounts"],
            "client_notification_draft": "",
            "closure_summary_draft": "",
            "limitations": ["Mock AI response - configure OPENAI_API_KEY for live recommendations"],
        }
