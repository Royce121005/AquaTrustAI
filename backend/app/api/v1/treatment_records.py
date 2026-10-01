"""AquaTrust AI — Treatment Records Router."""

from typing import Optional, List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.treatment_record import TreatmentRecord
from app.repositories.treatment_repository import TreatmentRepository
from app.repositories.deps import get_treatment_repository
from app.services.treatment_service import TreatmentService
from app.core.security import get_current_user_claims, require_role
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
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
def finalize_treatment_window(
    payload: TreatmentRecordFinalizeRequest,
    response: Response,
    db: Session = Depends(get_db),
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin"])),
):
    """Aggregate readings, evaluate compliance, and finalize an immutable treatment record."""
    treatment_repo = TreatmentRepository(db)
    existing_record = treatment_repo.get_by_facility_and_period(
        facility_id=payload.facility_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
    )
    already_finalized = bool(existing_record and existing_record.record_state == "finalized")

    raw_actor = claims.get("user_id") or claims.get("sub") or claims.get("username")
    actor_uuid = None
    if raw_actor:
        try:
            actor_uuid = UUID(str(raw_actor))
        except (ValueError, AttributeError):
            import uuid
            actor_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, str(raw_actor))
    actor_role = claims.get("role")
    if hasattr(actor_role, "value"):
        actor_role = actor_role.value

    try:
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
            actor_id=actor_uuid,
            actor_role=actor_role,
        )
        db.commit()
        db.refresh(finalized)
    except ValueError as err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(err),
        )

    if already_finalized:
        response.status_code = status.HTTP_200_OK

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
        provenance=finalized.provenance,
        evidence_snapshot=finalized.evidence_snapshot,
        created_at=finalized.created_at,
        finalized_at=finalized.finalized_at,
    )


@router.get(
    "/treatment-records",
    response_model=List[TreatmentRecordResponse],
    summary="List treatment records",
    dependencies=[Depends(get_current_user_claims)],
)
def list_treatment_records(
    facility_id: Optional[UUID] = None,
    record_state: Optional[str] = None,
    compliance_status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    treatment_repo: TreatmentRepository = Depends(get_treatment_repository),
):
    """Query treatment records with state and compliance filtering."""
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
            provenance=r.provenance,
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
    dependencies=[Depends(get_current_user_claims)],
)
def get_treatment_record(
    record_id: UUID,
    treatment_repo: TreatmentRepository = Depends(get_treatment_repository),
):
    """Retrieve detailed treatment record by UUID."""
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
        provenance=r.provenance,
        evidence_snapshot=r.evidence_snapshot,
        created_at=r.created_at,
        finalized_at=r.finalized_at,
    )

