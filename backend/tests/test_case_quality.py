"""Case quality scoring tests."""

from datetime import datetime, timezone

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
    AnalystDecision,
    Case,
    CaseEvidence,
    Client,
    Organization,
    Role,
    SLAEvent,
    User,
    UserRole,
)
from app.services.case_quality_service import CaseQualityService

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
def seed(db):
    org = Organization(name="Quality Org")
    db.add(org)
    db.flush()
    apex = Client(organization_id=org.id, name="Apex")
    manager_role = Role(name="SOC Manager")
    client_role = Role(name="Client Admin")
    db.add_all([apex, manager_role, client_role])
    db.flush()
    manager = User(
        organization_id=org.id,
        name="Manager",
        email="mgr@quality.test",
        password_hash=hash_password("TrustOps123!"),
    )
    client_user = User(
        organization_id=org.id,
        client_id=apex.id,
        name="Client",
        email="client@quality.test",
        password_hash=hash_password("TrustOps123!"),
    )
    db.add_all([manager, client_user])
    db.flush()
    db.add(UserRole(user_id=manager.id, role_id=manager_role.id))
    db.add(UserRole(user_id=client_user.id, role_id=client_role.id))
    good_case = Case(
        case_number="CASE-GOOD",
        organization_id=org.id,
        client_id=apex.id,
        title="Good case",
        severity="High",
        status="Closed",
        closed_at=datetime.now(timezone.utc),
    )
    bad_case = Case(
        case_number="CASE-BAD",
        organization_id=org.id,
        client_id=apex.id,
        title="Bad case",
        severity="Medium",
        status="New",
    )
    db.add_all([good_case, bad_case])
    db.flush()
    db.add(
        CaseEvidence(
            case_id=good_case.id,
            evidence_type="Log",
            title="Evidence",
            created_by_user_id=manager.id,
        )
    )
    db.add(
        AnalystDecision(
            case_id=good_case.id,
            analyst_user_id=manager.id,
            selected_disposition="False Positive",
            selected_priority="P3 Medium",
            analyst_confidence=90,
            ai_action="Accepted",
            decision_notes="Documented",
            human_ai_agreement=True,
        )
    )
    db.add(
        SLAEvent(
            case_id=good_case.id,
            sla_type="Triage",
            target_minutes=60,
            due_at=datetime.now(timezone.utc),
            status="Met",
            breached=False,
        )
    )
    db.commit()
    return {"manager": manager, "client_user": client_user, "good": good_case, "bad": bad_case}


def _token(client, email):
    r = client.post("/auth/login", json={"email": email, "password": "TrustOps123!"})
    return r.json()["access_token"]


def test_high_quality_case(db, seed):
    case = db.query(Case).filter(Case.case_number == "CASE-GOOD").first()
    result = CaseQualityService(db).score_case(case)
    assert result["quality_score"] >= 75
    assert "Missing evidence" not in result["flags"]
    assert "No analyst decision" not in result["flags"]


def test_missing_evidence_flag(db, seed):
    case = db.query(Case).filter(Case.case_number == "CASE-BAD").first()
    result = CaseQualityService(db).score_case(case)
    assert "Missing evidence" in result["flags"]
    assert "No analyst decision" in result["flags"]
    assert result["quality_score"] < 75


def test_manager_sees_quality_on_case(client, seed):
    token = _token(client, seed["manager"].email)
    r = client.get(f"/cases/{seed['good'].id}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["quality"] is not None
    assert r.json()["quality"]["quality_score"] >= 75


def test_client_does_not_see_quality(client, seed):
    token = _token(client, seed["client_user"].email)
    r = client.get(f"/cases/{seed['good'].id}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json().get("quality") is None
