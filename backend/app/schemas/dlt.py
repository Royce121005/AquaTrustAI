"""AquaTrust AI — DLT Schemas."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel, Field


class DLTAnchorResponse(BaseModel):
    anchor_id: UUID
    record_id: UUID
    certificate_id: Optional[UUID] = None
    facility_id: UUID
    event_timestamp: datetime
    canonical_hash: str
    compliance_status: str
    signature_metadata: Optional[Dict[str, Any]] = None
    network_reference: Optional[Dict[str, Any]] = None
    anchor_status: str  # "pending", "anchored", "failed"
    transaction_id: Optional[str] = None
    block_number: Optional[int] = None
    anchored_at: Optional[datetime] = None
    created_at: datetime


class DLTReconcileResponse(BaseModel):
    record_id: UUID
    anchor_id: UUID
    previous_status: str
    current_status: str
    transaction_id: str
    reconciled: bool
