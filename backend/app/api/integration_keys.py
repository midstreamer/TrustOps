from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.security import MANAGER_ROLES, require_roles
from app.db.session import get_db
from app.models import User
from app.schemas import (
    IntegrationKeyCreate,
    IntegrationKeyCreatedResponse,
    IntegrationKeyResponse,
)
from app.services.integration_key_service import IntegrationKeyService

router = APIRouter(prefix="/integration-keys", tags=["integration-keys"])


def _serialize(key) -> IntegrationKeyResponse:
    return IntegrationKeyResponse.model_validate(key)


@router.get("", response_model=list[IntegrationKeyResponse])
def list_integration_keys(
    client_id: UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin", *MANAGER_ROLES)),
):
    keys = IntegrationKeyService(db).list_keys(user.organization_id, client_id=client_id)
    return [_serialize(k) for k in keys]


@router.get("/clients/{client_id}", response_model=list[IntegrationKeyResponse])
def list_client_integration_keys(
    client_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin", *MANAGER_ROLES)),
):
    keys = IntegrationKeyService(db).list_keys(user.organization_id, client_id=client_id)
    return [_serialize(k) for k in keys]


@router.post("/clients/{client_id}", response_model=IntegrationKeyCreatedResponse)
def create_integration_key(
    client_id: UUID,
    payload: IntegrationKeyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin", *MANAGER_ROLES)),
):
    result = IntegrationKeyService(db).create_key(
        organization_id=user.organization_id,
        client_id=client_id,
        integration_name=payload.integration_name,
        source_system=payload.source_system,
        actor=user,
    )
    db.commit()
    return IntegrationKeyCreatedResponse(**result)


@router.post("/{key_id}/rotate", response_model=IntegrationKeyCreatedResponse)
def rotate_integration_key(
    key_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin", *MANAGER_ROLES)),
):
    result = IntegrationKeyService(db).rotate_key(key_id, user.organization_id, user)
    db.commit()
    return IntegrationKeyCreatedResponse(**result)


@router.post("/{key_id}/revoke", response_model=IntegrationKeyResponse)
def revoke_integration_key(
    key_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin", *MANAGER_ROLES)),
):
    key = IntegrationKeyService(db).revoke_key(key_id, user.organization_id, user)
    db.commit()
    return _serialize(key)


@router.post("/{key_id}/disable", response_model=IntegrationKeyResponse)
def disable_integration_key(
    key_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin", *MANAGER_ROLES)),
):
    key = IntegrationKeyService(db).disable_key(key_id, user.organization_id, user)
    db.commit()
    return _serialize(key)
