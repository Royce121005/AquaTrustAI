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


class DLTBatchAnchorRequest(BaseModel):
    batch_id: str
    record_hashes: List[str]
    facility_id: UUID
    key_id: Optional[str] = "key-ecdsa-p256-01"


class DLTBatchAnchorResponse(BaseModel):
    tx_id: str
    block_number: int
    channel_id: str
    chaincode: str
    docType: str
    batch_id: str
    merkle_root: str
    leaf_count: int
    facility_id: str
    signature_metadata: Optional[Dict[str, Any]] = None
    timestamp: str
    proofs: Dict[str, Any]
    status: str


class DLTBatchVerifyRequest(BaseModel):
    batch_id: str
    leaf_hash: str


class DLTBatchVerifyResponse(BaseModel):
    batch_id: str
    leaf_hash: str
    verified: bool
    merkle_root: Optional[str] = None
    message: str
