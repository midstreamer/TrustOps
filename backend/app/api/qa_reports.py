from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.security import MANAGER_ROLES, enforce_client_access, get_current_user, is_client_user, require_roles
from app.db.session import get_db
from app.models import Case, QAReview, Report, User
from app.schemas import (
    QAReviewCreate,
    QAReviewResponse,
    ReportGenerateRequest,
    ReportResponse,
    ReportUpdate,
)
from app.services.qa_service import QAService
from app.services.report_service import ReportService

router = APIRouter(tags=["qa-reports"])


@router.post("/cases/{case_id}/qa-reviews", response_model=QAReviewResponse)
def create_qa_review(
    case_id: UUID,
    payload: QAReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    review = QAService(db).create_review(case_id, user, **payload.model_dump())
    db.commit()
    db.refresh(review)
    return review


@router.get("/cases/{case_id}/qa-reviews", response_model=list[QAReviewResponse])
def list_qa_reviews(
    case_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    return db.query(QAReview).filter(QAReview.case_id == case_id).all()


@router.patch("/qa-reviews/{qa_review_id}", response_model=QAReviewResponse)
def update_qa_review(
    qa_review_id: UUID,
    payload: QAReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    review = db.query(QAReview).filter(QAReview.id == qa_review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="QA review not found")
    QAService(db).update_review(review, **payload.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(review)
    return review


@router.post("/reports/generate", response_model=ReportResponse)
def generate_report(
    payload: ReportGenerateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    from app.models import Client

    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    report = ReportService(db).generate_draft(
        payload.client_id,
        payload.reporting_period_start,
        payload.reporting_period_end,
        user,
        client.name,
    )
    db.commit()
    db.refresh(report)
    return report


@router.get("/reports", response_model=list[ReportResponse])
def list_reports(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Report)
    if is_client_user(user) and user.client_id:
        q = q.filter(Report.client_id == user.client_id, Report.status == "Published")
    return q.order_by(Report.created_at.desc()).all()


@router.get("/reports/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if is_client_user(user):
        if report.client_id != user.client_id or report.status != "Published":
            raise HTTPException(status_code=403, detail="Access denied")
    return report


@router.patch("/reports/{report_id}", response_model=ReportResponse)
def update_report(
    report_id: UUID,
    payload: ReportUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(report, k, v)
    db.commit()
    db.refresh(report)
    return report


@router.post("/reports/{report_id}/regenerate", response_model=ReportResponse)
def regenerate_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    from app.models import Client

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    client = db.query(Client).filter(Client.id == report.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    ReportService(db).regenerate_content(report, user, client.name)
    db.commit()
    db.refresh(report)
    return report


@router.post("/reports/{report_id}/publish", response_model=ReportResponse)
def publish_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    try:
        ReportService(db).publish(report, user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.commit()
    db.refresh(report)
    return report
