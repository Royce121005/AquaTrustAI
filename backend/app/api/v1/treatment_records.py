"""AquaTrust AI — Treatment Records Router."""

from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.treatment_record import TreatmentRecord
from app.repositories.treatment_repository import TreatmentRepository
from app.services.treatment_service import TreatmentService
from app.schemas.treatment import (
    TreatmentRecordFinalizeRequest,
    TreatmentRecordResponse,
)

router = APIRouter(tags=["Treatment Records & Finalization"])


@router.post(
    "/treatment-records/finalize",
    response_model=TreatmentRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Aggregate and finalize a treatment window",
)
def finalize_treatment_window(
    payload: TreatmentRecordFinalizeRequest,
    db: Session = Depends(get_db),
):
    """Aggregate readings, evaluate compliance, and finalize an immutable treatment record."""
    record = TreatmentService.aggregate_window(
        db=db,
        facility_id=payload.facility_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
    )

    finalized = TreatmentService.finalize_record(
        db=db,
        record=record,
        key_id=payload.key_id or "key-ecdsa-p256-01",
    )
    db.commit()
    db.refresh(finalized)

    return TreatmentRecordResponse(
        record_id=finalized.record_id,
        facility_id=finalized.facility_id,
        period_start=finalized.period_start,
        period_end=finalized.period_end,
        record_version=finalized.record_version,
        record_state=finalized.record_state,
        quality_status=finalized.quality_status,
        anomaly_status=finalized.anomaly_status,
        compliance_status=finalized.compliance_status,
        canonical_hash=finalized.canonical_hash,
        certificate_id=finalized.certificate_id,
        signature_id=finalized.signature_id,
        anchor_status=finalized.anchor_status,
        supersedes_record_id=finalized.supersedes_record_id,
        evidence_snapshot=finalized.evidence_snapshot,
        created_at=finalized.created_at,
        finalized_at=finalized.finalized_at,
    )


@router.get(
    "/treatment-records",
    response_model=List[TreatmentRecordResponse],
    summary="List treatment records",
)
def list_treatment_records(
    facility_id: Optional[UUID] = None,
    record_state: Optional[str] = None,
    compliance_status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Query treatment records with state and compliance filtering."""
    treatment_repo = TreatmentRepository(db)
    records = treatment_repo.list_records(
        facility_id=facility_id,
        record_state=record_state,
        compliance_status=compliance_status,
        skip=skip,
        limit=limit,
    )
    return [
        TreatmentRecordResponse(
            record_id=r.record_id,
            facility_id=r.facility_id,
            period_start=r.period_start,
            period_end=r.period_end,
            record_version=r.record_version,
            record_state=r.record_state,
            quality_status=r.quality_status,
            anomaly_status=r.anomaly_status,
            compliance_status=r.compliance_status,
            canonical_hash=r.canonical_hash,
            certificate_id=r.certificate_id,
            signature_id=r.signature_id,
            anchor_status=r.anchor_status,
            supersedes_record_id=r.supersedes_record_id,
            evidence_snapshot=r.evidence_snapshot,
            created_at=r.created_at,
            finalized_at=r.finalized_at,
        )
        for r in records
    ]


@router.get(
    "/treatment-records/{record_id}",
    response_model=TreatmentRecordResponse,
    summary="Get treatment record details",
)
def get_treatment_record(record_id: UUID, db: Session = Depends(get_db)):
    """Retrieve detailed treatment record by UUID."""
    treatment_repo = TreatmentRepository(db)
    r = treatment_repo.get_by_id(record_id)
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Treatment record {record_id} not found")

    return TreatmentRecordResponse(
        record_id=r.record_id,
        facility_id=r.facility_id,
        period_start=r.period_start,
        period_end=r.period_end,
        record_version=r.record_version,
        record_state=r.record_state,
        quality_status=r.quality_status,
        anomaly_status=r.anomaly_status,
        compliance_status=r.compliance_status,
        canonical_hash=r.canonical_hash,
        certificate_id=r.certificate_id,
        signature_id=r.signature_id,
        anchor_status=r.anchor_status,
        supersedes_record_id=r.supersedes_record_id,
        evidence_snapshot=r.evidence_snapshot,
        created_at=r.created_at,
        finalized_at=r.finalized_at,
    )
