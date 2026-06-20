"""Pilot admin v0.2.1 tests — integration keys, admin, evidence, branding, exports."""

import io
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
from app.models import (
    Case,
    Client,
    IntegrationKey,
    Organization,
    Role,
    User,
    UserRole,
)
from app.services.integration_key_service import IntegrationKeyService, _hash_key

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
    org = Organization(name="Pilot Admin Org")
    db.add(org)
    db.flush()
    apex = Client(organization_id=org.id, name="Apex Energy")
    river = Client(organization_id=org.id, name="Riverbend")
    db.add_all([apex, river])
    roles = {n: Role(name=n) for n in ("Platform Admin", "SOC Manager", "SOC Analyst", "Client Admin")}
    db.add_all(roles.values())
    db.flush()
    admin = User(
        organization_id=org.id,
        name="Admin",
        email="admin@pilot.test",
        password_hash=hash_password("TrustOps123!"),
    )
    analyst = User(
        organization_id=org.id,
        name="Analyst",
        email="analyst@pilot.test",
        password_hash=hash_password("TrustOps123!"),
    )
    client_user = User(
        organization_id=org.id,
        client_id=apex.id,
        name="Client",
        email="client@pilot.test",
        password_hash=hash_password("TrustOps123!"),
    )
    db.add_all([admin, analyst, client_user])
    db.flush()
    db.add(UserRole(user_id=admin.id, role_id=roles["Platform Admin"].id))
    db.add(UserRole(user_id=analyst.id, role_id=roles["SOC Analyst"].id))
    db.add(UserRole(user_id=client_user.id, role_id=roles["Client Admin"].id))
    case = Case(
        case_number="CASE-KEY",
        organization_id=org.id,
        client_id=apex.id,
        title="Key test case",
        severity="High",
        status="New",
    )
    db.add(case)
    db.commit()
    return {"org": org, "apex": apex, "river": river, "admin": admin, "analyst": analyst, "client_user": client_user, "case": case}


def _token(client, email):
    r = client.post("/auth/login", json={"email": email, "password": "TrustOps123!"})
    return r.json()["access_token"]


def test_create_key_returns_raw_once(client, seed, db):
    token = _token(client, seed["admin"].email)
    r = client.post(
        f"/integration-keys/clients/{seed['apex'].id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"integration_name": "Microsoft Sentinel", "source_system": "Sentinel"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["raw_key"].startswith("tos_")
    assert body["key_prefix"] == body["raw_key"][:12]
    stored = db.query(IntegrationKey).filter(IntegrationKey.id == uuid.UUID(body["id"])).first()
    assert stored.key_hash == _hash_key(body["raw_key"])
    assert stored.key_hash != body["raw_key"]


def test_per_client_key_ingestion(client, seed, db):
    svc = IntegrationKeyService(db)
    created = svc.create_key(
        organization_id=seed["org"].id,
        client_id=seed["apex"].id,
        integration_name="Generic Webhook",
        source_system="Webhook",
        actor=seed["admin"],
    )
    db.commit()
    raw = created["raw_key"]
    r = client.post(
        "/integrations/webhook/alerts",
        headers={"X-TrustOps-Webhook-Key": raw},
        json={
            "client_id": str(seed["apex"].id),
            "title": "Per-client key alert",
            "severity": "Medium",
        },
    )
    assert r.status_code == 200


def test_revoked_key_rejects_ingestion(client, seed, db):
    svc = IntegrationKeyService(db)
    created = svc.create_key(
        organization_id=seed["org"].id,
        client_id=seed["apex"].id,
        integration_name="Webhook",
        source_system="Webhook",
        actor=seed["admin"],
    )
    key = db.query(IntegrationKey).filter(IntegrationKey.id == created["id"]).first()
    svc.revoke_key(key.id, seed["org"].id, seed["admin"])
    db.commit()
    r = client.post(
        "/integrations/webhook/alerts",
        headers={"X-TrustOps-Webhook-Key": created["raw_key"]},
        json={"client_id": str(seed["apex"].id), "title": "x", "severity": "Low"},
    )
    assert r.status_code == 401


def test_client_a_key_cannot_ingest_for_client_b(client, seed, db):
    svc = IntegrationKeyService(db)
    created = svc.create_key(
        organization_id=seed["org"].id,
        client_id=seed["apex"].id,
        integration_name="Webhook",
        source_system="Webhook",
        actor=seed["admin"],
    )
    db.commit()
    r = client.post(
        "/integrations/webhook/alerts",
        headers={"X-TrustOps-Webhook-Key": created["raw_key"]},
        json={"client_id": str(seed["river"].id), "title": "x", "severity": "Low"},
    )
    assert r.status_code == 401


def test_pilot_checklist(client, seed):
    token = _token(client, seed["admin"].email)
    r = client.get("/admin/pilot-checklist", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert "items" in r.json()


def test_client_cannot_access_admin_summary(client, seed):
    token = _token(client, seed["client_user"].email)
    r = client.get("/admin/summary", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_report_branding_org_level(client, seed):
    token = _token(client, seed["admin"].email)
    r = client.post(
        "/report-branding",
        headers={"Authorization": f"Bearer {token}"},
        json={"provider_name": "Acme MDR", "report_title": "Monthly SOC Report"},
    )
    assert r.status_code == 200
    resolved = client.get(
        f"/report-branding/clients/{seed['apex'].id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resolved.status_code == 200
    assert resolved.json()["provider_name"] == "Acme MDR"


def test_evidence_upload_and_client_visibility(client, seed, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "evidence_storage_path", str(tmp_path))
    token = _token(client, seed["admin"].email)
    case_id = str(seed["case"].id)
    files = {"file": ("test.log", io.BytesIO(b"line1\nline2"), "text/plain")}
    r = client.post(
        f"/cases/{case_id}/evidence/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"visibility": "Internal"},
        files=files,
    )
    assert r.status_code == 200
    evidence_id = r.json()["id"]
    client_token = _token(client, seed["client_user"].email)
    dl = client.get(
        f"/cases/{case_id}/evidence/{evidence_id}/download",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert dl.status_code == 403


def test_external_ticket_summary(client, seed):
    token = _token(client, seed["admin"].email)
    r = client.get(
        f"/cases/{seed['case'].id}/external-ticket-summary?target=servicenow",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["target"] == "servicenow"
    assert "CASE-KEY" in r.json()["external_reference"]


def test_client_cannot_link_external_ticket(client, seed):
    token = _token(client, seed["client_user"].email)
    r = client.post(
        f"/cases/{seed['case'].id}/external-ticket-link",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "external_ticket_system": "ServiceNow",
            "external_ticket_id": "INC001",
        },
    )
    assert r.status_code == 403
