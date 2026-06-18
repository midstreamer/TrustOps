import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.security import hash_password
from app.db.base import Base
from app.main import app
from app.db.session import get_db
from app.models import Client, Organization, Role, User, UserRole
from app.services.case_service import CaseService
from app.services.decision_service import AnalystDecisionService
from app.services.sla_service import SLAService

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
def seed_org(db):
    org = Organization(name="Test Org")
    db.add(org)
    db.flush()
    client = Client(organization_id=org.id, name="Test Client")
    db.add(client)
    role = Role(name="SOC Analyst")
    db.add(role)
    db.flush()
    user = User(
        organization_id=org.id,
        name="Analyst",
        email="analyst@test.example.com",
        password_hash=hash_password("testpass"),
    )
    db.add(user)
    db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()
    return {"org": org, "client": client, "user": user}


def test_case_creation(db, seed_org):
    svc = CaseService(db)
    case = svc.create_case(
        organization_id=seed_org["org"].id,
        client_id=seed_org["client"].id,
        title="Test Case",
        severity="High",
        created_by=seed_org["user"],
    )
    db.commit()
    assert case.case_number.startswith("CASE-")
    assert case.status == "New"


def test_sla_status_calculation(db, seed_org):
    from app.models import Case, SLAPolicy, SLAEvent

    policy = SLAPolicy(client_id=seed_org["client"].id, time_to_triage_minutes=30)
    db.add(policy)
    case = Case(
        case_number="CASE-00001",
        organization_id=seed_org["org"].id,
        client_id=seed_org["client"].id,
        title="SLA Test",
        severity="High",
        status="New",
        created_at=datetime.now(timezone.utc),
    )
    db.add(case)
    db.flush()
    now = datetime.now(timezone.utc)
    event = SLAEvent(
        case_id=case.id,
        sla_type="Triage",
        target_minutes=30,
        due_at=now - timedelta(minutes=5),
        status="In Progress",
    )
    db.add(event)
    db.commit()
    sla_svc = SLAService(db)
    sla_svc.refresh_sla_status(event)
    assert event.status == "Breached"


def test_analyst_decision_validation(db, seed_org):
    from app.models import Case

    case = Case(
        case_number="CASE-00002",
        organization_id=seed_org["org"].id,
        client_id=seed_org["client"].id,
        title="Decision Test",
        severity="Medium",
        status="New",
        created_at=datetime.now(timezone.utc),
    )
    db.add(case)
    db.commit()
    svc = AnalystDecisionService(db)
    decision = svc.validate_and_create(
        case,
        seed_org["user"],
        selected_disposition="False Positive",
        selected_priority="P4 Low",
        analyst_confidence=90,
        ai_action="Not Used",
    )
    db.commit()
    assert decision.selected_disposition == "False Positive"
    assert case.disposition == "False Positive"


def test_client_data_isolation(client, seed_org):
    login = client.post("/auth/login", json={"email": "analyst@test.example.com", "password": "testpass"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    cases = client.get("/cases", headers=headers)
    assert cases.status_code == 200
