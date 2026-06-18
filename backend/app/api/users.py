from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth.security import MANAGER_ROLES, get_current_user, hash_password, require_roles
from app.db.session import get_db
from app.models import Role, User, UserRole
from app.schemas import UserCreate, UserResponse, UserUpdate
from app.auth.security import get_user_roles

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    users = (
        db.query(User)
        .options(joinedload(User.roles).joinedload(UserRole.role))
        .filter(User.organization_id == user.organization_id)
        .all()
    )
    return [
        UserResponse(
            id=u.id,
            organization_id=u.organization_id,
            client_id=u.client_id,
            name=u.name,
            email=u.email,
            status=u.status,
            roles=get_user_roles(u),
        )
        for u in users
    ]


@router.post("", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Platform Admin")),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    new_user = User(
        organization_id=user.organization_id,
        client_id=payload.client_id,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(new_user)
    db.flush()
    for role_name in payload.role_names:
        role = db.query(Role).filter(Role.name == role_name).first()
        if role:
            db.add(UserRole(user_id=new_user.id, role_id=role.id))
    db.commit()
    db.refresh(new_user)
    new_user = (
        db.query(User)
        .options(joinedload(User.roles).joinedload(UserRole.role))
        .filter(User.id == new_user.id)
        .first()
    )
    return UserResponse(
        id=new_user.id,
        organization_id=new_user.organization_id,
        client_id=new_user.client_id,
        name=new_user.name,
        email=new_user.email,
        status=new_user.status,
        roles=get_user_roles(new_user),
    )


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles(*MANAGER_ROLES, "Platform Admin")),
):
    u = (
        db.query(User)
        .options(joinedload(User.roles).joinedload(UserRole.role))
        .filter(User.id == user_id, User.organization_id == current.organization_id)
        .first()
    )
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=u.id,
        organization_id=u.organization_id,
        client_id=u.client_id,
        name=u.name,
        email=u.email,
        status=u.status,
        roles=get_user_roles(u),
    )


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("Platform Admin")),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(u, k, v)
    db.commit()
    u = (
        db.query(User)
        .options(joinedload(User.roles).joinedload(UserRole.role))
        .filter(User.id == user_id)
        .first()
    )
    return UserResponse(
        id=u.id,
        organization_id=u.organization_id,
        client_id=u.client_id,
        name=u.name,
        email=u.email,
        status=u.status,
        roles=get_user_roles(u),
    )
