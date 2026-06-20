import json
import logging
from typing import Any

import httpx
from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIProvider:
    """Abstraction for OpenAI / Azure OpenAI compatible APIs."""

    def __init__(self) -> None:
        kwargs: dict[str, Any] = {"api_key": settings.openai_api_key or "not-set"}
        if settings.openai_base_url:
            kwargs["base_url"] = settings.openai_base_url
        self.client = OpenAI(**kwargs) if settings.openai_api_key else None
        self.model = settings.openai_model

    @property
    def is_live(self) -> bool:
        return self.client is not None

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
            content = (response.choices[0].message.content or "").strip()
            if not content:
                raise ValueError("Empty response from AI provider")
            return content
        except Exception as exc:
            logger.exception("OpenAI chat completion failed")
            raise RuntimeError("AI assistant request failed") from exc

    def _mock_chat_response(self, messages: list[dict[str, str]], ctx: dict[str, Any]) -> str:
        question = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                question = (msg.get("content") or "").lower()
                break

        client = ctx.get("client_name", "your organization")
        open_cases = ctx.get("open_cases", ctx.get("total_open_cases", 0))
        sla = ctx.get("sla_performance")
        notable = ctx.get("notable_incidents") or []
        funnel = ctx.get("workflow_funnel") or {}
        stages = {s.get("label", ""): s.get("total", 0) for s in funnel.get("stages", [])}

        if ctx.get("context_type") == "soc_manager":
            return self._mock_manager_chat_response(question, ctx)
        if ctx.get("context_type") == "trust_metrics":
            return self._mock_trust_metrics_chat_response(question, ctx)

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

    def _mock_manager_chat_response(self, question: str, ctx: dict[str, Any]) -> str:
        open_cases = ctx.get("total_open_cases", 0)
        sla_at_risk = ctx.get("sla_at_risk", 0)
        sla_breached = ctx.get("sla_breached", 0)
        ai_accept = ctx.get("ai_acceptance_rate", 0)
        ai_override = ctx.get("ai_override_rate", 0)
        workload = ctx.get("analyst_workload") or {}
        needs_qa = ctx.get("needs_qa_cases", 0)
        low_quality = ctx.get("low_quality_cases", 0)
        at_risk = ctx.get("at_risk_cases") or []

        if any(w in question for w in ("sla", "at risk", "breach", "commitment")):
            return (
                f"SLA snapshot: **{sla_at_risk}** case(s) at risk and **{sla_breached}** breached.\n\n"
                f"Open queue: **{open_cases}** active cases.\n\n"
                "Recommended actions:\n"
                "- Review the SLA at risk queue first\n"
                "- Reassign or escalate cases approaching breach\n"
                "- Check analyst workload for bottlenecks"
            )
        if any(w in question for w in ("workload", "analyst", "assign", "capacity")):
            if not workload:
                return "No analyst workload data is available — no open assignments on record."
            lines = [f"- **{name}:** {count} open case(s)" for name, count in workload.items()]
            return (
                f"Analyst workload across **{len(workload)}** loaded analyst(s):\n\n"
                + "\n".join(lines)
                + "\n\nConsider rebalancing if one analyst is significantly above the team average."
            )
        if any(w in question for w in ("ai", "accept", "override", "trust")):
            return (
                f"AI decision quality: **{ai_accept}%** acceptance rate and **{ai_override}%** override rate.\n\n"
                "Use Trust Metrics for drilldown on override reasons and disagreement by severity."
            )
        if any(w in question for w in ("qa", "quality", "review")):
            return (
                f"QA indicators: **{needs_qa}** case(s) need QA review and **{low_quality}** below quality threshold.\n\n"
                "Filter the case queue by low quality or open QA reviews to prioritize coaching."
            )
        if any(w in question for w in ("priority", "queue", "open", "status")):
            by_priority = ctx.get("cases_by_priority") or {}
            by_status = ctx.get("cases_by_status") or {}
            pri_lines = [f"- **{k}:** {v}" for k, v in sorted(by_priority.items(), key=lambda x: -x[1])[:5]]
            status_lines = [f"- **{k}:** {v}" for k, v in sorted(by_status.items(), key=lambda x: -x[1])[:5]]
            return (
                f"You have **{open_cases}** open cases in the queue.\n\n"
                "By priority:\n"
                + ("\n".join(pri_lines) if pri_lines else "- No priority breakdown")
                + "\n\nTop statuses:\n"
                + ("\n".join(status_lines) if status_lines else "- No status breakdown")
            )
        if any(w in question for w in ("risk", "attention", "urgent")) and at_risk:
            lines = [
                f"- **{c.get('case_number')}** — {c.get('title')} ({c.get('priority', 'Unset')})"
                for c in at_risk[:5]
            ]
            return "Cases needing manager attention:\n\n" + "\n".join(lines)

        return (
            "I can help with SOC operations on this dashboard.\n\n"
            "Try asking about:\n"
            f"- Open queue health (**{open_cases}** active cases)\n"
            f"- SLA at risk (**{sla_at_risk}**) and breached (**{sla_breached}**)\n"
            f"- Analyst workload ({len(workload)} analysts loaded)\n"
            f"- AI acceptance (**{ai_accept}%**) and QA backlog (**{needs_qa}** cases)"
        )

    def _mock_trust_metrics_chat_response(self, question: str, ctx: dict[str, Any]) -> str:
        scope = ctx.get("scope") or {}
        scope_label = scope.get("label") or "All clients"
        score = ctx.get("trust_calibration_score", 0)
        decisions = ctx.get("decision_count", 0)
        acceptance = ctx.get("ai_acceptance_rate", 0)
        agreement = ctx.get("human_ai_agreement_rate", 0)
        override_count = ctx.get("override_count", 0)
        qa_reversal = ctx.get("decision_reversal_rate_after_qa", 0)
        high_conf_rejected = ctx.get("ai_high_confidence_rejected", 0)
        components = ctx.get("trust_calibration_components") or {}
        override_reasons = ctx.get("override_reasons_by_category") or {}
        disagreement = ctx.get("human_ai_disagreement_rate_by_severity") or {}
        trends = ctx.get("weekly_trends_recent") or []

        if any(w in question for w in ("calibration", "score", "trust")):
            comp_lines = [
                f"- **Human-AI agreement:** {components.get('agreement_component', 0)}% (50% weight)",
                f"- **High-confidence alignment:** {components.get('high_confidence_alignment', 0)}% (30% weight)",
                f"- **QA validation:** {components.get('qa_validation_component', 0)}% (20% weight)",
            ]
            return (
                f"Trust Calibration Score for **{scope_label}** is **{score}/100** "
                f"across **{decisions}** analyst decision(s).\n\n"
                "Component breakdown:\n"
                + "\n".join(comp_lines)
                + "\n\nThis is an operational indicator for pilot QBRs — not a statistical certification."
            )
        if any(w in question for w in ("accept", "alignment", "agree")):
            return (
                f"AI alignment for **{scope_label}**: **{acceptance}%** acceptance rate and "
                f"**{agreement}%** human-AI agreement across **{decisions}** decisions.\n\n"
                f"Overrides in scope: **{override_count}**.\n\n"
                "Review the AI Alignment and Breakdowns sections for action mix and override reasons."
            )
        if any(w in question for w in ("override", "reject", "modify")):
            reason_lines = [
                f"- **{name}:** {count}" for name, count in sorted(
                    override_reasons.items(), key=lambda x: -x[1]
                )[:5]
            ]
            reasons_text = "\n".join(reason_lines) if reason_lines else "- No categorized overrides in range"
            return (
                f"Override activity for **{scope_label}**: **{override_count}** total override(s).\n\n"
                "Top override reason categories:\n"
                f"{reasons_text}\n\n"
                "Use drill-downs on the Trust Metrics page for case-level detail."
            )
        if any(w in question for w in ("confidence", "high-conf", "high conf", "escalat")):
            return (
                f"Confidence signals for **{scope_label}**:\n\n"
                f"- **High-confidence AI rejected:** {high_conf_rejected}\n"
                f"- **High-confidence AI accepted:** {ctx.get('ai_high_confidence_accepted', 0)}\n"
                f"- **Low-confidence escalations:** {ctx.get('analyst_low_confidence_escalations', 0)}\n\n"
                "High-confidence rejections are a key risk signal — review those drill-down cases first."
            )
        if any(w in question for w in ("qa", "reversal", "review")):
            return (
                f"QA oversight for **{scope_label}**:\n\n"
                f"- **QA reviews:** {ctx.get('qa_review_count', 0)}\n"
                f"- **Reversal rate after QA:** {qa_reversal}%\n"
                f"- **Override accuracy (QA-confirmed):** {ctx.get('qa_confirmed_override_accuracy', 0)}%\n\n"
                "Elevated reversal rates may indicate coaching opportunities for analysts."
            )
        if any(w in question for w in ("trend", "week", "movement", "over time")):
            if not trends:
                return (
                    f"No weekly trend data is available for **{scope_label}** in the current filter range.\n\n"
                    "Expand the date range or ensure decisions exist to populate trend charts."
                )
            lines = [
                f"- **{t.get('week_label')}:** acceptance {t.get('acceptance_rate')}%, "
                f"calibration {t.get('trust_calibration_score')}"
                for t in trends[-4:]
            ]
            return (
                f"Recent weekly trends for **{scope_label}**:\n\n"
                + "\n".join(lines)
            )
        if any(w in question for w in ("disagree", "severity")):
            if not disagreement:
                return "No human-AI disagreement by severity data is available for the current filter scope."
            lines = [f"- **{sev}:** {rate}%" for sev, rate in disagreement.items()]
            return (
                f"Human-AI disagreement rates by severity for **{scope_label}**:\n\n"
                + "\n".join(lines)
            )
        if any(w in question for w in ("qbr", "executive", "summary", "report")):
            return (
                f"**Trust Metrics executive snapshot** for **{scope_label}**:\n\n"
                f"- Calibration score: **{score}/100**\n"
                f"- Decisions in range: **{decisions}**\n"
                f"- AI acceptance: **{acceptance}%** | Human-AI agreement: **{agreement}%**\n"
                f"- Overrides: **{override_count}** | QA reversal rate: **{qa_reversal}%**\n\n"
                "Use this page's breakdowns and weekly trends to support pilot QBR narrative."
            )

        return (
            f"I can help interpret Trust Metrics for **{scope_label}**.\n\n"
            "Try asking about:\n"
            f"- Trust calibration score (**{score}/100**)\n"
            f"- AI acceptance (**{acceptance}%**) and agreement (**{agreement}%**)\n"
            f"- Override patterns (**{override_count}** overrides)\n"
            f"- Confidence signals and QA oversight\n"
            "- Weekly trends and QBR talking points"
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
