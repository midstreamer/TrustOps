"""Admin setup services for MDR multi-client onboarding."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models import Case, Client, IntegrationEvent, IntegrationKey, Organization, Report, SLAPolicy, User, UserRole
from app.services.webhook_service import WebhookAlertService

DEFAULT_SLA_TEMPLATES = [
    {
        "severity": "Critical",
        "time_to_triage_minutes": 15,
        "time_to_disposition_minutes": 60,
        "time_to_notify_minutes": 30,
        "time_to_close_minutes": 480,
    },
    {
        "severity": "High",
        "time_to_triage_minutes": 30,
        "time_to_disposition_minutes": 120,
        "time_to_notify_minutes": 60,
        "time_to_close_minutes": 720,
    },
]

CLIENT_ROLES = {"Client Admin", "Client Viewer"}


class AdminService:
    def __init__(self, db: Session):
        self.db = db

    def get_overview(self, organization_id: uuid.UUID) -> dict:
        org = self.db.query(Organization).filter(Organization.id == organization_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        clients = self.db.query(Client).filter(Client.organization_id == organization_id).all()
        users = (
            self.db.query(User)
            .options(joinedload(User.roles).joinedload(UserRole.role))
            .filter(User.organization_id == organization_id)
            .all()
        )
        case_count = self.db.query(Case).filter(Case.organization_id == organization_id).count()
        sla_count = (
            self.db.query(SLAPolicy)
            .join(Client)
            .filter(Client.organization_id == organization_id)
            .count()
        )

        clients_without_sla = []
        clients_without_portal_user = []
        for client in clients:
            policy_count = (
                self.db.query(SLAPolicy).filter(SLAPolicy.client_id == client.id).count()
            )
            if policy_count == 0:
                clients_without_sla.append({"id": str(client.id), "name": client.name})

            portal_users = [
                u
                for u in users
                if u.client_id == client.id
                and any(ur.role.name in CLIENT_ROLES for ur in u.roles)
            ]
            if not portal_users:
                clients_without_portal_user.append({"id": str(client.id), "name": client.name})

        soc_users = [
            u
            for u in users
            if any(
                ur.role.name in ("SOC Analyst", "SOC Manager", "Platform Admin")
                for ur in u.roles
            )
        ]

        checklist = {
            "has_clients": len(clients) > 0,
            "all_clients_have_sla": len(clients_without_sla) == 0 and len(clients) > 0,
            "has_soc_users": len(soc_users) > 0,
            "all_clients_have_portal_users": len(clients_without_portal_user) == 0
            and len(clients) > 0,
            "has_cases": case_count > 0,
        }
        checklist["setup_complete"] = all(checklist.values())

        return {
            "organization_id": str(org.id),
            "organization_name": org.name,
            "deployment_mode": "multi-client-mdr",
            "client_count": len(clients),
            "user_count": len(users),
            "sla_policy_count": sla_count,
            "case_count": case_count,
            "clients_without_sla": clients_without_sla,
            "clients_without_portal_users": clients_without_portal_user,
            "checklist": checklist,
        }

    def apply_default_sla_policies(self, client_id: uuid.UUID, organization_id: uuid.UUID) -> list:
        client = (
            self.db.query(Client)
            .filter(Client.id == client_id, Client.organization_id == organization_id)
            .first()
        )
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        created = []
        for template in DEFAULT_SLA_TEMPLATES:
            exists = (
                self.db.query(SLAPolicy)
                .filter(
                    SLAPolicy.client_id == client_id,
                    SLAPolicy.severity == template["severity"],
                )
                .first()
            )
            if exists:
                continue
            policy = SLAPolicy(client_id=client_id, active=True, **template)
            self.db.add(policy)
            created.append(policy)
        self.db.flush()
        return created

    def create_demo_case(
        self,
        *,
        organization_id: uuid.UUID,
        client_id: uuid.UUID,
        actor: User,
        title: str | None = None,
    ) -> dict:
        client = (
            self.db.query(Client)
            .filter(Client.id == client_id, Client.organization_id == organization_id)
            .first()
        )
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        return WebhookAlertService(self.db).ingest(
            organization_id=organization_id,
            client_id=client_id,
            title=title or f"[Onboarding] Demo alert for {client.name}",
            severity="High",
            actor=actor,
            description="Sample case generated from Admin Setup for onboarding and analyst workflow testing.",
            source_system="Admin Setup",
            priority="P2 High",
            detected_at=datetime.now(timezone.utc),
            integration_source="admin_setup",
        )

    def get_summary(self, organization_id: uuid.UUID) -> dict:
        overview = self.get_overview(organization_id)
        key_count = (
            self.db.query(IntegrationKey)
            .filter(IntegrationKey.organization_id == organization_id)
            .count()
        )
        return {
            **overview,
            "deployment_mode": settings.deployment_mode,
            "app_version": settings.app_version,
            "integration_key_count": key_count,
        }

    def get_pilot_checklist(self, organization_id: uuid.UUID) -> dict:
        org = self.db.query(Organization).filter(Organization.id == organization_id).first()
        clients = self.db.query(Client).filter(Client.organization_id == organization_id).all()
        users = (
            self.db.query(User)
            .options(joinedload(User.roles).joinedload(UserRole.role))
            .filter(User.organization_id == organization_id)
            .all()
        )
        has_org = org is not None
        has_clients = len(clients) > 0
        analysts = [u for u in users if any(ur.role.name == "SOC Analyst" for ur in u.roles)]
        managers = [u for u in users if any(ur.role.name == "SOC Manager" for ur in u.roles)]
        sla_ok = all(
            self.db.query(SLAPolicy).filter(SLAPolicy.client_id == c.id).count() > 0 for c in clients
        ) if clients else False
        active_keys = (
            self.db.query(IntegrationKey)
            .filter(IntegrationKey.organization_id == organization_id, IntegrationKey.status == "Active")
            .count()
        )
        recent_success = (
            self.db.query(IntegrationEvent)
            .filter(
                IntegrationEvent.organization_id == organization_id,
                IntegrationEvent.status == "success",
            )
            .count()
        )
        golden = self.db.query(Case).filter(Case.organization_id == organization_id, Case.case_number == "CASE-GOLDEN").first()
        published = (
            self.db.query(Report)
            .filter(Report.status == "Published")
            .join(Client)
            .filter(Client.organization_id == organization_id)
            .count()
        )
        client_users = [
            u for u in users if u.client_id and any(ur.role.name in CLIENT_ROLES for ur in u.roles)
        ]

        def item(key: str, label: str, done: bool) -> dict:
            if done:
                status = "Complete"
            elif key in ("integration_health", "client_user_tested"):
                status = "Needs attention"
            else:
                status = "Not started" if not done else "Complete"
            return {"key": key, "label": label, "status": status, "complete": done}

        items = [
            item("organization_created", "Organization created", has_org),
            item("client_configured", "At least one client configured", has_clients),
            item("analyst_configured", "At least one SOC analyst configured", len(analysts) > 0),
            item("manager_configured", "At least one SOC manager configured", len(managers) > 0),
            item("sla_configured", "SLA policy configured", sla_ok),
            item("integration_key_created", "Sentinel or webhook integration key created", active_keys > 0),
            item("integration_health", "Integration health verified", recent_success > 0),
            item("pilot_case", "CASE-GOLDEN or pilot case available", golden is not None or self.db.query(Case).filter(Case.organization_id == organization_id).count() > 0),
            item("report_published", "Client report published", published > 0),
            item("client_user_tested", "Client user configured", len(client_users) > 0),
            item("known_limitations", "Known limitations reviewed", False),
        ]
        complete_count = sum(1 for i in items if i["complete"])
        return {
            "items": items,
            "complete_count": complete_count,
            "total_count": len(items),
            "ready_for_pilot": complete_count >= 8,
        }

    def demo_reset(self, organization_id: uuid.UUID, actor: User) -> dict:
        if settings.deployment_mode != "local-demo":
            raise HTTPException(
                status_code=403,
                detail="Demo reset is only available in local-demo deployment mode",
            )
        cases_deleted = (
            self.db.query(Case)
            .filter(Case.organization_id == organization_id)
            .delete(synchronize_session=False)
        )
        self.db.query(IntegrationEvent).filter(IntegrationEvent.organization_id == organization_id).delete(
            synchronize_session=False
        )
        self.db.flush()

        apex = (
            self.db.query(Client)
            .filter(Client.organization_id == organization_id, Client.name.ilike("%Apex%"))
            .first()
        )
        demo_case = None
        if apex:
            demo_case = self.create_demo_case(
                organization_id=organization_id,
                client_id=apex.id,
                actor=actor,
                title="[PILOT] Suspicious OAuth consent grant",
            )

        return {
            "status": "reset",
            "cases_deleted": cases_deleted,
            "demo_case_created": demo_case is not None,
            "message": "Demo data reset. Re-run seed.py for full CASE-GOLDEN and report restoration.",
        }
