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

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content or "{}"
            parsed = json.loads(raw)
        except Exception:
            return self._mock_response(user_prompt), user_prompt

        if self._is_empty_report(parsed, user_prompt):
            mock = self._mock_response(user_prompt)
            for key, value in parsed.items():
                if isinstance(value, str) and value.strip():
                    mock[key] = value
                elif isinstance(value, list) and value:
                    mock[key] = value
            return mock, raw
        return parsed, raw

    @staticmethod
    def _is_empty_report(parsed: dict[str, Any], user_prompt: str) -> bool:
        if "monthly soc value report" not in user_prompt.lower():
            return False
        summary = (parsed.get("executive_summary") or "").strip()
        overview = (parsed.get("soc_activity_overview") or "").strip()
        return not summary and not overview

    def complete_chat(
        self,
        system_prompt: str,
        messages: list[dict[str, str]],
        *,
        mock_context: dict[str, Any] | None = None,
    ) -> str:
        """Multi-turn chat completion returning assistant text."""
        if not self.client:
            return self._mock_chat_response(messages, mock_context or {})

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": system_prompt}, *messages],
                temperature=0.4,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception:
            return self._mock_chat_response(messages, mock_context or {})

    def _mock_chat_response(self, messages: list[dict[str, str]], ctx: dict[str, Any]) -> str:
        question = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                question = (msg.get("content") or "").lower()
                break

        client = ctx.get("client_name", "your organization")
        open_cases = ctx.get("open_cases", 0)
        sla = ctx.get("sla_performance")
        notable = ctx.get("notable_incidents") or []
        funnel = ctx.get("workflow_funnel") or {}
        stages = {s.get("label", ""): s.get("total", 0) for s in funnel.get("stages", [])}

        if any(w in question for w in ("sla", "commitment", "performance")):
            return (
                f"Your SLA performance is **{sla}%** of commitments met over the last "
                f"**{ctx.get('period_days', 30)} days**.\n\n"
                "Your SOC team tracks:\n"
                "- Triage response times\n"
                "- Disposition targets\n"
                "- Client notification commitments"
            )
        if any(w in question for w in ("open", "active", "investigation")):
            return (
                f"You currently have **{open_cases} open case(s)** under active SOC management.\n\n"
                f"Notable activity:\n"
                f"- **{len(notable)}** high-severity incident(s) with analyst disposition on record\n"
                f"- **{ctx.get('closed_cases_this_month', 0)}** case(s) closed this month"
            )
        if any(w in question for w in ("funnel", "alert", "triage", "workflow")):
            stage_lines = [f"- **{label}:** {count}" for label, count in stages.items() if label]
            stages_text = "\n".join(stage_lines) if stage_lines else "- No funnel data for this period"
            return (
                f"Here is your SOC workflow funnel for the last **{ctx.get('period_days', 30)} days**:\n\n"
                f"{stages_text}\n\n"
                "This shows alerts ingested → triage → incidents investigated → confirmed outcomes."
            )
        if any(w in question for w in ("incident", "notable", "critical", "high")):
            if not notable:
                return (
                    "No notable high-severity incidents with disposition were recorded in the current period.\n\n"
                    "Your SOC continues to monitor and triage incoming alerts."
                )
            lines = [f"- **{n.get('title')}** ({n.get('severity')}, {n.get('status')})" for n in notable[:5]]
            return "Notable incidents in your environment:\n\n" + "\n".join(lines)
        if any(w in question for w in ("report", "monthly", "summary")):
            report = ctx.get("latest_report_summary")
            if report:
                return f"**Latest published report summary:**\n\n{report}"
            return (
                "Your SOC provider publishes monthly value reports in the **Reports** section.\n\n"
                "Use **Read Latest Report** on this dashboard to review executive summary and SLA highlights."
            )

        return (
            f"I can help you understand **{client}**'s security operations.\n\n"
            "Try asking about:\n"
            f"- SLA performance (currently **{sla}%**)\n"
            f"- Open cases (**{open_cases}** active)\n"
            "- Notable incidents\n"
            "- SOC workflow funnel stages"
        )

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
