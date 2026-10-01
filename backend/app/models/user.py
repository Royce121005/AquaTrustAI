from enum import Enum
from uuid import uuid4
from sqlalchemy import Column, String, Index
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base, utc_now
from app.models.types import UTCDateTime


class UserRole(str, Enum):
    OPERATOR = "operator"
    AUDITOR = "auditor"
    REGULATORY_STAKEHOLDER = "regulatory_stakeholder"
    ADMIN = "admin"


class User(Base):
    """Represents system operators, auditors, regulatory stakeholders, and administrators."""

    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default=UserRole.OPERATOR.value)  # 'operator', 'auditor', 'regulatory_stakeholder', 'admin'
    external_subject = Column(String, unique=True, nullable=True)
    display_name = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")  # 'active', 'suspended', 'deactivated'
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)
    updated_at = Column(UTCDateTime, nullable=False, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        Index("ix_users_username", "username"),
        Index("ix_users_role", "role"),
    )

