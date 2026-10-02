"""AquaTrust AI — DLT Schemas."""

from datetime import datetime
from typing import Optional, Dict, Any, List, Union
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
    transaction_id: Optional[str] = None
    ledger_mode: str = "SIMULATION"
    failure: Optional[str] = None
    reconciled: bool


class DLTBatchAnchorRequest(BaseModel):
    batch_id: Optional[str] = None
    record_hashes: List[str]
    record_ids: Optional[List[str]] = None
    facility_id: Union[UUID, str]
    key_id: Optional[str] = "key-ecdsa-p256-01"


class DLTBatchAnchorResponse(BaseModel):
    tx_id: Optional[str] = None
    simulation_reference: Optional[str] = None
    block_number: Optional[int] = None
    channel_id: str
    chaincode: str
    docType: str
    batch_id: str
    merkle_root: str
    leaf_count: int
    record_ids: Optional[List[str]] = None
    facility_id: str
    signature_metadata: Optional[Dict[str, Any]] = None
    timestamp: str
    proofs: Dict[str, Any]
    status: str
    mode: str
    distributed_ledger: bool


class DLTBatchVerifyRequest(BaseModel):
    batch_id: str
    leaf_hash: str


class DLTBatchVerifyResponse(BaseModel):
    batch_id: str
    leaf_hash: str
    verified: bool
    merkle_root: Optional[str] = None
    mode: str = "SIMULATION"
    distributed_ledger: bool = False
    message: str
