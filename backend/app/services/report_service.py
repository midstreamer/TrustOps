import uuid
from collections import Counter
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.ai.prompts import MONTHLY_REPORT_SYSTEM_PROMPT, MONTHLY_REPORT_USER_TEMPLATE, PROMPT_VERSION
from app.ai.provider import AIProvider
from app.models import AnalystDecision, Case, QAReview, Report, SLAEvent, User
from app.services.sla_service import SLAService


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
                "overview": parsed.get("soc_activity_overview"),
            },
            sla_summary_json={**sla_metrics, "summary": parsed.get("sla_performance_summary")},
            notable_incidents_json={
                "items": notable,
                "summary": parsed.get("notable_incidents_summary"),
            },
            recurring_themes_json={"items": parsed.get("recurring_risk_themes", [])},
            recommendations_json={
                "items": parsed.get("recommendations", []),
                "next_month_priorities": parsed.get("next_month_priorities", []),
            },
            status="Draft",
            generated_by_user_id=user.id,
        )
        self.db.add(report)
        return report

    def publish(self, report: Report) -> Report:
        report.status = "Published"
        report.published_at = datetime.now(timezone.utc)
        return report
