"""AquaTrust AI — Verification Schemas."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel, Field


class StageVerificationDetail(BaseModel):
    stage_name: str
    status: str  # "passed", "failed", "skipped"
    details: Dict[str, Any] = Field(default_factory=dict)
    latency_ms: Optional[float] = None


class VerificationResultResponse(BaseModel):
    record_id: UUID
    overall_verdict: str  # "VERIFIED", "TAMPER_DETECTED", "SIGNATURE_INVALID", "DLT_MISMATCH", "UNVERIFIED"
    verification_timestamp: datetime
    stages: Dict[str, StageVerificationDetail]
    canonical_hash: str
    dlt_tx_id: Optional[str] = None
    tamper_details: Optional[Dict[str, Any]] = None


class VerifyProofRequest(BaseModel):
    canonical_payload: Dict[str, Any]
    canonical_hash: str
    signature: str
    public_key_pem: str
    key_id: str


class VerifyProofResponse(BaseModel):
    hash_valid: bool
    signature_valid: bool
    verdict: str
    message: str


class PublicKeyResponse(BaseModel):
    key_id: str
    algorithm: str
    curve: str
    public_key_pem: str
    fingerprint: str
    status: str
    created_at: datetime
