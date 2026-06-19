"""Report AI generation and fallback tests."""

from datetime import date, datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.security import hash_password
from app.db.base import Base
from app.models import Case, Client, Organization, Report, Role, User, UserRole
from app.services.report_service import ReportService

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def manager_and_client(db):
    org = Organization(name="Report Gen Org")
    db.add(org)
    db.flush()
    client = Client(organization_id=org.id, name="Apex Energy")
    db.add(client)
    db.flush()
    role = Role(name="SOC Manager")
    db.add(role)
    db.flush()
    manager = User(
        organization_id=org.id,
        name="Manager",
        email="mgr-gen@test.demo",
        password_hash=hash_password("TrustOps123!"),
    )
    db.add(manager)
    db.flush()
    db.add(UserRole(user_id=manager.id, role_id=role.id))
    db.add(
        Case(
            organization_id=org.id,
            client_id=client.id,
            case_number="CASE-R1",
            title="Suspicious login",
            severity="High",
            status="Investigating",
            created_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    return manager, client


def test_generate_draft_populates_executive_summary(db, manager_and_client, monkeypatch):
    manager, client = manager_and_client

    def empty_ai(_system, _user):
        return {
            "executive_summary": "",
            "soc_activity_overview": "",
            "notable_incidents_summary": "",
            "sla_performance_summary": "",
            "recurring_risk_themes": [],
            "recommendations": [],
            "next_month_priorities": [],
        }, "{}"

    monkeypatch.setattr(
        "app.services.report_service.AIProvider.complete_json",
        lambda self, s, u: empty_ai(s, u),
    )

    report = ReportService(db).generate_draft(
        client.id,
        date(2026, 6, 1),
        date(2026, 6, 18),
        manager,
        client.name,
    )
    assert report.executive_summary
    assert report.case_summary_json["service_activity"]
    assert report.recommendations_json["value_delivered"]
    assert report.recommendations_json["recommended_actions"]


def test_pick_latest_published_prefers_content(db, manager_and_client):
    manager, client = manager_and_client
    empty = Report(
        client_id=client.id,
        report_type="monthly",
        reporting_period_start=date(2026, 6, 1),
        reporting_period_end=date(2026, 6, 18),
        title="Empty",
        status="Published",
        generated_by_user_id=manager.id,
        published_at=datetime(2026, 6, 18, tzinfo=timezone.utc),
    )
    full = Report(
        client_id=client.id,
        report_type="monthly",
        reporting_period_start=date(2026, 5, 1),
        reporting_period_end=date(2026, 5, 31),
        title="Full",
        executive_summary="Complete executive summary.",
        status="Published",
        generated_by_user_id=manager.id,
        published_at=datetime(2026, 5, 31, tzinfo=timezone.utc),
    )
    db.add_all([empty, full])
    db.commit()
    picked = ReportService.pick_latest_published([empty, full])
    assert picked.id == full.id
