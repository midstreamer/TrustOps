import uuid
from collections import Counter
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models import AnalystDecision, Case, QAReview, SLAEvent, User


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def _base_cases(self, org_id: uuid.UUID, client_ids: list[uuid.UUID] | None = None):
        q = self.db.query(Case).filter(Case.organization_id == org_id)
        if client_ids is not None:
            q = q.filter(Case.client_id.in_(client_ids))
        return q

    def soc_manager_metrics(self, org_id: uuid.UUID) -> dict:
        cases = self._base_cases(org_id).all()
        open_statuses = {
            "New",
            "Triaged",
            "Investigating",
            "Pending Client",
            "Escalated",
            "Contained",
        }
        open_cases = [c for c in cases if c.status in open_statuses]
        decisions = (
            self.db.query(AnalystDecision)
            .join(Case)
            .filter(Case.organization_id == org_id)
            .all()
        )
        qa_reviews = (
            self.db.query(QAReview).join(Case).filter(Case.organization_id == org_id).all()
        )
        sla_events = (
            self.db.query(SLAEvent).join(Case).filter(Case.organization_id == org_id).all()
        )

        ai_accept = sum(1 for d in decisions if d.ai_action == "Accepted")
        ai_mod = sum(1 for d in decisions if d.ai_action == "Modified")
        ai_rej = sum(1 for d in decisions if d.ai_action == "Rejected")
        total_decisions = len(decisions) or 1

        triage_times = []
        disp_times = []
        for c in cases:
            if c.triaged_at and c.created_at:
                triage_times.append((c.triaged_at - c.created_at).total_seconds() / 60)
            if c.dispositioned_at and c.created_at:
                disp_times.append((c.dispositioned_at - c.created_at).total_seconds() / 60)

        qa_scores = [r.overall_score for r in qa_reviews if r.overall_score]

        workload = (
            self.db.query(User.name, func.count(Case.id))
            .join(Case, Case.assigned_to_user_id == User.id)
            .filter(Case.organization_id == org_id, Case.status.in_(open_statuses))
            .group_by(User.name)
            .all()
        )

        return {
            "total_open_cases": len(open_cases),
            "cases_by_priority": dict(Counter(c.priority or "Unset" for c in cases)),
            "cases_by_status": dict(Counter(c.status for c in cases)),
            "sla_at_risk": sum(1 for e in sla_events if e.status == "At Risk"),
            "sla_breached": sum(1 for e in sla_events if e.breached),
            "avg_time_to_triage_minutes": round(sum(triage_times) / len(triage_times), 1)
            if triage_times
            else 0,
            "avg_time_to_disposition_minutes": round(sum(disp_times) / len(disp_times), 1)
            if disp_times
            else 0,
            "ai_acceptance_rate": round(ai_accept / total_decisions * 100, 1),
            "ai_override_rate": round((ai_mod + ai_rej) / total_decisions * 100, 1),
            "qa_average_score": round(sum(qa_scores) / len(qa_scores), 1) if qa_scores else 0,
            "analyst_workload": {name: count for name, count in workload},
        }

    def analyst_metrics(self, org_id: uuid.UUID, user_id: uuid.UUID) -> dict:
        cases = (
            self._base_cases(org_id)
            .filter(Case.assigned_to_user_id == user_id)
            .options(joinedload(Case.sla_events))
            .all()
        )
        open_cases = [c for c in cases if c.status not in ("Closed", "Resolved", "False Positive")]
        return {
            "assigned_open_cases": len(open_cases),
            "cases_by_status": dict(Counter(c.status for c in cases)),
            "cases_by_priority": dict(Counter(c.priority or "Unset" for c in cases)),
        }

    def client_metrics(self, client_id: uuid.UUID, published_only: bool = False) -> dict:
        cases = self.db.query(Case).filter(Case.client_id == client_id).all()
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        closed_this_month = [
            c
            for c in cases
            if c.closed_at and c.closed_at >= month_start and c.status in ("Closed", "Resolved")
        ]
        open_cases = [c for c in cases if c.status not in ("Closed", "Resolved", "False Positive")]

        notable = [
            c for c in cases if c.severity in ("Critical", "High") and c.disposition
        ]

        from app.models import Report

        reports_q = self.db.query(Report).filter(Report.client_id == client_id)
        if published_only:
            reports_q = reports_q.filter(Report.status == "Published")
        reports = reports_q.order_by(Report.created_at.desc()).limit(5).all()

        sla_events = self.db.query(SLAEvent).join(Case).filter(Case.client_id == client_id).all()
        met = sum(1 for e in sla_events if e.status == "Met")
        total_sla = len(sla_events) or 1

        return {
            "open_cases": len(open_cases),
            "closed_cases_this_month": len(closed_this_month),
            "notable_incidents": [
                {"title": c.title, "severity": c.severity, "status": c.status} for c in notable[:5]
            ],
            "sla_performance": round(met / total_sla * 100, 1),
            "cases_by_severity": dict(Counter(c.severity for c in cases)),
            "cases_by_disposition": dict(Counter(c.disposition or "Unset" for c in cases)),
            "monthly_reports": [
                {
                    "id": str(r.id),
                    "title": r.title,
                    "status": r.status,
                    "period_start": r.reporting_period_start.isoformat(),
                    "period_end": r.reporting_period_end.isoformat(),
                }
                for r in reports
            ],
        }
