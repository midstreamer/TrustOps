"""Tenant isolation and security boundary tests."""

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
from app.models import (
    AIRecommendation,
    AuditLog,
    Case,
    CaseNote,
    Client,
    Organization,
    QAReview,
    Report,
    Role,
    User,
    UserRole,
)

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
def tenants(db):
    org = Organization(name="Test SOC")
    db.add(org)
    db.flush()

    apex = Client(organization_id=org.id, name="Apex Energy")
    river = Client(organization_id=org.id, name="Riverbend Health")
    db.add_all([apex, river])
    db.flush()

    roles = {}
    for name in ["SOC Analyst", "SOC Manager", "Client Admin"]:
        r = Role(name=name)
        db.add(r)
        db.flush()
        roles[name] = r

    def make_user(email, role_name, client=None):
        u = User(
            organization_id=org.id,
            client_id=client.id if client else None,
            name=email.split("@")[0],
            email=email,
            password_hash=hash_password("testpass"),
        )
        db.add(u)
        db.flush()
        db.add(UserRole(user_id=u.id, role_id=roles[role_name].id))
        return u

    analyst = make_user("analyst@test.example.com", "SOC Analyst")
    manager = make_user("manager@test.example.com", "SOC Manager")
    apex_client = make_user("client@apex.example.com", "Client Admin", apex)

    apex_case = Case(
        case_number="CASE-APEX-001",
        organization_id=org.id,
        client_id=apex.id,
        title="Apex case",
        severity="High",
        status="New",
        assigned_to_user_id=analyst.id,
    )
    river_case = Case(
        case_number="CASE-RIV-001",
        organization_id=org.id,
        client_id=river.id,
        title="Riverbend case",
        severity="Medium",
        status="New",
    )
    db.add_all([apex_case, river_case])
    db.flush()

    db.add(
        CaseNote(
            case_id=apex_case.id,
            created_by_user_id=analyst.id,
            note_text="Internal only",
            visibility="Internal",
        )
    )
    ai_rec = AIRecommendation(
        case_id=apex_case.id,
        model_name="test",
        model_provider="mock",
        prompt_version="1.0",
        summary="AI summary",
        raw_prompt="SECRET PROMPT",
        raw_response={"secret": True},
    )
    db.add(ai_rec)
    db.flush()

    db.add(
        QAReview(
            case_id=apex_case.id,
            reviewer_user_id=manager.id,
            overall_score=90,
            review_notes="Internal QA",
        )
    )

    draft = Report(
        client_id=apex.id,
        report_type="monthly",
        reporting_period_start=date(2026, 1, 1),
        reporting_period_end=date(2026, 1, 31),
        title="Draft Report",
        status="Draft",
        generated_by_user_id=manager.id,
    )
    published = Report(
        client_id=apex.id,
        report_type="monthly",
        reporting_period_start=date(2026, 2, 1),
        reporting_period_end=date(2026, 2, 28),
        title="Published Report",
        status="Published",
        generated_by_user_id=manager.id,
        published_at=datetime.now(timezone.utc),
    )
    db.add_all([draft, published])
    db.commit()

    return {
        "analyst": analyst,
        "manager": manager,
        "apex_client": apex_client,
        "apex": apex,
        "river": river,
        "apex_case": apex_case,
        "river_case": river_case,
        "ai_rec": ai_rec,
        "draft_report": draft,
        "published_report": published,
    }


def _login(client, email):
    r = client.post("/auth/login", json={"email": email, "password": "testpass"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_client_cannot_access_other_client_cases(client, tenants):
    headers = _login(client, "client@apex.example.com")
    cases = client.get("/cases", headers=headers).json()
    assert all(c["client_id"] == str(tenants["apex"].id) for c in cases)
    r = client.get(f"/cases/{tenants['river_case'].id}", headers=headers)
    assert r.status_code == 403


def test_client_cannot_access_qa_reviews(client, tenants):
    headers = _login(client, "client@apex.example.com")
    r = client.get(f"/cases/{tenants['apex_case'].id}/qa-reviews", headers=headers)
    assert r.status_code == 403


def test_client_cannot_see_internal_notes(client, tenants):
    headers = _login(client, "client@apex.example.com")
    notes = client.get(f"/cases/{tenants['apex_case'].id}/notes", headers=headers).json()
    assert all(n["visibility"] != "Internal" for n in notes)


def test_client_cannot_access_ai_recommendations(client, tenants):
    headers = _login(client, "client@apex.example.com")
    r = client.get(f"/cases/{tenants['apex_case'].id}/ai-recommendations", headers=headers)
    assert r.status_code == 403
    r2 = client.get(f"/ai-recommendations/{tenants['ai_rec'].id}", headers=headers)
    assert r2.status_code == 403


def test_analyst_can_access_org_cases(client, tenants):
    headers = _login(client, "analyst@test.example.com")
    cases = client.get("/cases", headers=headers).json()
    assert len(cases) == 2


def test_manager_can_access_all_cases(client, tenants):
    headers = _login(client, "manager@test.example.com")
    r = client.get("/dashboards/soc-manager", headers=headers)
    assert r.status_code == 200


def test_client_report_visibility(client, tenants):
    headers = _login(client, "client@apex.example.com")
    reports = client.get("/reports", headers=headers).json()
    assert len(reports) == 1
    assert reports[0]["status"] == "Published"
    r = client.get(f"/reports/{tenants['draft_report'].id}", headers=headers)
    assert r.status_code == 403


def test_audit_logs_created(client, tenants, db):
    headers = _login(client, "analyst@test.example.com")
    client.post(
        f"/cases/{tenants['apex_case'].id}/ai-recommendations",
        headers=headers,
    )
    logs = db.query(AuditLog).filter(AuditLog.event_type == "ai_recommendation_generated").all()
    assert len(logs) >= 1
