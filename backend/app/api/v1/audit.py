"""AquaTrust AI — Immutable Audit Log Router."""

from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.schemas.audit import AuditLogResponse, AuditLogListResponse

router = APIRouter(tags=["Security & Compliance Audit Logs"])


@router.get(
    "/audit-events",
    response_model=AuditLogListResponse,
    summary="Query audit log entries with action, actor, and resource filters",
)
def list_audit_events(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    actor_id: Optional[UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Retrieve structured audit trail entries."""
    query = select(AuditLog)
    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    if actor_id:
        query = query.where(AuditLog.actor_id == actor_id)

    query = query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
    rows = list(db.scalars(query).all())

    logs = [
        AuditLogResponse(
            audit_log_id=r.audit_log_id,
            timestamp=r.created_at,
            actor_id=str(r.actor_id) if r.actor_id else None,
            actor_role=r.actor_role,
            action=r.action,
            resource_type=r.resource_type,
            resource_id=r.resource_id,
            outcome=r.outcome,
            details=r.audit_metadata,
        )
        for r in rows
    ]

    return AuditLogListResponse(
        total_count=len(logs),
        logs=logs,
    )
