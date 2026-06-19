"""Client dashboard workflow funnel tests."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import Alert, Case, Client, Organization
from app.services.dashboard_service import DashboardService

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
def client_with_data(db):
    org = Organization(name="Funnel Org")
    db.add(org)
    db.flush()
    client = Client(organization_id=org.id, name="Apex Energy")
    db.add(client)
    db.flush()
    now = datetime.now(timezone.utc)
    case = Case(
        organization_id=org.id,
        client_id=client.id,
        case_number="CASE-F1",
        title="Suspicious login",
        severity="High",
        status="Closed",
        disposition="True Positive - Incident",
        detected_at=now - timedelta(days=5),
        triaged_at=now - timedelta(days=4),
        dispositioned_at=now - timedelta(days=3),
        closed_at=now - timedelta(days=2),
    )
    db.add(case)
    db.flush()
    db.add(
        Alert(
            case_id=case.id,
            client_id=client.id,
            title="Login alert",
            severity="High",
            source_system="Microsoft Sentinel",
            detected_at=now - timedelta(days=5),
        )
    )
    db.commit()
    return client


def test_workflow_funnel_stages(db, client_with_data):
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=30)
    funnel = DashboardService(db).client_workflow_funnel(client_with_data.id, start=start, end=end)
    assert len(funnel["stages"]) == 4
    assert funnel["stages"][0]["total"] >= 1
    assert funnel["stages"][0]["id"] == "alerts_received"
    assert any(b["label"] == "Microsoft Sentinel" for b in funnel["stages"][0]["breakdown"])
    assert "trend_pct" in funnel["stages"][0]


def test_client_metrics_includes_funnel(db, client_with_data):
    metrics = DashboardService(db).client_metrics(client_with_data.id, days=30)
    assert "workflow_funnel" in metrics
    assert metrics["period_days"] == 30
