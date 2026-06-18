"""Report generation v2 — buyer-ready client value reports."""

import uuid
from collections import Counter
from datetime import date, datetime, timezone

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

    def generate_draft(
        self,
        client_id: uuid.UUID,
        start_date: date,
        end_date: date,
        user: User,
        client_name: str,
    ) -> Report:
        cases = (
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

        user_prompt = MONTHLY_REPORT_USER_TEMPLATE.format(
            client_name=client_name,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            total_cases=len(cases),
            cases_by_severity=cases_by_severity,
            cases_by_disposition=cases_by_disposition,
            notable_incidents=notable[:5],
            sla_performance=sla_metrics,
            top_alert_categories={},
            top_affected_assets={},
            recurring_themes=[],
            recommendations=[],
        )
        parsed, _ = self.provider.complete_json(MONTHLY_REPORT_SYSTEM_PROMPT, user_prompt)

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

        human_ai_summary = (
            f"Analysts reviewed {len(decisions)} AI-assisted triage recommendations during this period. "
            f"AI recommendations were accepted {round(ai_accept / ai_total * 100)}% of the time. "
            f"Human-AI agreement rate was {round(human_ai_agreed / agreement_total * 100)}%. "
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

        service_activity = parsed.get("soc_activity_overview") or (
            f"The SOC handled {len(cases)} security cases during this reporting period."
        )

        report = Report(
            client_id=client_id,
            report_type="monthly",
            reporting_period_start=start_date,
            reporting_period_end=end_date,
            title=f"{client_name} Monthly SOC Report ({start_date} to {end_date})",
            executive_summary=parsed.get("executive_summary"),
            case_summary_json={
                "total": len(cases),
                "by_severity": cases_by_severity,
                "by_disposition": cases_by_disposition,
                "overview": service_activity,
                "service_activity": service_activity,
            },
            sla_summary_json={**sla_metrics, "summary": parsed.get("sla_performance_summary")},
            notable_incidents_json={
                "items": notable,
                "summary": parsed.get("notable_incidents_summary"),
                "notable_cases": notable,
            },
            recurring_themes_json={"items": parsed.get("recurring_risk_themes", [])},
            recommendations_json={
                "items": parsed.get("recommendations", []),
                "recommended_actions": parsed.get("recommendations", []),
                "next_month_priorities": parsed.get("next_month_priorities", []),
                "next_month_focus": parsed.get("next_month_priorities", []),
                "human_ai_triage_summary": human_ai_summary,
                "ai_triage_oversight": ai_oversight,
                "trust_metrics_summary": trust_summary,
                "soc_value_narrative": parsed.get("soc_activity_overview"),
                "value_delivered": parsed.get("soc_activity_overview"),
            },
            status="Draft",
            generated_by_user_id=user.id,
        )
        self.db.add(report)
        return report

    def publish(self, report: Report, user: User | None = None) -> Report:
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
