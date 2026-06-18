from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.security import SOC_ROLES, enforce_client_access, get_current_user, get_user_roles
from app.db.session import get_db
from app.models import AIRecommendation, Case, User
from app.schemas import AIRecommendationResponse, AnalystDecisionCreate, AnalystDecisionResponse
from app.services.ai_service import AIRecommendationService
from app.services.decision_service import AnalystDecisionService

router = APIRouter(tags=["ai-decisions"])


@router.post("/cases/{case_id}/ai-recommendations", response_model=AIRecommendationResponse)
def generate_ai_recommendation(
    case_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not any(r in SOC_ROLES for r in get_user_roles(user)):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    try:
        rec = AIRecommendationService(db).generate(case_id, user)
        db.commit()
        db.refresh(rec)
        return rec
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/cases/{case_id}/ai-recommendations", response_model=list[AIRecommendationResponse])
def list_ai_recommendations(
    case_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    enforce_client_access(user, case.client_id)
    return AIRecommendationService(db).get_for_case(case_id)


@router.get("/ai-recommendations/{recommendation_id}", response_model=AIRecommendationResponse)
def get_ai_recommendation(
    recommendation_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rec = db.query(AIRecommendation).filter(AIRecommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    case = db.query(Case).filter(Case.id == rec.case_id).first()
    if case:
        enforce_client_access(user, case.client_id)
    return rec


@router.post("/cases/{case_id}/decisions", response_model=AnalystDecisionResponse)
def submit_decision(
    case_id: UUID,
    payload: AnalystDecisionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not any(r in SOC_ROLES for r in get_user_roles(user)):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    decision = AnalystDecisionService(db).validate_and_create(case, user, **payload.model_dump())
    db.commit()
    db.refresh(decision)
    return decision


@router.get("/cases/{case_id}/decisions", response_model=list[AnalystDecisionResponse])
def list_decisions(
    case_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.models import AnalystDecision

    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    enforce_client_access(user, case.client_id)
    return (
        db.query(AnalystDecision)
        .filter(AnalystDecision.case_id == case_id)
        .order_by(AnalystDecision.created_at.desc())
        .all()
    )
