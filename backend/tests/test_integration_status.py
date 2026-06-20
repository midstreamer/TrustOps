"""Integration status endpoint tests."""

import uuid
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
from app.models import Client, IntegrationEvent, Organization, Role, User, UserRole

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
    org = Organization(name="Status Org")
    db.add(org)
    db.flush()
    apex = Client(organization_id=org.id, name="Apex Energy")
    db.add(apex)
    analyst_role = Role(name="SOC Analyst")
    manager_role = Role(name="SOC Manager")
    db.add_all([analyst_role, manager_role])
    db.flush()
    analyst = User(
        organization_id=org.id,
        name="Analyst",
        email="analyst@status.test",
        password_hash=hash_password("TrustOps123!"),
    )
    manager = User(
        organization_id=org.id,
        name="Manager",
        email="manager@status.test",
        password_hash=hash_password("TrustOps123!"),
    )
    db.add_all([analyst, manager])
    db.flush()
    db.add(UserRole(user_id=analyst.id, role_id=analyst_role.id))
    db.add(UserRole(user_id=manager.id, role_id=manager_role.id))
    db.add(
        IntegrationEvent(
            organization_id=org.id,
            client_id=apex.id,
            integration_source="sentinel",
            event_type="alert_ingested",
            status="success",
            source_system="Microsoft Sentinel",
            created_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    return {"manager": manager, "analyst": analyst}


def _token(client, email):
    r = client.post("/auth/login", json={"email": email, "password": "TrustOps123!"})
    return r.json()["access_token"]


def test_integration_status_returns_both_integrations(client, seed):
    token = _token(client, seed["manager"].email)
    r = client.get("/integrations/status", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    names = {d["integration_name"] for d in data}
    assert "Microsoft Sentinel" in names
    assert "Generic Webhook" in names


def test_analyst_cannot_access_integration_status(client, seed):
    token = _token(client, seed["analyst"].email)
    r = client.get("/integrations/status", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_status_warning_when_failures_exist(client, seed, db):
    org_id = seed["manager"].organization_id
    db.add(
        IntegrationEvent(
            organization_id=org_id,
            integration_source="webhook",
            event_type="ingestion_error",
            status="error",
            error_message="bad payload",
            created_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    token = _token(client, seed["manager"].email)
    r = client.get("/integrations/status", headers={"Authorization": f"Bearer {token}"})
    webhook = next(d for d in r.json() if d["integration_key"] == "generic-webhook")
    assert webhook["status"] in ("Warning", "Error")
    assert webhook["failed_payloads_last_24h"] >= 1
