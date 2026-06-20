"""Trust Metrics assistant chat tests."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Organization, Role, User, UserRole

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
def manager_user(db):
    org = Organization(name="Trust Metrics Chat Org")
    db.add(org)
    db.flush()
    role = Role(name="SOC Manager")
    db.add(role)
    db.flush()
    user = User(
        organization_id=org.id,
        name="Manager User",
        email="trust-metrics-chat@test.demo",
        password_hash=hash_password("TrustOps123!"),
    )
    db.add(user)
    db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()
    return user


def _login(client, email):
    r = client.post("/auth/login", json={"email": email, "password": "TrustOps123!"})
    return r.json()["access_token"]


def test_trust_metrics_chat_returns_reply(client, manager_user):
    token = _login(client, manager_user.email)
    r = client.post(
        "/dashboards/trust-metrics/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "Explain our trust calibration score", "history": []},
    )
    assert r.status_code == 200
    data = r.json()
    assert "reply" in data
    assert len(data["reply"]) > 0
    assert data["source"] in ("openai", "mock")


def test_trust_metrics_chat_rejects_empty_message(client, manager_user):
    token = _login(client, manager_user.email)
    r = client.post(
        "/dashboards/trust-metrics/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "   ", "history": []},
    )
    assert r.status_code == 400


def test_trust_metrics_chat_accepts_filter_params(client, manager_user):
    token = _login(client, manager_user.email)
    r = client.post(
        "/dashboards/trust-metrics/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "message": "Summarize AI alignment",
            "history": [],
            "start_date": "2025-01-01",
            "end_date": "2025-12-31",
        },
    )
    assert r.status_code == 200
    assert "reply" in r.json()
