"""AquaTrust AI — Authentication Schemas."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel, Field

from app.models.user import UserRole


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    role: UserRole
    facility_id: Optional[str] = None


class UserRegisterRequest(BaseModel):
    username: str
    email: Optional[str] = None
    password: str
    role: UserRole = UserRole.OPERATOR
    display_name: Optional[str] = None


class UserProfileResponse(BaseModel):
    user_id: Optional[UUID] = None
    username: str
    email: Optional[str] = None
    role: UserRole
    facility_id: Optional[str] = None
    display_name: Optional[str] = None
    status: Optional[str] = "active"
    created_at: Optional[datetime] = None

