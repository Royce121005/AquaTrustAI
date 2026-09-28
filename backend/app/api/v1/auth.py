"""AquaTrust AI — Authentication Router."""

from datetime import timedelta
from typing import Optional, Dict, Any
from uuid import uuid4, UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.base import utc_now
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user_claims,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    UserRegisterRequest,
    UserProfileResponse,
)

router = APIRouter(tags=["Authentication & RBAC"])


# In-memory demo/test user fallback
DEMO_USERS = {
    "admin": {
        "hashed_password": get_password_hash("admin123"),
        "role": "admin",
        "email": "admin@aquatrust.internal",
        "facility_id": None,
    },
    "operator": {
        "hashed_password": get_password_hash("operator123"),
        "role": "operator",
        "email": "operator@aquatrust.internal",
        "facility_id": "FAC-CPCB-001",
    },
    "auditor": {
        "hashed_password": get_password_hash("auditor123"),
        "role": "auditor",
        "email": "auditor@cpcb.gov.in",
        "facility_id": None,
    },
    "regulator": {
        "hashed_password": get_password_hash("regulator123"),
        "role": "regulatory_stakeholder",
        "email": "regulator@cpcb.gov.in",
        "facility_id": None,
    },
}


@router.post(
    "/auth/login",
    response_model=LoginResponse,
    summary="Authenticate user and obtain JWT access token",
)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Validates user credentials against database or demo accounts."""
    user_repo = UserRepository(db)
    user = user_repo.get_by_username(payload.username)

    if user:
        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
            )
        user_id_str = str(user.user_id)
        role = user.role
        facility_id = None
    elif payload.username in DEMO_USERS:
        demo = DEMO_USERS[payload.username]
        if not verify_password(payload.password, demo["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
            )
        user_id_str = str(uuid4())
        role = demo["role"]
        facility_id = demo["facility_id"]
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    claims = {
        "sub": payload.username,
        "user_id": user_id_str,
        "username": payload.username,
        "role": role,
        "facility_id": facility_id,
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
        role=role,
        facility_id=facility_id,
    )


@router.get(
    "/auth/me",
    summary="Get current user authentication claims and role permissions",
)
def get_current_user_profile(claims: Dict[str, Any] = Depends(get_current_user_claims)):
    """Retrieve current authenticated user profile and roles."""
    return claims


@router.post(
    "/auth/register",
    response_model=UserProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account with role",
)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """Create a new user in the database."""
    user_repo = UserRepository(db)
    existing = user_repo.get_by_username(payload.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username {payload.username} already registered",
        )

    user = User(
        user_id=uuid4(),
        username=payload.username,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
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
        role=user.role,
        display_name=user.display_name,
        status=user.status,
        created_at=user.created_at,
    )
