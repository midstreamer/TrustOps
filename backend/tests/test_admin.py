"""Admin setup API tests."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Client, Organization, Role, SLAPolicy, User, UserRole

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
def admin_user(db):
    org = Organization(name="MDR Provider")
    db.add(org)
    db.flush()
    for name in ["Platform Admin", "SOC Manager", "SOC Analyst", "Client Admin"]:
        db.add(Role(name=name))
    db.flush()
    admin_role = db.query(Role).filter(Role.name == "Platform Admin").first()
    user = User(
        organization_id=org.id,
        name="Admin",
        email="admin@test.demo",
        password_hash=hash_password("TrustOps123!"),
    )
    db.add(user)
    db.flush()
    db.add(UserRole(user_id=user.id, role_id=admin_role.id))
    db.commit()
    return {"org": org, "admin": user}


def _login(client, email="admin@test.demo"):
    r = client.post("/auth/login", json={"email": email, "password": "TrustOps123!"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_admin_overview(client, admin_user):
    headers = _login(client)
    r = client.get("/admin/overview", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["organization_name"] == "MDR Provider"
    assert "checklist" in data


def test_create_client_with_default_sla(client, admin_user, db):
    headers = _login(client)
    r = client.post(
        "/clients",
        headers=headers,
        json={"name": "Acme Corp", "industry": "Finance", "apply_default_sla": True},
    )
    assert r.status_code == 200
    client_id = uuid.UUID(r.json()["id"])
    policies = db.query(SLAPolicy).filter(SLAPolicy.client_id == client_id).all()
    assert len(policies) == 2
    assert {p.severity for p in policies} == {"Critical", "High"}


def test_apply_default_sla_policies(client, admin_user, db):
    headers = _login(client)
    c = Client(organization_id=admin_user["org"].id, name="No SLA Client")
    db.add(c)
    db.commit()
    r = client.post(f"/admin/clients/{c.id}/default-sla-policies", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_create_demo_case(client, admin_user, db):
    headers = _login(client)
    c = Client(organization_id=admin_user["org"].id, name="Demo Client")
    db.add(c)
    db.commit()
    r = client.post(
        f"/admin/clients/{c.id}/demo-case",
        headers=headers,
        json={"title": "Test demo case"},
    )
    assert r.status_code == 200
    assert r.json()["case_number"].startswith("CASE-")
    assert r.json()["status"] == "New"
