"""AquaTrust AI — Audit Log Repository."""

from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func

from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    """Repository handling append-only security and operational audit logs."""

    def __init__(self, db: Session):
        super().__init__(db, AuditLog)

    def log_event(
        self,
        action: str,
        resource_type: str,
        actor_id: Optional[UUID] = None,
        actor_role: Optional[str] = None,
        resource_id: Optional[UUID] = None,
        request_id: Optional[str] = None,
        outcome: str = "success",
        metadata: Optional[dict] = None,
    ) -> AuditLog:
        """Persist an append-only audit log entry."""
        audit_entry = AuditLog(
            actor_id=actor_id,
            actor_role=actor_role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            request_id=request_id,
            outcome=outcome,
            audit_metadata=metadata or {},
        )
        return self.create(audit_entry)

    def list_events(
        self,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        actor_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[AuditLog]:
        """Query audit log entries with multi-dimensional filtering."""
        stmt = select(AuditLog)
        if action:
            stmt = stmt.where(AuditLog.action == action)
        if resource_type:
            stmt = stmt.where(AuditLog.resource_type == resource_type)
        if actor_id:
            stmt = stmt.where(AuditLog.actor_id == actor_id)

        stmt = stmt.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_events(
        self,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        actor_id: Optional[UUID] = None,
    ) -> int:
        """Count audit log entries matching filters for pagination metadata."""
        stmt = select(func.count()).select_from(AuditLog)
        if action:
            stmt = stmt.where(AuditLog.action == action)
        if resource_type:
            stmt = stmt.where(AuditLog.resource_type == resource_type)
        if actor_id:
            stmt = stmt.where(AuditLog.actor_id == actor_id)
        return self.db.scalar(stmt) or 0

    def update(self, entity: AuditLog) -> AuditLog:
        """Enforce immutability invariant on audit log entries."""
        raise NotImplementedError("Audit logs are append-only and immutable; updates are prohibited.")

    def delete(self, id: UUID) -> bool:
        """Enforce immutability invariant on audit log entries."""
        raise NotImplementedError("Audit logs are append-only and immutable; deletions are prohibited.")
