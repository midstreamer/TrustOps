from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.security import (
    CLIENT_ROLES,
    MANAGER_ROLES,
    SOC_ROLES,
    enforce_client_access,
    get_current_user,
    get_user_roles,
    is_client_user,
    require_roles,
)
from app.db.session import get_db
from app.models import Client, User
from app.schemas import (
    AIAssistantStatusResponse,
    ClientChatRequest,
    ClientChatResponse,
    ManagerChatRequest,
    ManagerChatResponse,
    TrustMetricsChatRequest,
    TrustMetricsChatResponse,
    TrustMetricsDrilldownResponse,
)
from app.ai.provider import AIProvider
from app.services.client_chat_service import ClientChatService
from app.services.dashboard_service import DashboardService
from app.services.manager_chat_service import ManagerChatService
from app.services.trust_metrics_chat_service import TrustMetricsChatService

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


@router.get("/ai-status", response_model=AIAssistantStatusResponse)
def ai_assistant_status(
    user: User = Depends(get_current_user),
):
    provider = AIProvider()
    return AIAssistantStatusResponse(
        enabled=provider.is_live,
        provider="openai" if provider.is_live else "mock",
        model=provider.model if provider.is_live else None,
    )


@router.get("/soc-manager")
def soc_manager_dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    return DashboardService(db).soc_manager_metrics(user.organization_id)


@router.get("/analyst")
def analyst_dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*SOC_ROLES)),
):
    return DashboardService(db).analyst_metrics(user.organization_id, user.id)


@router.get("/client/{client_id}")
def client_dashboard(
    client_id: UUID,
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    enforce_client_access(user, client_id)
    published_only = is_client_user(user)
    return DashboardService(db).client_metrics(client_id, published_only=published_only, days=days)


@router.post("/client/{client_id}/chat", response_model=ClientChatResponse)
def client_soc_chat(
    client_id: UUID,
    payload: ClientChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    enforce_client_access(user, client_id)
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    try:
        result = ClientChatService(db).ask(
            client_id,
            payload.message,
            history=[m.model_dump() for m in payload.history],
            period_days=payload.period_days,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return ClientChatResponse(
        reply=result["reply"],
        client_id=client_id,
        period_days=result["period_days"],
        source=result["source"],
    )


@router.post("/soc-manager/chat", response_model=ManagerChatResponse)
def soc_manager_chat(
    payload: ManagerChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    try:
        result = ManagerChatService(db).ask(
            user.organization_id,
            payload.message,
            history=[m.model_dump() for m in payload.history],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return ManagerChatResponse(reply=result["reply"], source=result["source"])


@router.post("/trust-metrics/chat", response_model=TrustMetricsChatResponse)
def trust_metrics_chat(
    payload: TrustMetricsChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    if payload.client_id:
        client = (
            db.query(Client)
            .filter(Client.id == payload.client_id, Client.organization_id == user.organization_id)
            .first()
        )
        if not client:
            raise HTTPException(status_code=404, detail="client_id not found")
    if payload.start_date and payload.end_date and payload.start_date > payload.end_date:
        raise HTTPException(status_code=400, detail="start_date must be on or before end_date")
    try:
        result = TrustMetricsChatService(db).ask(
            user.organization_id,
            payload.message,
            history=[m.model_dump() for m in payload.history],
            client_id=payload.client_id,
            start_date=payload.start_date,
            end_date=payload.end_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return TrustMetricsChatResponse(reply=result["reply"], source=result["source"])


@router.get("/executive")
def executive_dashboard(
    client_id: UUID | None = None,
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if is_client_user(user):
        if not user.client_id:
            raise HTTPException(status_code=403, detail="No client assigned")
        return DashboardService(db).client_metrics(user.client_id, published_only=True, days=days)
    if client_id:
        return DashboardService(db).client_metrics(client_id, days=days)
    return DashboardService(db).soc_manager_metrics(user.organization_id)


@router.get("/trust-metrics")
def trust_metrics_dashboard(
    client_id: UUID | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    trend_weeks: int = Query(12, ge=4, le=52),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    from app.services.trust_metrics_service import TrustMetricsService

    if client_id:
        client = (
            db.query(Client)
            .filter(Client.id == client_id, Client.organization_id == user.organization_id)
            .first()
        )
        if not client:
            raise HTTPException(status_code=404, detail="client_id not found")
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be on or before end_date")

    return TrustMetricsService(db).get_metrics(
        user.organization_id,
        client_id=client_id,
        start_date=start_date,
        end_date=end_date,
        trend_weeks=trend_weeks,
    )


@router.get("/trust-metrics/drilldown", response_model=TrustMetricsDrilldownResponse)
def trust_metrics_drilldown(
    type: str = Query(..., alias="type"),
    client_id: UUID | None = None,
    analyst_user_id: UUID | None = None,
    severity: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    from app.services.trust_metrics_service import TrustMetricsService

    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be on or before end_date")
    try:
        return TrustMetricsService(db).drilldown(
            user.organization_id,
            type,
            client_id=client_id,
            analyst_user_id=analyst_user_id,
            severity=severity,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
