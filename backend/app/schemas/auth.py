"""AquaTrust AI — Authentication Schemas."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    role: str
    facility_id: Optional[str] = None


class UserRegisterRequest(BaseModel):
    username: str
    email: Optional[str] = None
    password: str
    role: str = "operator"  # "operator", "auditor", "regulatory_stakeholder", "admin"
    display_name: Optional[str] = None


class UserProfileResponse(BaseModel):
    user_id: UUID
    username: str
    email: Optional[str] = None
    role: str
    display_name: Optional[str] = None
    status: str
    created_at: datetime
