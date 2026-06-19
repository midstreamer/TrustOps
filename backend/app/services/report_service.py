"""Report generation v2 — buyer-ready client value reports."""

import uuid
from collections import Counter
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.ai.prompts import MONTHLY_REPORT_SYSTEM_PROMPT, MONTHLY_REPORT_USER_TEMPLATE
from app.ai.provider import AIProvider
from app.models import AnalystDecision, Case, Report, User
from app.services.sla_service import SLAService
from app.services.trust_metrics_service import TrustMetricsService


class ReportService:
    def __init__(self, db: Session):
        self.db = db
        self.provider = AIProvider()
        self.sla_service = SLAService(db)

    def _cases_for_period(
        self,
        client_id: uuid.UUID,
        start_date: date,
        end_date: date,
    ) -> list[Case]:
        return (
            self.db.query(Case)
            .filter(
                Case.client_id == client_id,
                Case.created_at >= datetime.combine(start_date, datetime.min.time()).replace(
                    tzinfo=timezone.utc
                ),
                Case.created_at <= datetime.combine(end_date, datetime.max.time()).replace(
                    tzinfo=timezone.utc
                ),
            )
            .all()
        )

    def _build_context(
        self,
        client_id: uuid.UUID,
        start_date: date,
        end_date: date,
        user: User,
        client_name: str,
    ) -> dict[str, Any]:
        cases = self._cases_for_period(client_id, start_date, end_date)
        case_ids = [c.id for c in cases]
        sla_metrics = self.sla_service.get_metrics(case_ids)

        cases_by_severity = dict(Counter(c.severity for c in cases))
        cases_by_disposition = dict(Counter(c.disposition or "Unset" for c in cases))
        notable = [
            {"title": c.title, "severity": c.severity, "disposition": c.disposition}
            for c in cases
            if c.severity in ("Critical", "High")
            and c.disposition in ("True Positive - Incident", "True Positive - Suspicious")
        ]

        decisions = (
            self.db.query(AnalystDecision)
            .join(Case)
            .filter(Case.client_id == client_id)
            .all()
        )
        ai_accept = sum(1 for d in decisions if d.ai_action == "Accepted")
        ai_total = len(decisions) or 1
        human_ai_agreed = sum(1 for d in decisions if d.human_ai_agreement is True)
        agreement_total = sum(1 for d in decisions if d.human_ai_agreement is not None) or 1

        org_id = cases[0].organization_id if cases else user.organization_id
        trust = TrustMetricsService(self.db).get_metrics(org_id) if org_id else {}

        severity_parts = [
            f"{count} {severity}" for severity, count in sorted(cases_by_severity.items())
        ]
        disposition_parts = [
            f"{count} {disp}" for disp, count in sorted(cases_by_disposition.items())
        ]

        return {
            "client_id": client_id,
            "client_name": client_name,
            "start_date": start_date,
            "end_date": end_date,
            "user": user,
            "cases": cases,
            "cases_by_severity": cases_by_severity,
            "cases_by_disposition": cases_by_disposition,
            "notable": notable,
            "sla_metrics": sla_metrics,
            "decisions": decisions,
            "ai_accept": ai_accept,
            "ai_total": ai_total,
            "human_ai_agreed": human_ai_agreed,
            "agreement_total": agreement_total,
            "trust": trust,
            "severity_parts": severity_parts,
            "disposition_parts": disposition_parts,
        }

    def _ai_narrative(self, ctx: dict[str, Any]) -> dict[str, Any]:
        user_prompt = MONTHLY_REPORT_USER_TEMPLATE.format(
            client_name=ctx["client_name"],
            start_date=ctx["start_date"].isoformat(),
            end_date=ctx["end_date"].isoformat(),
            total_cases=len(ctx["cases"]),
            cases_by_severity=ctx["cases_by_severity"],
            cases_by_disposition=ctx["cases_by_disposition"],
            notable_incidents=ctx["notable"][:5],
            sla_performance=ctx["sla_metrics"],
            top_alert_categories={},
            top_affected_assets={},
            recurring_themes=[],
            recommendations=[],
        )
        parsed, _ = self.provider.complete_json(MONTHLY_REPORT_SYSTEM_PROMPT, user_prompt)
        return self._normalize_ai_sections(parsed, ctx)

    @staticmethod
    def _text(value: Any) -> str:
        return str(value).strip() if value is not None else ""

    def _normalize_ai_sections(self, parsed: dict[str, Any], ctx: dict[str, Any]) -> dict[str, Any]:
        """Ensure every client-facing section has content even if the model returns blanks."""
        client_name = ctx["client_name"]
        start = ctx["start_date"]
        end = ctx["end_date"]
        total = len(ctx["cases"])
        sla = ctx["sla_metrics"]
        compliance = sla.get("compliance_percentage")
        severity_line = ", ".join(ctx["severity_parts"]) if ctx["severity_parts"] else "no severity breakdown"
        disposition_line = (
            ", ".join(ctx["disposition_parts"]) if ctx["disposition_parts"] else "no disposition breakdown"
        )

        default_activity = (
            f"The SOC handled {total} security cases for {client_name} during "
            f"{start.isoformat()} to {end.isoformat()}. "
            f"Severity mix: {severity_line}. Disposition mix: {disposition_line}."
        )

        default_exec = (
            f"During the reporting period, the SOC monitored {client_name}'s environment, "
            f"triaged {total} security cases, and maintained analyst oversight on all dispositions. "
            + (
                f"SLA compliance was {compliance}% across tracked commitments."
                if compliance is not None
                else "SLA performance was tracked across triage and disposition commitments."
            )
        )

        default_notable = (
            "No confirmed high-severity incidents requiring executive escalation were recorded this period."
            if not ctx["notable"]
            else f"{len(ctx['notable'])} high-severity incident(s) were investigated and dispositioned by the SOC."
        )

        default_sla = (
            f"SLA compliance was {compliance}% across {sla.get('total_events', 0)} tracked events "
            f"({sla.get('met_count', 0)} met, {sla.get('breached_count', 0)} breached)."
            if compliance is not None
            else "SLA targets were monitored for triage, disposition, and notification commitments."
        )

        default_themes = (
            ["Authentication and identity-related alerts", "Endpoint and policy-related detections"]
            if total > 0
            else []
        )

        default_recs = [
            "Review privileged access and MFA coverage for high-risk accounts",
            "Continue tuning alert sources to reduce investigation noise",
        ]

        default_priorities = [
            "Close out open dispositions and improve triage completeness",
            "Review SLA bottlenecks and at-risk cases with the service delivery team",
        ]

        default_value = (
            f"TrustOps provided continuous SOC monitoring, structured case management, and measurable "
            f"SLA governance for {client_name} during this period."
        )

        return {
            "executive_summary": self._text(parsed.get("executive_summary")) or default_exec,
            "soc_activity_overview": self._text(parsed.get("soc_activity_overview")) or default_activity,
            "notable_incidents_summary": self._text(parsed.get("notable_incidents_summary")) or default_notable,
            "sla_performance_summary": self._text(parsed.get("sla_performance_summary")) or default_sla,
            "recurring_risk_themes": [
                t for t in (parsed.get("recurring_risk_themes") or []) if self._text(t)
            ] or default_themes,
            "recommendations": [
                r for r in (parsed.get("recommendations") or []) if self._text(r)
            ] or default_recs,
            "next_month_priorities": [
                p for p in (parsed.get("next_month_priorities") or []) if self._text(p)
            ] or default_priorities,
        }

    def _trust_and_oversight(self, ctx: dict[str, Any]) -> dict[str, Any]:
        trust = ctx["trust"]
        human_ai_summary = (
            f"Analysts reviewed {len(ctx['decisions'])} AI-assisted triage recommendations during this period. "
            f"AI recommendations were accepted {round(ctx['ai_accept'] / ctx['ai_total'] * 100)}% of the time. "
            f"Human-AI agreement rate was {round(ctx['human_ai_agreed'] / ctx['agreement_total'] * 100)}%. "
            "All disposition decisions were made by qualified SOC analysts."
        )
        ai_oversight = (
            f"AI-assisted triage supported analyst workflows with a Trust Calibration Score of "
            f"{trust.get('trust_calibration_score', 'N/A')}. "
            f"{trust.get('ai_high_confidence_accepted', 0)} high-confidence AI recommendations were accepted; "
            f"{trust.get('override_count', 0)} analyst overrides were recorded and reviewed through QA processes."
        )
        trust_summary = {
            "trust_calibration_score": trust.get("trust_calibration_score"),
            "human_ai_agreement_rate": trust.get("human_ai_agreement_rate"),
            "ai_acceptance_rate": trust.get("ai_acceptance_rate"),
            "override_count": trust.get("override_count"),
            "definition": trust.get("trust_calibration_definition", ""),
        }
        return {
            "human_ai_summary": human_ai_summary,
            "ai_oversight": ai_oversight,
            "trust_summary": trust_summary,
        }

    def _apply_sections_to_report(self, report: Report, ctx: dict[str, Any], sections: dict[str, Any]) -> None:
        oversight = self._trust_and_oversight(ctx)
        service_activity = sections["soc_activity_overview"]

        report.executive_summary = sections["executive_summary"]
        report.case_summary_json = {
            "total": len(ctx["cases"]),
            "by_severity": ctx["cases_by_severity"],
            "by_disposition": ctx["cases_by_disposition"],
            "overview": service_activity,
            "service_activity": service_activity,
        }
        report.sla_summary_json = {
            **ctx["sla_metrics"],
            "summary": sections["sla_performance_summary"],
        }
        report.notable_incidents_json = {
            "items": ctx["notable"],
            "summary": sections["notable_incidents_summary"],
            "notable_cases": ctx["notable"],
        }
        report.recurring_themes_json = {"items": sections["recurring_risk_themes"]}
        report.recommendations_json = {
            "items": sections["recommendations"],
            "recommended_actions": sections["recommendations"],
            "next_month_priorities": sections["next_month_priorities"],
            "next_month_focus": sections["next_month_priorities"],
            "human_ai_triage_summary": oversight["human_ai_summary"],
            "ai_triage_oversight": oversight["ai_oversight"],
            "trust_metrics_summary": oversight["trust_summary"],
            "soc_value_narrative": service_activity,
            "value_delivered": sections.get("value_delivered") or (
                f"{service_activity} The service delivered measurable monitoring, triage, and SLA governance."
            ),
        }

    def generate_draft(
        self,
        client_id: uuid.UUID,
        start_date: date,
        end_date: date,
        user: User,
        client_name: str,
    ) -> Report:
        ctx = self._build_context(client_id, start_date, end_date, user, client_name)
        sections = self._ai_narrative(ctx)

        report = Report(
            client_id=client_id,
            report_type="monthly",
            reporting_period_start=start_date,
            reporting_period_end=end_date,
            title=f"{client_name} Monthly SOC Report ({start_date} to {end_date})",
            status="Draft",
            generated_by_user_id=user.id,
        )
        self._apply_sections_to_report(report, ctx, sections)
        self.db.add(report)
        return report

    def regenerate_content(self, report: Report, user: User, client_name: str) -> Report:
        """Re-run AI narrative generation for an existing report period."""
        ctx = self._build_context(
            report.client_id,
            report.reporting_period_start,
            report.reporting_period_end,
            user,
            client_name,
        )
        sections = self._ai_narrative(ctx)
        self._apply_sections_to_report(report, ctx, sections)
        return report

    def publish(self, report: Report, user: User | None = None) -> Report:
        if not self._text(report.executive_summary):
            raise ValueError("Cannot publish a report without an executive summary.")
        report.status = "Published"
        report.published_at = datetime.now(timezone.utc)
        if user:
            from app.services.audit_service import AuditLogService

            AuditLogService.log(
                self.db,
                event_type="report_published",
                user=user,
                client_id=report.client_id,
                entity_type="report",
                entity_id=report.id,
                new_value={"title": report.title, "period": str(report.reporting_period_start)},
            )
        return report

    @staticmethod
    def client_safe_sections(report: Report) -> dict:
        """Return only client-visible report sections (no internal QA or AI prompts)."""
        recs = report.recommendations_json or {}
        return {
            "executive_summary": report.executive_summary,
            "service_activity": (report.case_summary_json or {}).get("service_activity"),
            "notable_cases": (report.notable_incidents_json or {}).get("notable_cases", []),
            "sla_performance": report.sla_summary_json,
            "ai_triage_oversight": recs.get("ai_triage_oversight"),
            "trust_metrics_summary": recs.get("trust_metrics_summary"),
            "recurring_risk_themes": (report.recurring_themes_json or {}).get("items", []),
            "recommended_actions": recs.get("recommended_actions", recs.get("items", [])),
            "value_delivered": recs.get("value_delivered"),
            "next_month_focus": recs.get("next_month_focus", recs.get("next_month_priorities", [])),
        }

    @staticmethod
    def pick_latest_published(reports: list[Report]) -> Report | None:
        """Prefer the newest published report that has AI-generated narrative content."""
        published = [r for r in reports if r.status == "Published"]
        if not published:
            return None
        published.sort(
            key=lambda r: (
                r.published_at or r.created_at or datetime.min.replace(tzinfo=timezone.utc)
            ),
            reverse=True,
        )
        for report in published:
            if ReportService._text(report.executive_summary):
                return report
        return published[0]
