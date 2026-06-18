from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.security import MANAGER_ROLES, enforce_client_access, get_current_user, is_client_user, require_roles
from app.db.session import get_db
from app.models import Client, User
from app.schemas import ClientCreate, ClientResponse, ClientUpdate

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientResponse])
def list_clients(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Client).filter(Client.organization_id == user.organization_id)
    if is_client_user(user) and user.client_id:
        q = q.filter(Client.id == user.client_id)
    return q.order_by(Client.name).all()


@router.post("", response_model=ClientResponse)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    data = payload.model_dump()
    apply_default_sla = data.pop("apply_default_sla", True)
    client = Client(organization_id=user.organization_id, **data)
    db.add(client)
    db.flush()
    if apply_default_sla:
        from app.services.admin_service import AdminService

        AdminService(db).apply_default_sla_policies(client.id, user.organization_id)
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    enforce_client_access(user, client_id)
    return client


@router.patch("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: UUID,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(client, k, v)
    db.commit()
    db.refresh(client)
    return client
