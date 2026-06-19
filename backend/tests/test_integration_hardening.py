"""Integration hardening tests — deduplication and event logging."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.security import hash_password
from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Case, Client, IntegrationEvent, Organization, Role, User, UserRole

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
WEBHOOK_HEADERS = {"X-TrustOps-Webhook-Key": settings.webhook_api_key}


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
    org = Organization(name="Integration Test Org")
    db.add(org)
    db.flush()
    apex = Client(organization_id=org.id, name="Apex Energy")
    db.add(apex)
    db.flush()

    manager_role = Role(name="SOC Manager")
    db.add(manager_role)
    db.flush()
    manager = User(
        organization_id=org.id,
        name="Manager",
        email="mgr@integration.test",
        password_hash=hash_password("TrustOps123!"),
    )
    db.add(manager)
    db.flush()
    db.add(UserRole(user_id=manager.id, role_id=manager_role.id))
    db.commit()
    return {"org": org, "apex": apex, "manager": manager}


def test_webhook_deduplication(client, seed, db):
    payload = {
        "client_id": str(seed["apex"].id),
        "title": "Duplicate test alert",
        "severity": "High",
        "source_system": "Test SIEM",
        "source_alert_id": "dedup-alert-001",
    }
    r1 = client.post("/integrations/webhook/alerts", json=payload, headers=WEBHOOK_HEADERS)
    assert r1.status_code == 200
    assert r1.json()["ingestion_status"] == "created"
    assert r1.json()["duplicate"] is False

    r2 = client.post("/integrations/webhook/alerts", json=payload, headers=WEBHOOK_HEADERS)
    assert r2.status_code == 200
    data = r2.json()
    assert data["ingestion_status"] == "duplicate"
    assert data["duplicate"] is True
    assert data["case_number"] == r1.json()["case_number"]

    case_count = db.query(Case).filter(Case.source_alert_id == "dedup-alert-001").count()
    assert case_count == 1


def test_webhook_logs_success_event(client, seed, db):
    payload = {
        "client_id": str(seed["apex"].id),
        "title": "Logged alert",
        "severity": "Medium",
        "source_system": "Test SIEM",
        "source_alert_id": "log-success-001",
    }
    r = client.post("/integrations/webhook/alerts", json=payload, headers=WEBHOOK_HEADERS)
    assert r.status_code == 200
    events = db.query(IntegrationEvent).filter(IntegrationEvent.status == "success").all()
    assert len(events) >= 1


def test_webhook_logs_validation_error(client, seed, db):
    payload = {
        "client_id": str(seed["apex"].id),
        "title": "Bad severity",
        "severity": "NotARealSeverity",
        "source_alert_id": "log-error-001",
    }
    r = client.post("/integrations/webhook/alerts", json=payload, headers=WEBHOOK_HEADERS)
    assert r.status_code == 400
    events = db.query(IntegrationEvent).filter(IntegrationEvent.status == "error").all()
    assert len(events) >= 1


def test_integration_logs_api(client, seed):
    headers = WEBHOOK_HEADERS
    payload = {
        "client_id": str(seed["apex"].id),
        "title": "API log test",
        "severity": "Low",
        "source_system": "Test",
        "source_alert_id": "api-log-001",
    }
    client.post("/integrations/webhook/alerts", json=payload, headers=headers)

    login = client.post(
        "/auth/login",
        json={"email": "mgr@integration.test", "password": "TrustOps123!"},
    )
    auth = {"Authorization": f"Bearer {login.json()['access_token']}"}
    r = client.get("/integrations/logs", headers=auth)
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_sentinel_deduplication(client, seed):
    payload = {
        "client_id": str(seed["apex"].id),
        "displayName": "Sentinel dedup test",
        "severity": "High",
        "systemAlertId": "sentinel-dedup-001",
    }
    r1 = client.post("/integrations/sentinel/alerts", json=payload, headers=WEBHOOK_HEADERS)
    r2 = client.post("/integrations/sentinel/alerts", json=payload, headers=WEBHOOK_HEADERS)
    assert r1.json()["ingestion_status"] == "created"
    assert r2.json()["ingestion_status"] == "duplicate"
