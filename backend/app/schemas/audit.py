"""AquaTrust AI — Audit Log Schemas."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel, Field


class AuditLogResponse(BaseModel):
    audit_log_id: UUID
    timestamp: datetime
    actor_id: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[UUID] = None
    outcome: str
    details: Optional[Dict[str, Any]] = None


class AuditLogListResponse(BaseModel):
    total_count: int
    logs: List[AuditLogResponse]


class AuditTimelineItem(BaseModel):
    audit_log_id: UUID
    timestamp: datetime
    category: str  # "TELEMETRY", "ANOMALY", "PREDICTION", "RECOMMENDATION", "COMPLIANCE", "CORRECTION", "FINALIZATION", "CALIBRATION", "SECURITY"
    action: str
    actor_id: Optional[str] = None
    actor_role: Optional[str] = None
    resource_type: str
    resource_id: Optional[UUID] = None
    outcome: str
    summary: str
    details: Optional[Dict[str, Any]] = None


class AuditTimelineResponse(BaseModel):
    facility_id: Optional[UUID] = None
    total_events: int
    timeline: List[AuditTimelineItem]

