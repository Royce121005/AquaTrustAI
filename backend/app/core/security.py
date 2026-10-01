"""AquaTrust AI — Authentication & Role-Based Access Control (RBAC) Module.

Provides JWT token issuance, verification, password hashing, and role-based route guards.
Supports 4 core RBAC roles:
- operator: Telemetry ingestion, operational view, manual validation
- auditor: Read-only compliance and verification access, audit logs
- regulatory_stakeholder: Finalized records, compliance certificates, DLT proofs
- admin: Full administrative and configuration privileges
"""

import os
from enum import Enum
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List, Union, Sequence
import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User, UserRole

# JWT HTTP Bearer security scheme
security_scheme = HTTPBearer(auto_error=False)

JWT_SECRET_KEY = getattr(settings, "JWT_SECRET_KEY", "aquatrust-ai-secure-secret-key-2026-production-v1")
JWT_ALGORITHM = getattr(settings, "JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 480)  # 8 hours


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate bcrypt password hash."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create signed JWT access token."""
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    if expires_delta:
        expire = now_utc + expires_delta
    else:
        expire = now_utc + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now_utc})
    if "role" in to_encode and isinstance(to_encode["role"], Enum):
        to_encode["role"] = to_encode["role"].value
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            options={"verify_signature": True, "verify_exp": True},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user_claims(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> Dict[str, Any]:
    """Extract authenticated user claims from Authorization header."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    return decode_access_token(token)


def get_current_user(
    claims: Dict[str, Any] = Depends(get_current_user_claims),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Retrieve full User model from database using token claims."""
    username = claims.get("username") or claims.get("sub")
    if not username:
        return None
    user = db.query(User).filter(User.username == username).first()
    return user


def require_role(allowed_roles: Union[Sequence[Union[UserRole, str]], Union[UserRole, str]]):
    """FastAPI dependency to enforce RBAC permissions."""
    if isinstance(allowed_roles, (str, UserRole)):
        roles_list = [allowed_roles]
    else:
        roles_list = list(allowed_roles)

    normalized_allowed_roles = [
        r.value if isinstance(r, Enum) else str(r) for r in roles_list
    ]

    def role_checker(claims: Dict[str, Any] = Depends(get_current_user_claims)) -> Dict[str, Any]:
        user_role = claims.get("role")
        if isinstance(user_role, Enum):
            user_role = user_role.value

        if user_role not in normalized_allowed_roles and user_role != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of roles {normalized_allowed_roles}",
            )
        return claims

    return role_checker

