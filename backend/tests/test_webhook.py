"""Webhook alert ingestion tests."""

import uuid
from datetime import datetime, timezone

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
from app.models import Client, Organization, Role, User, UserRole

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
    org = Organization(name="Webhook Test Org")
    db.add(org)
    db.flush()
    client_a = Client(organization_id=org.id, name="Client A")
    client_b = Client(organization_id=org.id, name="Client B")
    db.add_all([client_a, client_b])
    db.commit()
    return {"org": org, "client_a": client_a, "client_b": client_b}


def test_webhook_valid_payload(client, seed):
    payload = {
        "client_id": str(seed["client_a"].id),
        "title": "Webhook test alert",
        "severity": "High",
        "source_system": "Test SIEM",
        "description": "Test description",
        "priority": "P2 High",
        "detected_at": datetime.now(timezone.utc).isoformat(),
    }
    r = client.post("/integrations/webhook/alerts", json=payload, headers=WEBHOOK_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data["case_number"].startswith("CASE-")
    assert data["status"] == "New"


def test_webhook_invalid_client_id(client, seed):
    payload = {
        "client_id": str(uuid.uuid4()),
        "title": "Orphan alert",
        "severity": "Medium",
    }
    r = client.post("/integrations/webhook/alerts", json=payload, headers=WEBHOOK_HEADERS)
    assert r.status_code == 404


def test_webhook_missing_required_fields(client, seed):
    r = client.post(
        "/integrations/webhook/alerts",
        json={"client_id": str(seed["client_a"].id)},
        headers=WEBHOOK_HEADERS,
    )
    assert r.status_code == 422


def test_webhook_invalid_api_key(client, seed):
    payload = {
        "client_id": str(seed["client_a"].id),
        "title": "Unauthorized",
        "severity": "Low",
    }
    r = client.post(
        "/integrations/webhook/alerts",
        json=payload,
        headers={"X-TrustOps-Webhook-Key": "wrong-key"},
    )
    assert r.status_code == 401


def test_webhook_tenant_isolation(client, seed, db):
    """Case is created under the client's organization."""
    from app.models import Case

    payload = {
        "client_id": str(seed["client_b"].id),
        "title": "Client B alert",
        "severity": "Critical",
    }
    r = client.post("/integrations/webhook/alerts", json=payload, headers=WEBHOOK_HEADERS)
    assert r.status_code == 200
    case = db.query(Case).filter(Case.case_number == r.json()["case_number"]).first()
    assert case.organization_id == seed["org"].id
    assert case.client_id == seed["client_b"].id
