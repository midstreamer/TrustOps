"""Audit log viewer API tests."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Case, Client, Organization, Role, User, UserRole
from app.services.audit_service import AuditLogService

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
    org = Organization(name="Audit Org")
    db.add(org)
    db.flush()
    apex = Client(organization_id=org.id, name="Apex Energy")
    db.add(apex)
    roles = {name: Role(name=name) for name in ("SOC Manager", "SOC Analyst", "Client Admin")}
    db.add_all(roles.values())
    db.flush()
    manager = User(
        organization_id=org.id,
        name="Manager",
        email="mgr@audit.test",
        password_hash=hash_password("TrustOps123!"),
    )
    analyst = User(
        organization_id=org.id,
        name="Analyst",
        email="analyst@audit.test",
        password_hash=hash_password("TrustOps123!"),
    )
    client_user = User(
        organization_id=org.id,
        client_id=apex.id,
        name="Client",
        email="client@audit.test",
        password_hash=hash_password("TrustOps123!"),
    )
    db.add_all([manager, analyst, client_user])
    db.flush()
    db.add(UserRole(user_id=manager.id, role_id=roles["SOC Manager"].id))
    db.add(UserRole(user_id=analyst.id, role_id=roles["SOC Analyst"].id))
    db.add(UserRole(user_id=client_user.id, role_id=roles["Client Admin"].id))
    case = Case(
        case_number="CASE-AUDIT",
        organization_id=org.id,
        client_id=apex.id,
        title="Audit test",
        severity="High",
        status="New",
    )
    db.add(case)
    db.flush()
    AuditLogService.log(
        db,
        event_type="case_created",
        user=analyst,
        organization_id=org.id,
        client_id=apex.id,
        case_id=case.id,
        entity_type="case",
        entity_id=case.id,
        new_value={"case_number": "CASE-AUDIT"},
    )
    db.commit()
    return {"manager": manager, "analyst": analyst, "client_user": client_user, "case": case, "apex": apex}


def _token(client, email):
    r = client.post("/auth/login", json={"email": email, "password": "TrustOps123!"})
    return r.json()["access_token"]


def test_manager_can_access_audit_logs(client, seed):
    token = _token(client, seed["manager"].email)
    r = client.get("/audit-logs", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    assert any(i["event_type"] == "case_created" for i in body["items"])


def test_analyst_cannot_access_audit_logs(client, seed):
    token = _token(client, seed["analyst"].email)
    r = client.get("/audit-logs", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_client_cannot_access_audit_logs(client, seed):
    token = _token(client, seed["client_user"].email)
    r = client.get("/audit-logs", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_audit_filter_by_case(client, seed):
    token = _token(client, seed["manager"].email)
    case_id = str(seed["case"].id)
    r = client.get(f"/audit-logs?case_id={case_id}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert all(str(i["case_id"]) == case_id for i in r.json()["items"])
