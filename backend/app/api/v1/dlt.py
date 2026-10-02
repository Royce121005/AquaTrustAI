"""AquaTrust AI — DLT Anchors & Ledger Router."""

from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.base import utc_now
from app.db.session import get_db
from app.models.dlt_anchor import DLTAnchor
from app.models.treatment_record import TreatmentRecord
from app.models.cryptographic_artifact import CryptographicArtifact
from app.repositories.treatment_repository import TreatmentRepository
from app.dlt.gateway import dlt_gateway
from app.schemas.dlt import (
    DLTAnchorResponse,
    DLTReconcileResponse,
    DLTBatchAnchorRequest,
    DLTBatchAnchorResponse,
    DLTBatchVerifyRequest,
    DLTBatchVerifyResponse,
)
from app.core.security import get_current_user_claims, require_role

router = APIRouter(tags=["Distributed Ledger (DLT) Anchors"])


@router.get("/dlt/status", summary="Report Fabric or simulation transport status")
def get_dlt_status():
    """Expose whether the application is talking to Fabric or its local simulator."""
    return dlt_gateway.get_status()


@router.get(
    "/dlt/anchors",
    response_model=List[DLTAnchorResponse],
    summary="List DLT anchors across treatment records",
    dependencies=[Depends(get_current_user_claims)],
)
def list_dlt_anchors(
    facility_id: Optional[UUID] = None,
    anchor_status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Query DLT anchor records."""
    query = select(DLTAnchor)
    if facility_id:
        query = query.where(DLTAnchor.facility_id == facility_id)
    if anchor_status:
        query = query.where(DLTAnchor.anchor_status == anchor_status)

    query = query.order_by(desc(DLTAnchor.created_at)).offset(skip).limit(limit)
    rows = list(db.scalars(query).all())

    return [
        DLTAnchorResponse(
            anchor_id=r.anchor_id,
            record_id=r.record_id,
            certificate_id=r.certificate_id,
            facility_id=r.facility_id,
            event_timestamp=r.event_timestamp,
            canonical_hash=r.canonical_hash,
            compliance_status=r.compliance_status,
            signature_metadata=r.signature_metadata,
            network_reference=r.network_reference,
            anchor_status=r.anchor_status,
            transaction_id=r.transaction_id,
            block_number=(r.network_reference or {}).get("block_number"),
            anchored_at=r.confirmed_at,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post(
    "/dlt/anchors/{record_id}/reconcile",
    response_model=DLTReconcileResponse,
    summary="Reconcile local pending anchor with DLT network",
    dependencies=[Depends(require_role(["auditor", "regulatory_stakeholder", "admin"]))],
)
def reconcile_anchor(record_id: UUID, db: Session = Depends(get_db)):
    """Submits pending anchor to Fabric DLT Gateway and transitions state to anchored."""
    anchor = db.query(DLTAnchor).filter(DLTAnchor.record_id == record_id).first()
    if not anchor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Anchor for record {record_id} not found")

    # Finalization already submitted confirmed Fabric anchors. Return their original
    # transaction reference without creating a second ledger transaction.
    if anchor.anchor_status == "confirmed" and (anchor.network_reference or {}).get("mode") == "FABRIC":
        return DLTReconcileResponse(
            record_id=record_id, anchor_id=anchor.anchor_id,
            previous_status="confirmed", current_status="confirmed",
            transaction_id=anchor.transaction_id, ledger_mode="FABRIC",
            reconciled=bool(anchor.transaction_id),
        )

    prev_status = anchor.anchor_status
    crypto_art = db.query(CryptographicArtifact).filter(CryptographicArtifact.record_id == anchor.record_id).first()
    sig_value = crypto_art.signature_value if crypto_art else "sample_signature_b64"
    key_id = crypto_art.key_id if crypto_art else "key-ecdsa-p256-01"

    dlt_res = dlt_gateway.anchor_record(
        record_id=anchor.record_id,
        record_hash=anchor.canonical_hash,
        facility_id=anchor.facility_id,
        compliance_status=anchor.compliance_status,
        signature_value=sig_value,
        key_id=key_id,
    )

    ledger_mode = dlt_res.get("mode", "SIMULATION")
    if dlt_res.get("status") == "failed":
        anchor.anchor_status = "failed"
        anchor.failure_code = "FABRIC_SUBMISSION_FAILED"
    elif ledger_mode == "FABRIC":
        anchor.anchor_status = "confirmed"
        anchor.failure_code = None
    else:
        # A local simulation is not a committed Fabric anchor, so keep the
        # persisted status pending and expose the simulation reference/mode.
        anchor.anchor_status = "pending"
    anchor.transaction_id = dlt_res["tx_id"]
    anchor.network_reference = {
        "channel": dlt_res.get("channel_id", "aquatrust-channel"),
        "chaincode": dlt_res.get("chaincode", "aquatrust-records"),
        "block_number": dlt_res.get("block_number"),
        "simulation_sequence": dlt_res.get("simulation_sequence"),
        "mode": ledger_mode,
        "distributed_ledger": ledger_mode == "FABRIC" and dlt_res.get("status") != "failed",
        "simulation_reference": dlt_res.get("simulation_reference"),
    }
    anchor.confirmed_at = utc_now() if ledger_mode == "FABRIC" and dlt_res.get("status") != "failed" else None
    anchor.submitted_at = utc_now()
    db.commit()

    return DLTReconcileResponse(
        record_id=record_id,
        anchor_id=anchor.anchor_id,
        previous_status=prev_status,
        current_status="simulated" if ledger_mode == "SIMULATION" else anchor.anchor_status,
        transaction_id=anchor.transaction_id,
        ledger_mode=ledger_mode,
        failure=dlt_res.get("failure"),
        reconciled=dlt_res.get("status") != "failed",
    )


@router.get(
    "/dlt/anchors/hash/{canonical_hash}",
    summary="Query DLT anchor by canonical SHA-256 hash",
    dependencies=[Depends(get_current_user_claims)],
)
def get_anchor_by_hash(canonical_hash: str):
    """Lookup anchor by canonical hash across ledger state."""
    anchor = dlt_gateway.query_anchor_by_hash(canonical_hash)
    if not anchor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No anchor found matching canonical hash {canonical_hash}")
    return anchor


@router.get("/dlt/ledger/records/{record_id}", summary="Read an anchor from Fabric or simulation state")
def get_ledger_anchor(record_id: UUID):
    anchor = dlt_gateway.query_record_anchor(record_id)
    if not anchor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No ledger anchor found for record {record_id}")
    return anchor


@router.get("/dlt/ledger/history/{record_id}", summary="Read immutable Fabric transaction history for a record anchor")
def get_ledger_history(record_id: UUID):
    history = dlt_gateway.query_anchor_history(record_id)
    if not history:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No anchor history found for record {record_id}")
    return {"record_id": str(record_id), "mode": dlt_gateway.mode, "distributed_ledger": dlt_gateway.mode == "FABRIC", "history": history}


@router.get("/dlt/batches/records/{record_id}", summary="Look up the batch commitment containing a record")
def get_record_batch(record_id: UUID):
    mapping = dlt_gateway.query_batch_for_record(str(record_id))
    if not mapping:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No batch mapping found for record {record_id}")
    return {**mapping, "mode": dlt_gateway.mode, "distributed_ledger": dlt_gateway.mode == "FABRIC"}


@router.post(
    "/dlt/batch-anchor",
    response_model=DLTBatchAnchorResponse,
    summary="Anchor a batch of telemetry hashes via RFC 6962 Merkle tree",
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
def anchor_batch(payload: DLTBatchAnchorRequest):
    """Computes Merkle root and anchors batch to DLT ledger."""
    try:
        res = dlt_gateway.anchor_batch(
            batch_id=payload.batch_id,
            record_hashes=payload.record_hashes,
            record_ids=payload.record_ids,
            facility_id=payload.facility_id,
            key_id=payload.key_id or "key-ecdsa-p256-01",
        )
        return DLTBatchAnchorResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@router.post(
    "/dlt/batch-verify",
    response_model=DLTBatchVerifyResponse,
    summary="Verify whether a telemetry hash is included in an anchored Merkle batch",
)
def verify_batch_leaf(payload: DLTBatchVerifyRequest):
    """Verifies Merkle audit inclusion proof without fetching whole batch."""
    is_valid = dlt_gateway.verify_batch_leaf(payload.batch_id, payload.leaf_hash)
    batch = dlt_gateway.query_batch(payload.batch_id)
    root = (batch.get("merkle_root") or batch.get("merkleRoot")) if batch else None

    return DLTBatchVerifyResponse(
        batch_id=payload.batch_id,
        leaf_hash=payload.leaf_hash,
        verified=is_valid,
        merkle_root=root,
        mode=dlt_gateway.mode,
        distributed_ledger=dlt_gateway.mode == "FABRIC",
        message="Leaf hash cryptographically verified in batch" if is_valid else "Leaf hash not found or proof invalid",
    )


@router.get(
    "/dlt/transactions/{tx_id}",
    summary="Query DLT transaction by transaction ID",
    dependencies=[Depends(get_current_user_claims)],
)
def get_dlt_transaction(tx_id: str):
    """Query transaction details from DLT ledger."""
    tx = dlt_gateway.query_transaction(tx_id)
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction {tx_id} not found on DLT ledger")
    return tx

