"""AquaTrust AI — Treatment Record Schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class TreatmentRecordFinalizeRequest(BaseModel):
    """Payload to trigger aggregation and immutable record finalization."""
    facility_id: UUID
    period_start: datetime
    period_end: datetime
    key_id: Optional[str] = "key-ecdsa-p256-01"


class TreatmentRecordResponse(BaseModel):
    """Detailed treatment record representation."""
    record_id: UUID
    facility_id: UUID
    period_start: datetime
    period_end: datetime
    record_version: int
    record_state: str
    quality_status: str
    anomaly_status: str
    compliance_status: str
    canonical_hash: Optional[str] = None
    certificate_id: Optional[UUID] = None
    signature_id: Optional[UUID] = None
    anchor_status: str
    supersedes_record_id: Optional[UUID] = None
    provenance: Optional[Dict[str, Any]] = None
    evidence_snapshot: Optional[Dict[str, Any]] = None
    created_at: datetime
    finalized_at: Optional[datetime] = None
