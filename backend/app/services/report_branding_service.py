"""Report branding resolution for client value reports."""

import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Client, ReportBranding

DEFAULT_BRANDING = {
    "provider_name": "TrustOps Managed Security",
    "provider_logo_url": None,
    "client_logo_url": None,
    "report_title": "SOC Monthly Value Report",
    "prepared_by": None,
    "prepared_for": None,
    "confidentiality_footer": "Confidential — For authorized client use only.",
    "cover_page_enabled": True,
    "theme_name": "default",
}


class ReportBrandingService:
    def __init__(self, db: Session):
        self.db = db

    def resolve(self, organization_id: uuid.UUID, client_id: uuid.UUID) -> dict:
        client = (
            self.db.query(Client)
            .filter(Client.id == client_id, Client.organization_id == organization_id)
            .first()
        )
        client_name = client.name if client else None

        client_branding = (
            self.db.query(ReportBranding)
            .filter(
                ReportBranding.organization_id == organization_id,
                ReportBranding.client_id == client_id,
            )
            .first()
        )
        org_branding = (
            self.db.query(ReportBranding)
            .filter(
                ReportBranding.organization_id == organization_id,
                ReportBranding.client_id.is_(None),
            )
            .first()
        )

        base = {**DEFAULT_BRANDING}
        if org_branding:
            base.update(self._to_dict(org_branding))
        if client_branding:
            base.update(self._to_dict(client_branding))

        base["client_name"] = client_name
        base["prepared_for"] = base.get("prepared_for") or client_name
        return base

    def list_branding(self, organization_id: uuid.UUID) -> list[ReportBranding]:
        return (
            self.db.query(ReportBranding)
            .filter(ReportBranding.organization_id == organization_id)
            .order_by(ReportBranding.client_id.nullsfirst())
            .all()
        )

    def upsert(
        self,
        organization_id: uuid.UUID,
        *,
        client_id: uuid.UUID | None = None,
        data: dict,
    ) -> ReportBranding:
        if client_id:
            client = (
                self.db.query(Client)
                .filter(Client.id == client_id, Client.organization_id == organization_id)
                .first()
            )
            if not client:
                raise HTTPException(status_code=404, detail="Client not found")

        q = self.db.query(ReportBranding).filter(ReportBranding.organization_id == organization_id)
        if client_id:
            q = q.filter(ReportBranding.client_id == client_id)
        else:
            q = q.filter(ReportBranding.client_id.is_(None))

        branding = q.first()
        if not branding:
            branding = ReportBranding(organization_id=organization_id, client_id=client_id)
            self.db.add(branding)

        for field in (
            "provider_name",
            "provider_logo_url",
            "client_logo_url",
            "report_title",
            "prepared_by",
            "prepared_for",
            "confidentiality_footer",
            "cover_page_enabled",
            "theme_name",
        ):
            if field in data and data[field] is not None:
                setattr(branding, field, data[field])

        self.db.flush()
        return branding

    @staticmethod
    def _to_dict(b: ReportBranding) -> dict:
        return {
            "id": str(b.id),
            "provider_name": b.provider_name,
            "provider_logo_url": b.provider_logo_url,
            "client_logo_url": b.client_logo_url,
            "report_title": b.report_title,
            "prepared_by": b.prepared_by,
            "prepared_for": b.prepared_for,
            "confidentiality_footer": b.confidentiality_footer,
            "cover_page_enabled": b.cover_page_enabled,
            "theme_name": b.theme_name,
        }

    def export_filename(self, client_name: str, period_end) -> str:
        safe = "".join(c if c.isalnum() else "_" for c in client_name)
        month = period_end.strftime("%Y-%m") if hasattr(period_end, "strftime") else str(period_end)[:7]
        return f"TrustOps_{safe}_{month}_SOC_Value_Report.pdf"
