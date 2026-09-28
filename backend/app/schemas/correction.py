"""AquaTrust AI — Correction Schemas."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel, Field


class ProposeCorrectionRequest(BaseModel):
    original_record_id: UUID
    reason: str
    justification_code: str  # e.g., "SENSOR_RECALIBRATION", "LAB_CONFIRMATORY_OVERRIDE", "DATA_TRANSMISSION_ERROR"
    corrected_parameters: Dict[str, float]
    supporting_evidence_url: Optional[str] = None
    proposer_id: Optional[str] = "operator_unit_01"


class AuthorizeCorrectionRequest(BaseModel):
    authorized_by: str
    comments: Optional[str] = None
    key_id: Optional[str] = "key-ecdsa-p256-01"


class CorrectionResponse(BaseModel):
    correction_id: UUID
    original_record_id: UUID
    superseding_record_id: Optional[UUID] = None
    status: str  # "proposed", "authorized", "rejected"
    justification_code: str
    reason: str
    proposed_changes: Dict[str, Any]
    proposer_id: str
    authorized_by: Optional[str] = None
    authorized_at: Optional[datetime] = None
    created_at: datetime


class CorrectionChainNode(BaseModel):
    record_id: UUID
    record_version: int
    record_state: str
    canonical_hash: Optional[str] = None
    supersedes_record_id: Optional[UUID] = None
    correction_id: Optional[UUID] = None
    created_at: datetime


class CorrectionChainResponse(BaseModel):
    original_record_id: UUID
    total_versions: int
    chain: List[CorrectionChainNode]
