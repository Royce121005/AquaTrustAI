"""AquaTrust AI — Authentication & Role-Based Access Control (RBAC) Module.

Provides JWT token issuance, verification, password hashing, and role-based route guards.
Supports 4 core RBAC roles:
- operator: Telemetry ingestion, operational view, manual validation
- auditor: Read-only compliance and verification access, audit logs
- regulatory_stakeholder: Finalized records, compliance certificates, DLT proofs
- admin: Full administrative and configuration privileges
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List, Union
import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

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
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
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


def get_current_user_claims(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> Dict[str, Any]:
    """Extract authenticated user claims from Authorization header, fallback to default claims in testing."""
    if credentials is None:
        # For development / unauthenticated fallback, provide default operator claims
        return {
            "sub": "system_operator",
            "username": "operator",
            "role": "operator",
            "facility_id": "FAC-CPCB-001",
        }
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


def require_role(allowed_roles: List[str]):
    """FastAPI dependency to enforce RBAC permissions."""
    def role_checker(claims: Dict[str, Any] = Depends(get_current_user_claims)) -> Dict[str, Any]:
        user_role = claims.get("role", "operator")
        if user_role not in allowed_roles and user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of roles {allowed_roles}",
            )
        return claims
    return role_checker
