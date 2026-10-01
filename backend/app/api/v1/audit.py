"""AquaTrust AI — Immutable Audit Log Router."""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query

from app.repositories.audit_repository import AuditLogRepository
from app.repositories.deps import get_audit_repository
from app.schemas.audit import AuditLogResponse, AuditLogListResponse
from app.core.security import require_role

router = APIRouter(tags=["Security & Compliance Audit Logs"])


@router.get(
    "/audit-events",
    response_model=AuditLogListResponse,
    summary="Query audit log entries with action, actor, and resource filters",
    dependencies=[Depends(require_role(["auditor", "regulatory_stakeholder", "admin"]))],
)
def list_audit_events(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    actor_id: Optional[UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    audit_repo: AuditLogRepository = Depends(get_audit_repository),
):
    """Retrieve structured audit trail entries."""
    rows = audit_repo.list_events(
        action=action,
        resource_type=resource_type,
        actor_id=actor_id,
        skip=skip,
        limit=limit,
    )
    total_count = audit_repo.count_events(
        action=action,
        resource_type=resource_type,
        actor_id=actor_id,
    )

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
        total_count=total_count,
        logs=logs,
    )
