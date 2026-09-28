"""AquaTrust AI — Append-Only Corrections Router."""

from typing import List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.correction import Correction
from app.services.correction_service import CorrectionService
from app.schemas.correction import (
    ProposeCorrectionRequest,
    AuthorizeCorrectionRequest,
    CorrectionResponse,
    CorrectionChainResponse,
    CorrectionChainNode,
)

router = APIRouter(tags=["Append-Only Lineage & Corrections"])


@router.post(
    "/corrections/propose",
    response_model=CorrectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Propose an append-only correction for a finalized record",
)
def propose_correction(payload: ProposeCorrectionRequest, db: Session = Depends(get_db)):
    """Propose a correction without mutating the original record."""
    try:
        proposer_uuid = uuid4()
        corr = CorrectionService.propose_correction(
            db=db,
            original_record_id=payload.original_record_id,
            reason=payload.reason,
            justification_code=payload.justification_code,
            corrected_parameters=payload.corrected_parameters,
            proposer_id=proposer_uuid,
        )
        db.commit()
        db.refresh(corr)

        return CorrectionResponse(
            correction_id=corr.correction_id,
            original_record_id=corr.original_record_id,
            superseding_record_id=None,
            status=corr.status,
            justification_code=payload.justification_code,
            reason=payload.reason,
            proposed_changes=corr.proposed_changes or {},
            proposer_id=str(corr.requested_by),
            authorized_by=str(corr.authorized_by) if corr.authorized_by else None,
            authorized_at=corr.authorized_at,
            created_at=corr.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/corrections/{correction_id}/authorize",
    response_model=CorrectionResponse,
    summary="Authorize correction: marks original superseded and generates new versioned record",
)
def authorize_correction(
    correction_id: UUID,
    payload: AuthorizeCorrectionRequest,
    db: Session = Depends(get_db),
):
    """Authorize a proposed correction."""
    try:
        auth_uuid = uuid4()
        new_record = CorrectionService.authorize_correction(
            db=db,
            correction_id=correction_id,
            authorized_by=auth_uuid,
            key_id=payload.key_id or "key-ecdsa-p256-01",
        )
        db.commit()

        corr = db.query(Correction).filter(Correction.correction_id == correction_id).first()
        return CorrectionResponse(
            correction_id=corr.correction_id,
            original_record_id=corr.original_record_id,
            superseding_record_id=new_record.record_id,
            status=corr.status,
            justification_code=corr.proposed_changes.get("justification_code", "UNKNOWN") if corr.proposed_changes else "UNKNOWN",
            reason=corr.reason or "",
            proposed_changes=corr.proposed_changes or {},
            proposer_id=str(corr.requested_by),
            authorized_by=str(corr.authorized_by) if corr.authorized_by else None,
            authorized_at=corr.authorized_at,
            created_at=corr.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/corrections/chain/{record_id}",
    response_model=CorrectionChainResponse,
    summary="Get complete append-only provenance chain for a treatment record",
)
def get_correction_chain(record_id: UUID, db: Session = Depends(get_db)):
    """Fetch complete immutable lineage history."""
    chain_records = CorrectionService.get_correction_chain(db, record_id)
    if not chain_records:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No lineage found for record {record_id}")

    nodes = [
        CorrectionChainNode(
            record_id=r.record_id,
            record_version=r.record_version,
            record_state=r.record_state,
            canonical_hash=r.canonical_hash,
            supersedes_record_id=r.supersedes_record_id,
            correction_id=None,
            created_at=r.created_at,
        )
        for r in chain_records
    ]

    return CorrectionChainResponse(
        original_record_id=chain_records[0].record_id,
        total_versions=len(chain_records),
        chain=nodes,
    )
