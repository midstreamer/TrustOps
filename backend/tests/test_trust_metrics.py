"""Trust metrics filtering and weekly trends."""

from datetime import datetime, timedelta, timezone

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
    AnalystDecision,
    Case,
    Client,
    Organization,
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
def seed(db):
    org = Organization(name="Metrics Org")
    db.add(org)
    db.flush()
    apex = Client(organization_id=org.id, name="Apex Energy")
    beta = Client(organization_id=org.id, name="Beta Corp")
    db.add_all([apex, beta])
    db.flush()

    manager_role = Role(name="SOC Manager")
    db.add(manager_role)
    db.flush()
    manager = User(
        organization_id=org.id,
        name="Manager",
        email="mgr@metrics.test",
        password_hash=hash_password("TrustOps123!"),
    )
    db.add(manager)
    db.flush()
    db.add(UserRole(user_id=manager.id, role_id=manager_role.id))

    now = datetime.now(timezone.utc)
    for idx, cl in enumerate([apex, beta]):
        case = Case(
            organization_id=org.id,
            client_id=cl.id,
            case_number=f"CASE-M{idx}",
            title=f"Case {idx}",
            severity="High",
            status="Closed",
        )
        db.add(case)
        db.flush()
        ai = AIRecommendation(
            case_id=case.id,
            model_name="gpt-4o-mini",
            model_provider="openai",
            prompt_version="v1",
            summary="Test",
            confidence_score=85,
            recommended_disposition="Benign",
            created_at=now - timedelta(days=idx * 14),
        )
        db.add(ai)
        db.flush()
        db.add(
            AnalystDecision(
                case_id=case.id,
                analyst_user_id=manager.id,
                ai_recommendation_id=ai.id,
                selected_disposition="Benign",
                selected_priority="P3 Medium",
                analyst_confidence=80,
                ai_action="Accepted" if idx == 0 else "Rejected",
                human_ai_agreement=idx == 0,
                created_at=now - timedelta(days=idx * 14),
            )
        )
    db.commit()
    return {"org": org, "apex": apex, "beta": beta, "manager": manager}


def _auth(client, seed):
    login = client.post(
        "/auth/login",
        json={"email": "mgr@metrics.test", "password": "TrustOps123!"},
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_trust_metrics_all_clients(client, seed):
    headers = _auth(client, seed)
    r = client.get("/dashboards/trust-metrics", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["decision_count"] == 2
    assert len(data["weekly_trends"]) >= 4


def test_trust_metrics_client_filter(client, seed):
    headers = _auth(client, seed)
    r = client.get(
        f"/dashboards/trust-metrics?client_id={seed['apex'].id}",
        headers=headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["decision_count"] == 1
    assert data["filters"]["client_id"] == str(seed["apex"].id)


def test_trust_metrics_date_filter(client, seed):
    headers = _auth(client, seed)
    today = datetime.now(timezone.utc).date()
    start = (today - timedelta(days=7)).isoformat()
    r = client.get(
        f"/dashboards/trust-metrics?start_date={start}&end_date={today.isoformat()}",
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["decision_count"] <= 2


def test_trust_metrics_invalid_date_range(client, seed):
    headers = _auth(client, seed)
    r = client.get(
        "/dashboards/trust-metrics?start_date=2026-06-01&end_date=2026-05-01",
        headers=headers,
    )
    assert r.status_code == 400
