"""AquaTrust AI — Immutable Audit Log Router."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.audit_repository import AuditLogRepository
from app.repositories.deps import get_audit_repository
from app.schemas.audit import AuditLogResponse, AuditLogListResponse, AuditTimelineResponse
from app.core.security import require_role
from app.services.audit_service import AuditService

router = APIRouter(tags=["Security & Compliance Audit Logs"])


@router.get(
    "/audit/timeline",
    response_model=AuditTimelineResponse,
    summary="Get unified chronological lifecycle audit trail",
    dependencies=[Depends(require_role(["auditor", "regulatory_stakeholder", "admin", "operator"]))],
)
def get_audit_timeline(
    facility_id: Optional[UUID] = Query(None, description="Optional facility filter"),
    from_date: Optional[datetime] = Query(None, description="Start date filter"),
    to_date: Optional[datetime] = Query(None, description="End date filter"),
    category: Optional[str] = Query(None, description="Filter category e.g. TELEMETRY, ANOMALY, PREDICTION, RECOMMENDATION, COMPLIANCE, CORRECTION, FINALIZATION"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Retrieves an interactive visual timeline of all operational, AI, and verification events."""
    service = AuditService(db)
    return service.get_audit_timeline(
        facility_id=facility_id,
        from_date=from_date,
        to_date=to_date,
        category=category,
        limit=limit,
    )



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
