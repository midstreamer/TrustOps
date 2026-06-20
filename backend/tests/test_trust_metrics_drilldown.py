"""Trust metrics drilldown tests."""

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
from app.models import AIRecommendation, AnalystDecision, Case, Client, Organization, Role, User, UserRole

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
    org = Organization(name="Drill Org")
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
        email="mgr@drill.test",
        password_hash=hash_password("TrustOps123!"),
    )
    client_user = User(
        organization_id=org.id,
        client_id=apex.id,
        name="Client",
        email="client@drill.test",
        password_hash=hash_password("TrustOps123!"),
    )
    db.add_all([manager, client_user])
    db.flush()
    db.add(UserRole(user_id=manager.id, role_id=manager_role.id))
    db.add(UserRole(user_id=client_user.id, role_id=client_role.id))
    case = Case(
        case_number="CASE-DRILL",
        organization_id=org.id,
        client_id=apex.id,
        title="Disagreement case",
        severity="High",
        status="Triaged",
    )
    db.add(case)
    db.flush()
    ai = AIRecommendation(
        case_id=case.id,
        model_name="test",
        model_provider="mock",
        prompt_version="v1",
        summary="test",
        confidence_score=85,
        recommended_disposition="False Positive",
        recommended_priority="P3 Medium",
    )
    db.add(ai)
    db.flush()
    db.add(
        AnalystDecision(
            case_id=case.id,
            analyst_user_id=manager.id,
            ai_recommendation_id=ai.id,
            selected_disposition="True Positive - Incident",
            selected_priority="P1 Critical",
            analyst_confidence=70,
            ai_action="Rejected",
            human_ai_agreement=False,
        )
    )
    db.commit()
    return {"manager": manager, "client_user": client_user, "case": case}


def _token(client, email):
    r = client.post("/auth/login", json={"email": email, "password": "TrustOps123!"})
    return r.json()["access_token"]


def test_human_ai_disagreement_drilldown(client, seed):
    token = _token(client, seed["manager"].email)
    r = client.get(
        "/dashboards/trust-metrics/drilldown?type=human_ai_disagreement",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    assert any(i["case_number"] == "CASE-DRILL" for i in body["items"])


def test_high_confidence_rejected_drilldown(client, seed):
    token = _token(client, seed["manager"].email)
    r = client.get(
        "/dashboards/trust-metrics/drilldown?type=high_confidence_ai_rejected",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_client_cannot_access_drilldown(client, seed):
    token = _token(client, seed["client_user"].email)
    r = client.get(
        "/dashboards/trust-metrics/drilldown?type=human_ai_disagreement",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403
