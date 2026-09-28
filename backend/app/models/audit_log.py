"""AquaTrust AI — Audit Log ORM Model."""

from uuid import uuid4
from sqlalchemy import Column, String, Index
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class AuditLog(Base):
    """Represents append-only audit trail for all governance and mutation events."""

    __tablename__ = "audit_logs"

    audit_log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    actor_id = Column(UUID(as_uuid=True), nullable=True)
    actor_role = Column(String, nullable=True)
    action = Column(String, nullable=False)  # 'RECORD_FINALIZED', 'CORRECTION_REQUESTED', etc.
    resource_type = Column(String, nullable=False)  # 'treatment_record', 'certificate', 'user'
    resource_id = Column(UUID(as_uuid=True), nullable=True)
    request_id = Column(String, nullable=True)
    outcome = Column(String, nullable=False, default="success")  # 'success', 'failure', 'denied'
    audit_metadata = Column("metadata", JSONField, nullable=True, default=dict)
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)

    __table_args__ = (
        Index("ix_audit_logs_action_created", "action", "created_at"),
        Index("ix_audit_logs_resource", "resource_type", "resource_id"),
    )
