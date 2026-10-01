"""AquaTrust AI — Authentication Router."""

from datetime import timedelta
from typing import Optional, Dict, Any, List
from uuid import uuid4, UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.base import utc_now
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user_claims,
    require_role,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    UserRegisterRequest,
    UserProfileResponse,
)

router = APIRouter(tags=["Authentication & RBAC"])


# In-memory demo/test user fallback definitions
DEMO_USERS = {
    "admin": {
        "hashed_password": get_password_hash("admin123"),
        "role": UserRole.ADMIN.value,
        "email": "admin@aquatrust.internal",
        "display_name": "System Administrator",
        "facility_id": None,
    },
    "operator": {
        "hashed_password": get_password_hash("operator123"),
        "role": UserRole.OPERATOR.value,
        "email": "operator@aquatrust.internal",
        "display_name": "Plant Operator",
        "facility_id": "FAC-CPCB-001",
    },
    "auditor": {
        "hashed_password": get_password_hash("auditor123"),
        "role": UserRole.AUDITOR.value,
        "email": "auditor@cpcb.gov.in",
        "display_name": "Compliance Auditor",
        "facility_id": None,
    },
    "regulator": {
        "hashed_password": get_password_hash("regulator123"),
        "role": UserRole.REGULATORY_STAKEHOLDER.value,
        "email": "regulator@cpcb.gov.in",
        "display_name": "CPCB Regulatory Inspector",
        "facility_id": None,
    },
}


def seed_default_users(db: Session) -> List[User]:
    """Seed standard system user accounts into the database if they do not exist."""
    user_repo = UserRepository(db)
    seeded: List[User] = []
    for username, data in DEMO_USERS.items():
        existing = user_repo.get_by_username(username)
        if not existing:
            user = User(
                user_id=uuid4(),
                username=username,
                email=data["email"],
                hashed_password=data["hashed_password"],
                role=data["role"],
                display_name=data["display_name"],
                status="active",
                created_at=utc_now(),
            )
            user_repo.create(user)
            seeded.append(user)
    if seeded:
        db.commit()
    return seeded


@router.post(
    "/auth/login",
    response_model=LoginResponse,
    summary="Authenticate user and obtain JWT access token",
)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Validates user credentials against database or demo accounts."""
    seed_default_users(db)

    user_repo = UserRepository(db)
    user = user_repo.get_by_username(payload.username)

    if user:
        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id_str = str(user.user_id)
        role_val = user.role
        email = user.email
        display_name = user.display_name or user.username
        facility_id = "FAC-CPCB-001" if role_val == UserRole.OPERATOR.value else None
    elif payload.username in DEMO_USERS:
        demo = DEMO_USERS[payload.username]
        if not verify_password(payload.password, demo["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id_str = str(uuid4())
        role_val = demo["role"]
        email = demo["email"]
        display_name = demo["display_name"]
        facility_id = demo["facility_id"]
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    claims = {
        "sub": payload.username,
        "user_id": user_id_str,
        "username": payload.username,
        "email": email,
        "role": role_val,
        "facility_id": facility_id,
        "display_name": display_name,
    }
    token = create_access_token(
        data=claims,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user_id=user_id_str,
        username=payload.username,
        role=UserRole(role_val),
        facility_id=facility_id,
    )


@router.get(
    "/auth/me",
    response_model=UserProfileResponse,
    summary="Get current user authentication claims and role permissions",
)
def get_current_user_profile(
    claims: Dict[str, Any] = Depends(get_current_user_claims),
    db: Session = Depends(get_db),
):
    """Retrieve current authenticated user profile and roles."""
    user_id_raw = claims.get("user_id")
    user_id = UUID(user_id_raw) if user_id_raw and isinstance(user_id_raw, str) else user_id_raw
    username = claims.get("username") or claims.get("sub", "")
    email = claims.get("email")
    role_str = claims.get("role", UserRole.OPERATOR.value)
    if isinstance(role_str, UserRole):
        role_val = role_str
    else:
        role_val = UserRole(role_str)
    facility_id = claims.get("facility_id") or ("FAC-CPCB-001" if role_val == UserRole.OPERATOR else None)
    display_name = claims.get("display_name") or username

    if db and username:
        user_repo = UserRepository(db)
        user = user_repo.get_by_username(username)
        if user:
            return UserProfileResponse(
                user_id=user.user_id,
                username=user.username,
                email=user.email or email,
                role=UserRole(user.role),
                facility_id=facility_id,
                display_name=user.display_name or display_name,
                status=user.status,
                created_at=user.created_at,
            )

    return UserProfileResponse(
        user_id=user_id,
        username=username,
        email=email,
        role=role_val,
        facility_id=facility_id,
        display_name=display_name,
        status="active",
        created_at=utc_now(),
    )


@router.post(
    "/auth/register",
    response_model=UserProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account with role",
    dependencies=[Depends(require_role([UserRole.ADMIN, "admin"]))],
)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """Create a new user in the database (admin only)."""
    user_repo = UserRepository(db)
    existing = user_repo.get_by_username(payload.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username {payload.username} already registered",
        )

    role_val = payload.role.value if isinstance(payload.role, UserRole) else str(payload.role)
    user = User(
        user_id=uuid4(),
        username=payload.username,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=role_val,
        display_name=payload.display_name or payload.username,
        status="active",
        created_at=utc_now(),
    )
    user_repo.create(user)
    db.commit()
    db.refresh(user)

    return UserProfileResponse(
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        role=UserRole(user.role),
        facility_id="FAC-CPCB-001" if user.role == UserRole.OPERATOR.value else None,
        display_name=user.display_name,
        status=user.status,
        created_at=user.created_at,
    )

