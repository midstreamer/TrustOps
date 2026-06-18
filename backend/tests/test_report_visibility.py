"""Report visibility and client-safe content tests."""

import uuid
from datetime import date, datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Client, Organization, Report, Role, User, UserRole
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
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def report_fixture(db):
    org = Organization(name="Report Test Org")
    db.add(org)
    db.flush()
    apex = Client(organization_id=org.id, name="Apex Energy")
    db.add(apex)
    db.flush()

    manager_role = Role(name="SOC Manager")
    client_role = Role(name="Client Admin")
    db.add_all([manager_role, client_role])
    db.flush()

    manager = User(
        organization_id=org.id,
        name="Manager",
        email="mgr@test.demo",
        password_hash=hash_password("TrustOps123!"),
    )
    client_user = User(
        organization_id=org.id,
        client_id=apex.id,
        name="Client",
        email="client@test.demo",
        password_hash=hash_password("TrustOps123!"),
    )
    db.add_all([manager, client_user])
    db.flush()
    db.add(UserRole(user_id=manager.id, role_id=manager_role.id))
    db.add(UserRole(user_id=client_user.id, role_id=client_role.id))

    published = Report(
        client_id=apex.id,
        report_type="monthly",
        reporting_period_start=date(2026, 1, 1),
        reporting_period_end=date(2026, 1, 31),
        title="Apex Published Report",
        executive_summary="Executive summary for client.",
        case_summary_json={"total": 5, "service_activity": "SOC handled 5 cases."},
        sla_summary_json={"compliance_percentage": 95},
        notable_incidents_json={"notable_cases": [{"title": "OAuth grant", "severity": "High"}]},
        recurring_themes_json={"items": ["Authentication anomalies"]},
        recommendations_json={
            "recommended_actions": ["Enable MFA"],
            "ai_triage_oversight": "AI supported triage with analyst oversight.",
            "trust_metrics_summary": {"trust_calibration_score": 82},
            "value_delivered": "Continuous monitoring delivered.",
            "next_month_focus": ["Review OAuth permissions"],
            "internal_qa_notes": "SHOULD NOT BE VISIBLE",
            "raw_ai_prompt": "SHOULD NOT BE VISIBLE",
        },
        status="Published",
        generated_by_user_id=manager.id,
        published_at=datetime.now(timezone.utc),
    )
    draft = Report(
        client_id=apex.id,
        report_type="monthly",
        reporting_period_start=date(2026, 2, 1),
        reporting_period_end=date(2026, 2, 28),
        title="Apex Draft Report",
        executive_summary="Draft only.",
        status="Draft",
        generated_by_user_id=manager.id,
    )
    db.add_all([published, draft])
    db.commit()
    return {
        "apex": apex,
        "manager": manager,
        "client_user": client_user,
        "published": published,
        "draft": draft,
    }


def _login(client, email):
    r = client.post("/auth/login", json={"email": email, "password": "TrustOps123!"})
    return r.json()["access_token"]


def test_client_sees_published_report_only(client, report_fixture):
    token = _login(client, report_fixture["client_user"].email)
    r = client.get("/reports", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    reports = r.json()
    assert len(reports) == 1
    assert reports[0]["status"] == "Published"


def test_client_cannot_view_draft_report(client, report_fixture):
    token = _login(client, report_fixture["client_user"].email)
    r = client.get(
        f"/reports/{report_fixture['draft'].id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


def test_client_safe_sections_exclude_internal_fields(report_fixture, db):
    safe = ReportService(db).client_safe_sections(report_fixture["published"])
    assert "internal_qa_notes" not in safe
    assert "raw_ai_prompt" not in safe
    assert safe["executive_summary"] == "Executive summary for client."
    assert safe["trust_metrics_summary"]["trust_calibration_score"] == 82


def test_manager_can_view_draft_report(client, report_fixture):
    token = _login(client, report_fixture["manager"].email)
    r = client.get(
        f"/reports/{report_fixture['draft'].id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
