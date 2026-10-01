"""AquaTrust AI — Pre-AI Validation Router."""

from typing import Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.reading import Reading
from app.models.validation_result import ValidationResult
from app.repositories.reading_repository import ReadingRepository
from app.services.validation_service import ValidationService
from app.schemas.validation import ValidationResponse, ValidationStatsResponse
from app.core.security import get_current_user_claims, require_role

router = APIRouter(tags=["Pre-AI Validation"])


@router.get(
    "/validation/stats",
    response_model=ValidationStatsResponse,
    summary="Get pre-AI validation quality statistics",
    dependencies=[Depends(get_current_user_claims)],
)
def get_validation_stats(
    facility_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
):
    """Aggregate data quality validation statistics."""
    query = select(Reading.quality_status, func.count(Reading.reading_id)).group_by(Reading.quality_status)
    if facility_id:
        query = query.where(Reading.facility_id == facility_id)

    rows = db.execute(query).all()
    counts = {r[0]: r[1] for r in rows}
    total = sum(counts.values())

    valid_cnt = counts.get("valid", 0)
    suspect_cnt = counts.get("suspect", 0)
    invalid_cnt = counts.get("invalid", 0)
    pending_cnt = counts.get("pending", 0)
    rate = (float(valid_cnt) / float(total) * 100.0) if total > 0 else 100.0

    return ValidationStatsResponse(
        total_readings=total,
        valid_count=valid_cnt,
        suspect_count=suspect_cnt,
        invalid_count=invalid_cnt,
        pending_count=pending_cnt,
        valid_rate_percent=round(rate, 2),
    )


@router.post(
    "/validation/readings/{reading_id}",
    response_model=ValidationResponse,
    summary="Execute deterministic validation on a reading",
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
def run_validation(reading_id: UUID, db: Session = Depends(get_db)):
    """Run deterministic pre-AI data-trust validation rules on an existing reading."""
    reading_repo = ReadingRepository(db)
    reading = reading_repo.get_by_id(reading_id)
    if not reading:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reading {reading_id} not found")

    val_res = ValidationService.validate_reading(db, reading)
    db.commit()
    db.refresh(val_res)

    return ValidationResponse(
        validation_result_id=val_res.validation_result_id,
        reading_id=val_res.reading_id,
        quality_status=val_res.quality_status,
        validation_flags=val_res.validation_flags,
        validation_version=val_res.validation_version,
        validated_at=val_res.validated_at,
    )


@router.get(
    "/validation/readings/{reading_id}",
    response_model=ValidationResponse,
    summary="Get validation report for a reading",
    dependencies=[Depends(get_current_user_claims)],
)
def get_validation_report(reading_id: UUID, db: Session = Depends(get_db)):
    """Fetch existing validation report for a reading."""
    reading_repo = ReadingRepository(db)
    val_res = reading_repo.get_validation_result(reading_id)
    if not val_res:
        reading = reading_repo.get_by_id(reading_id)
        if not reading:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reading {reading_id} not found")
        val_res = ValidationService.validate_reading(db, reading)
        db.commit()

    return ValidationResponse(
        validation_result_id=val_res.validation_result_id,
        reading_id=val_res.reading_id,
        quality_status=val_res.quality_status,
        validation_flags=val_res.validation_flags,
        validation_version=val_res.validation_version,
        validated_at=val_res.validated_at,
    )

