"""Microsoft Sentinel integration tests."""

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Case, Client, Organization

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
    org = Organization(name="Sentinel Test Org")
    db.add(org)
    db.flush()
    apex = Client(organization_id=org.id, name="Apex Energy")
    db.add(apex)
    db.commit()
    return {"org": org, "apex": apex}


def test_sentinel_health(client):
    r = client.get("/integrations/sentinel/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["integration"] == "microsoft-sentinel"


def test_sentinel_valid_payload(client, seed):
    payload = {
        "client_id": str(seed["apex"].id),
        "displayName": "Suspicious OAuth consent grant",
        "description": "OAuth consent from unfamiliar application",
        "severity": "High",
        "systemAlertId": "sentinel-alert-001",
        "tactics": ["Persistence"],
        "techniques": ["T1098"],
        "entities": [
            {"$id": "Account", "name": "finance.admin"},
            {"$id": "Host", "hostName": "O365-TENANT"},
        ],
        "endTimeUtc": datetime.now(timezone.utc).isoformat(),
    }
    r = client.post("/integrations/sentinel/alerts", json=payload, headers=WEBHOOK_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data["case_number"].startswith("CASE-")
    assert data["status"] == "New"


def test_sentinel_missing_fields(client, seed):
    r = client.post(
        "/integrations/sentinel/alerts",
        json={"client_id": str(seed["apex"].id)},
        headers=WEBHOOK_HEADERS,
    )
    assert r.status_code == 422


def test_sentinel_invalid_client(client, seed):
    payload = {
        "client_id": str(uuid.uuid4()),
        "displayName": "Orphan Sentinel alert",
        "severity": "Medium",
    }
    r = client.post("/integrations/sentinel/alerts", json=payload, headers=WEBHOOK_HEADERS)
    assert r.status_code == 404


def test_sentinel_creates_case_with_source(client, seed, db):
    payload = {
        "client_id": str(seed["apex"].id),
        "displayName": "Sentinel tenant isolation test",
        "severity": "Critical",
        "systemAlertId": "sentinel-iso-001",
    }
    r = client.post("/integrations/sentinel/alerts", json=payload, headers=WEBHOOK_HEADERS)
    assert r.status_code == 200
    case = db.query(Case).filter(Case.case_number == r.json()["case_number"]).first()
    assert case.client_id == seed["apex"].id
    assert case.organization_id == seed["org"].id
    assert case.source_system == "Microsoft Sentinel"
