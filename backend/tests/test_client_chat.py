"""Client SOC assistant chat tests."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Client, Organization, Role, User, UserRole

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
def client_user(db):
    org = Organization(name="Chat Org")
    db.add(org)
    db.flush()
    apex = Client(organization_id=org.id, name="Apex Energy")
    db.add(apex)
    db.flush()
    role = Role(name="Client Admin")
    db.add(role)
    db.flush()
    user = User(
        organization_id=org.id,
        client_id=apex.id,
        name="Client User",
        email="client-chat@test.demo",
        password_hash=hash_password("TrustOps123!"),
    )
    db.add(user)
    db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()
    return user, apex


def _login(client, email):
    r = client.post("/auth/login", json={"email": email, "password": "TrustOps123!"})
    return r.json()["access_token"]


def test_client_chat_returns_reply(client, client_user):
    user, apex = client_user
    token = _login(client, user.email)
    r = client.post(
        f"/dashboards/client/{apex.id}/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "How is our SLA performance?", "period_days": 30},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["reply"]
    assert "SLA" in body["reply"] or "sla" in body["reply"].lower()


def test_client_chat_rejects_empty_message(client, client_user):
    user, apex = client_user
    token = _login(client, user.email)
    r = client.post(
        f"/dashboards/client/{apex.id}/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "   "},
    )
    assert r.status_code == 400
