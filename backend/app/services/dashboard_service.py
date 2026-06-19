import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models import Alert, AnalystDecision, Case, QAReview, SLAEvent, User


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _ensure_aware(dt: datetime) -> datetime:
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    @classmethod
    def _case_in_period(cls, case: Case, start: datetime, end: datetime) -> bool:
        ts = case.detected_at or case.created_at
        if not ts:
            return False
        ts = cls._ensure_aware(ts)
        return start <= ts <= end

    @classmethod
    def _alert_in_period(cls, alert: Alert, start: datetime, end: datetime) -> bool:
        ts = alert.detected_at or alert.created_at
        if not ts:
            return False
        ts = cls._ensure_aware(ts)
        return start <= ts <= end

    @staticmethod
    def _triage_bucket(disposition: str | None) -> str:
        if not disposition:
            return "In Progress"
        if disposition in ("True Positive - Benign", "Authorized Activity"):
            return "Benign Positive"
        if disposition in ("False Positive", "Duplicate"):
            return "False Positive"
        if disposition in ("True Positive - Suspicious", "True Positive - Incident"):
            return "True Positive"
        return "Under Review"

    @staticmethod
    def _is_incident_case(case: Case) -> bool:
        if case.disposition in ("True Positive - Suspicious", "True Positive - Incident"):
            return True
        if case.severity in ("Critical", "High") and case.disposition not in (
            "False Positive",
            "Duplicate",
            None,
        ):
            return case.status in ("Escalated", "Contained", "Investigating", "Resolved", "Closed")
        return False

    @staticmethod
    def _is_confirmed_incident(case: Case) -> bool:
        return case.disposition in ("True Positive - Suspicious", "True Positive - Incident") and case.status in (
            "Resolved",
            "Closed",
            "Contained",
        )

    @staticmethod
    def _severity_bucket(severity: str) -> str:
        if severity in ("Critical", "High"):
            return "High"
        if severity == "Medium":
            return "Medium"
        if severity == "Low":
            return "Low"
        return "Informational"

    def _funnel_stage_data(
        self,
        period_alerts: list[Alert],
        period_cases: list[Case],
    ) -> list[dict]:
        alerts_by_source = Counter(a.source_system or "Other" for a in period_alerts)
        triaged_cases = [
            c for c in period_cases if c.triaged_at or c.disposition or c.status not in ("New",)
        ]
        triage_buckets = Counter(self._triage_bucket(c.disposition) for c in triaged_cases)
        incident_cases = [c for c in period_cases if self._is_incident_case(c)]
        incidents_by_severity = Counter(self._severity_bucket(c.severity) for c in incident_cases)
        confirmed_cases = [c for c in period_cases if self._is_confirmed_incident(c)]
        confirmed_by_severity = Counter(self._severity_bucket(c.severity) for c in confirmed_cases)

        def breakdown(counter: Counter, limit: int = 6) -> list[dict]:
            return [
                {"label": label, "count": count}
                for label, count in counter.most_common(limit)
            ]

        return [
            {
                "id": "alerts_received",
                "label": "Alerts Received",
                "total": len(period_alerts),
                "color": "#3b82f6",
                "breakdown": breakdown(alerts_by_source),
            },
            {
                "id": "alerts_triaged",
                "label": "Alerts Triaged",
                "total": len(triaged_cases),
                "color": "#8b5cf6",
                "breakdown": breakdown(triage_buckets),
            },
            {
                "id": "incidents",
                "label": "Incidents",
                "total": len(incident_cases),
                "color": "#14b8a6",
                "breakdown": breakdown(incidents_by_severity),
            },
            {
                "id": "confirmed_incidents",
                "label": "Confirmed Incidents",
                "total": len(confirmed_cases),
                "color": "#f97316",
                "breakdown": breakdown(confirmed_by_severity),
            },
        ]

    @staticmethod
    def _trend_pct(current: int, prior: int) -> float:
        if prior > 0:
            return round((current - prior) / prior * 100, 2)
        if current > 0:
            return 100.0
        return 0.0

    def client_workflow_funnel(
        self,
        client_id: uuid.UUID,
        *,
        start: datetime,
        end: datetime,
    ) -> dict:
        alerts = self.db.query(Alert).filter(Alert.client_id == client_id).all()
        cases = self.db.query(Case).filter(Case.client_id == client_id).all()
        period_alerts = [a for a in alerts if self._alert_in_period(a, start, end)]
        period_cases = [c for c in cases if self._case_in_period(c, start, end)]
        stages = self._funnel_stage_data(period_alerts, period_cases)

        duration = end - start
        prior_start = start - duration
        prior_alerts = [a for a in alerts if self._alert_in_period(a, prior_start, start)]
        prior_cases = [c for c in cases if self._case_in_period(c, prior_start, start)]
        prior_stages = {s["id"]: s["total"] for s in self._funnel_stage_data(prior_alerts, prior_cases)}

        for stage in stages:
            prior_total = prior_stages.get(stage["id"], 0)
            stage["prior_total"] = prior_total
            stage["trend_pct"] = self._trend_pct(stage["total"], prior_total)

        return {
            "period_start": start.date().isoformat(),
            "period_end": end.date().isoformat(),
            "stages": stages,
        }

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

    def client_metrics(
        self,
        client_id: uuid.UUID,
        published_only: bool = False,
        days: int = 30,
    ) -> dict:
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=days)
        cases = self.db.query(Case).filter(Case.client_id == client_id).all()
        period_cases = [c for c in cases if self._case_in_period(c, start, end)]
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        closed_this_month = [
            c
            for c in cases
            if c.closed_at
            and self._ensure_aware(c.closed_at) >= month_start
            and c.status in ("Closed", "Resolved")
        ]
        open_cases = [c for c in cases if c.status not in ("Closed", "Resolved", "False Positive")]

        notable = [
            c for c in period_cases if c.severity in ("Critical", "High") and c.disposition
        ]

        from app.models import Report
        from app.services.report_service import ReportService

        reports_q = self.db.query(Report).filter(Report.client_id == client_id)
        if published_only:
            reports_q = reports_q.filter(Report.status == "Published")
        reports = reports_q.order_by(Report.created_at.desc()).limit(5).all()
        latest_published = ReportService.pick_latest_published(
            self.db.query(Report).filter(Report.client_id == client_id, Report.status == "Published").all()
        )

        period_case_ids = [c.id for c in period_cases]
        sla_events = (
            self.db.query(SLAEvent)
            .filter(SLAEvent.case_id.in_(period_case_ids))
            .all()
            if period_case_ids
            else []
        )
        met = sum(1 for e in sla_events if e.status == "Met")
        total_sla = len(sla_events) or 1

        funnel = self.client_workflow_funnel(client_id, start=start, end=end)

        return {
            "open_cases": len(open_cases),
            "closed_cases_this_month": len(closed_this_month),
            "notable_incidents": [
                {"title": c.title, "severity": c.severity, "status": c.status} for c in notable[:5]
            ],
            "sla_performance": round(met / total_sla * 100, 1),
            "cases_by_severity": dict(Counter(c.severity for c in period_cases)),
            "cases_by_disposition": dict(Counter(c.disposition or "Unset" for c in period_cases)),
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
            "latest_published_report_id": str(latest_published.id) if latest_published else None,
            "workflow_funnel": funnel,
            "period_days": days,
        }
