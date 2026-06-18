import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import Case, SLAPolicy, SLAEvent


class SLAService:
    def __init__(self, db: Session):
        self.db = db

    def find_policy(self, client_id: uuid.UUID, priority: str | None, severity: str) -> SLAPolicy | None:
        policies = (
            self.db.query(SLAPolicy)
            .filter(SLAPolicy.client_id == client_id, SLAPolicy.active.is_(True))
            .all()
        )
        for policy in policies:
            if policy.priority and priority and policy.priority == priority:
                return policy
            if policy.severity and policy.severity == severity:
                return policy
        return policies[0] if policies else None

    def create_sla_events_for_case(self, case: Case) -> list[SLAEvent]:
        policy = self.find_policy(case.client_id, case.priority, case.severity)
        now = datetime.now(timezone.utc)
        base = case.detected_at or case.created_at or now
        events: list[SLAEvent] = []

        sla_defs = [
            ("Triage", policy.time_to_triage_minutes if policy else 30),
            ("Disposition", policy.time_to_disposition_minutes if policy else 240),
            ("Notification", policy.time_to_notify_minutes if policy else 60),
            ("Closure", policy.time_to_close_minutes if policy else 1440),
        ]
        for sla_type, minutes in sla_defs:
            if not minutes:
                continue
            due = base + timedelta(minutes=minutes)
            event = SLAEvent(
                case_id=case.id,
                sla_policy_id=policy.id if policy else None,
                sla_type=sla_type,
                target_minutes=minutes,
                due_at=due,
                status="In Progress",
            )
            self.db.add(event)
            events.append(event)
        return events

    def _ensure_aware(self, dt: datetime) -> datetime:
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    def refresh_sla_status(self, event: SLAEvent) -> SLAEvent:
        now = datetime.now(timezone.utc)
        if event.status in ("Met", "Exception Granted"):
            return event
        due_at = self._ensure_aware(event.due_at)
        if event.completed_at:
            completed = self._ensure_aware(event.completed_at)
            event.breached = completed > due_at
            event.status = "Met" if not event.breached else "Breached"
            return event
        remaining = (due_at - now).total_seconds() / 60
        if remaining <= 0:
            event.status = "Breached"
            event.breached = True
        elif remaining <= event.target_minutes * 0.25:
            event.status = "At Risk"
        else:
            event.status = "In Progress"
        return event

    def complete_sla(self, case_id: uuid.UUID, sla_type: str) -> None:
        now = datetime.now(timezone.utc)
        events = (
            self.db.query(SLAEvent)
            .filter(SLAEvent.case_id == case_id, SLAEvent.sla_type == sla_type)
            .all()
        )
        for event in events:
            if not event.completed_at:
                event.completed_at = now
                self.refresh_sla_status(event)

    def get_case_sla_summary(self, case_id: uuid.UUID) -> str:
        events = self.db.query(SLAEvent).filter(SLAEvent.case_id == case_id).all()
        for e in events:
            self.refresh_sla_status(e)
        if any(e.status == "Breached" for e in events):
            return "Breached"
        if any(e.status == "At Risk" for e in events):
            return "At Risk"
        if all(e.status == "Met" for e in events if e.completed_at):
            return "Met"
        return "On Track"

    def get_metrics(self, case_ids: list[uuid.UUID]) -> dict:
        events = self.db.query(SLAEvent).filter(SLAEvent.case_id.in_(case_ids)).all()
        total = len(events)
        met = sum(1 for e in events if e.status == "Met")
        breached = sum(1 for e in events if e.breached)
        return {
            "total_events": total,
            "met_count": met,
            "breached_count": breached,
            "compliance_percentage": round((met / total) * 100, 1) if total else 100.0,
        }
