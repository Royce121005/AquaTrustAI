"""AquaTrust AI — Digital Treatment Certificate Schemas."""

from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel


class CertificateResponse(BaseModel):
    """Digital Treatment Certificate representation."""
    certificate_id: UUID
    record_id: UUID
    certificate_version: str
    issuer_identity: str
    issued_at: datetime
    compliance_summary: Dict[str, Any]
    canonical_hash: str
    signature_id: UUID
    dlt_anchor_id: Optional[UUID] = None
    status: str
    facility_id: Optional[UUID] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    quality_status: Optional[str] = None
    anomaly_status: Optional[str] = None
    compliance_status: Optional[str] = None
