"""AquaTrust AI — Telemetry Ingestion Router."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Header, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.session import get_db
from app.db.base import utc_now
from app.models.reading import Reading
from app.models.facility import Facility
from app.repositories.facility_repository import FacilityRepository
from app.repositories.reading_repository import ReadingRepository
from app.services.validation_service import ValidationService
from app.services.anomaly_service import AnomalyService
from app.core.security import get_current_user_claims, require_role
from app.schemas.ingestion import (
    ReadingIngestRequest,
    ReadingIngestResponse,
    BatchIngestRequest,
    BatchIngestResponse,
    ReadingResponse,
)

router = APIRouter(tags=["Telemetry Ingestion"])


@router.post(
    "/ingestion/readings",
    response_model=ReadingIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a single telemetry reading",
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
@router.post(
    "/telemetry/ingest",
    response_model=ReadingIngestResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
def ingest_reading(
    payload: ReadingIngestRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
):
    """Ingests, validates, and runs real-time AI anomaly detection on a telemetry observation."""
    fac_repo = FacilityRepository(db)
    facility = fac_repo.get_by_id(payload.facility_id)
    if not facility:
        # Create facility if not found to support seamless onboarding
        facility = Facility(
            facility_id=payload.facility_id,
            facility_name=f"Facility {str(payload.facility_id)[:8]}",
            facility_type="municipal_stp",
            location={},
            status="active",
        )
        fac_repo.create(facility)
        db.flush()

    # Sensor integrity verification
    if payload.sensor_id:
        sensor = fac_repo.get_sensor(payload.sensor_id)
        if not sensor or sensor.facility_id != payload.facility_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Sensor not found or not associated with facility",
            )

    reading_repo = ReadingRepository(db)

    # Idempotency & deduplication lookup
    existing = reading_repo.get_by_idempotency_or_time_key(
        facility_id=payload.facility_id,
        parameter=payload.parameter,
        treatment_stage=payload.treatment_stage,
        observed_at=payload.observed_at,
        idempotency_key=idempotency_key,
    )
    if existing:
        anom_res = reading_repo.get_anomaly_result(existing.reading_id)
        return ReadingIngestResponse(
            reading_id=existing.reading_id,
            facility_id=existing.facility_id,
            parameter=existing.parameter,
            value=existing.value,
            unit=existing.unit,
            observed_at=existing.observed_at,
            quality_status=existing.quality_status,
            anomaly_status=anom_res.anomaly_status if anom_res else "insufficient_data",
            anomaly_score=anom_res.anomaly_score if anom_res else None,
            ingested_at=existing.created_at,
        )

    reading_id = uuid4()
    provenance = dict(payload.provenance or {})
    if idempotency_key:
        provenance["idempotency_key"] = idempotency_key

    reading = Reading(
        reading_id=reading_id,
        facility_id=payload.facility_id,
        sensor_id=payload.sensor_id,
        observed_at=payload.observed_at,
        treatment_stage=payload.treatment_stage,
        parameter=payload.parameter,
        value=payload.value,
        unit=payload.unit,
        source=payload.source,
        provenance=provenance,
        quality_status="pending",
    )
    reading_repo.create(reading)

    # 1. Deterministic Data-Trust Validation
    ValidationService.validate_reading(db, reading)

    # 2. AI Anomaly Inference
    anom_res = AnomalyService.infer_reading(db, reading)

    try:
        db.commit()
        db.refresh(reading)
    except IntegrityError:
        db.rollback()
        # Concurrency collision occurred; retrieve and return existing observation
        existing = reading_repo.get_by_idempotency_or_time_key(
            facility_id=payload.facility_id,
            parameter=payload.parameter,
            treatment_stage=payload.treatment_stage,
            observed_at=payload.observed_at,
            idempotency_key=idempotency_key,
        )
        if existing:
            anom_res = reading_repo.get_anomaly_result(existing.reading_id)
            return ReadingIngestResponse(
                reading_id=existing.reading_id,
                facility_id=existing.facility_id,
                parameter=existing.parameter,
                value=existing.value,
                unit=existing.unit,
                observed_at=existing.observed_at,
                quality_status=existing.quality_status,
                anomaly_status=anom_res.anomaly_status if anom_res else "insufficient_data",
                anomaly_score=anom_res.anomaly_score if anom_res else None,
                ingested_at=existing.created_at,
            )
        raise

    return ReadingIngestResponse(
        reading_id=reading.reading_id,
        facility_id=reading.facility_id,
        parameter=reading.parameter,
        value=reading.value,
        unit=reading.unit,
        observed_at=reading.observed_at,
        quality_status=reading.quality_status,
        anomaly_status=anom_res.anomaly_status if anom_res else "insufficient_data",
        anomaly_score=anom_res.anomaly_score if anom_res else None,
        ingested_at=reading.created_at,
    )


@router.post(
    "/ingestion/batch",
    response_model=BatchIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a batch of telemetry readings",
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
@router.post(
    "/telemetry/ingest/batch",
    response_model=BatchIngestResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
def ingest_batch(
    payload: BatchIngestRequest,
    db: Session = Depends(get_db),
):
    """Ingest a batch of readings for a facility."""
    fac_repo = FacilityRepository(db)
    facility = fac_repo.get_by_id(payload.facility_id)
    if not facility:
        facility = Facility(
            facility_id=payload.facility_id,
            facility_name=f"Facility {str(payload.facility_id)[:8]}",
            facility_type="municipal_stp",
            location={},
            status="active",
        )
        fac_repo.create(facility)
        db.flush()

    reading_repo = ReadingRepository(db)
    created_ids: List[UUID] = []

    for r_in in payload.readings:
        # Sensor integrity verification
        if r_in.sensor_id:
            sensor = fac_repo.get_sensor(r_in.sensor_id)
            if not sensor or sensor.facility_id != payload.facility_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Sensor not found or not associated with facility",
                )

        # Idempotency & deduplication lookup
        idempotency_key = r_in.provenance.get("idempotency_key") if r_in.provenance else None
        existing = reading_repo.get_by_idempotency_or_time_key(
            facility_id=payload.facility_id,
            parameter=r_in.parameter,
            treatment_stage=r_in.treatment_stage,
            observed_at=r_in.observed_at,
            idempotency_key=idempotency_key,
        )
        if existing:
            created_ids.append(existing.reading_id)
            continue

        reading_id = uuid4()
        provenance = dict(r_in.provenance or {})
        reading = Reading(
            reading_id=reading_id,
            facility_id=payload.facility_id,
            sensor_id=r_in.sensor_id,
            observed_at=r_in.observed_at,
            treatment_stage=r_in.treatment_stage,
            parameter=r_in.parameter,
            value=r_in.value,
            unit=r_in.unit,
            source=r_in.source,
            provenance=provenance,
            ingestion_batch_id=payload.batch_id,
            quality_status="pending",
        )
        reading_repo.create(reading)
        ValidationService.validate_reading(db, reading)
        AnomalyService.infer_reading(db, reading)
        created_ids.append(reading_id)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Recover reading IDs if partial duplicates hit unique constraint
        created_ids = []
        for r_in in payload.readings:
            idempotency_key = r_in.provenance.get("idempotency_key") if r_in.provenance else None
            existing = reading_repo.get_by_idempotency_or_time_key(
                facility_id=payload.facility_id,
                parameter=r_in.parameter,
                treatment_stage=r_in.treatment_stage,
                observed_at=r_in.observed_at,
                idempotency_key=idempotency_key,
            )
            if existing:
                created_ids.append(existing.reading_id)

    return BatchIngestResponse(
        batch_id=payload.batch_id or uuid4(),
        facility_id=payload.facility_id,
        total_received=len(payload.readings),
        total_ingested=len(created_ids),
        reading_ids=created_ids,
        status="completed",
    )


@router.get(
    "/readings",
    response_model=List[ReadingResponse],
    summary="Query telemetry readings",
    dependencies=[Depends(get_current_user_claims)],
)
@router.get(
    "/telemetry/readings",
    response_model=List[ReadingResponse],
    include_in_schema=False,
    dependencies=[Depends(get_current_user_claims)],
)
def get_readings(
    facility_id: Optional[UUID] = None,
    parameter: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    quality_status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Query telemetry readings with multi-parameter filtering."""
    reading_repo = ReadingRepository(db)
    readings = reading_repo.get_readings(
        facility_id=facility_id,
        parameter=parameter,
        start_time=start_time,
        end_time=end_time,
        quality_status=quality_status,
        skip=skip,
        limit=limit,
    )
    results = []
    for r in readings:
        anom_status = r.anomaly_results[0].anomaly_status if r.anomaly_results else None
        anom_score = r.anomaly_results[0].anomaly_score if r.anomaly_results else None
        results.append(
            ReadingResponse(
                reading_id=r.reading_id,
                facility_id=r.facility_id,
                sensor_id=r.sensor_id,
                observed_at=r.observed_at,
                treatment_stage=r.treatment_stage,
                parameter=r.parameter,
                value=r.value,
                unit=r.unit,
                source=r.source,
                quality_status=r.quality_status,
                anomaly_status=anom_status,
                anomaly_score=anom_score,
                created_at=r.created_at,
            )
        )
    return results


@router.get(
    "/readings/{reading_id}",
    response_model=ReadingResponse,
    summary="Get single reading by UUID",
    dependencies=[Depends(get_current_user_claims)],
)
@router.get(
    "/telemetry/readings/{reading_id}",
    response_model=ReadingResponse,
    include_in_schema=False,
    dependencies=[Depends(get_current_user_claims)],
)
def get_reading(
    reading_id: UUID,
    db: Session = Depends(get_db),
):
    """Retrieve reading by UUID."""
    reading_repo = ReadingRepository(db)
    reading = reading_repo.get_by_id(reading_id)
    if not reading:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reading {reading_id} not found")

    anom_status = reading.anomaly_results[0].anomaly_status if reading.anomaly_results else None
    anom_score = reading.anomaly_results[0].anomaly_score if reading.anomaly_results else None

    return ReadingResponse(
        reading_id=reading.reading_id,
        facility_id=reading.facility_id,
        sensor_id=reading.sensor_id,
        observed_at=reading.observed_at,
        treatment_stage=reading.treatment_stage,
        parameter=reading.parameter,
        value=reading.value,
        unit=reading.unit,
        source=reading.source,
        quality_status=reading.quality_status,
        anomaly_status=anom_status,
        anomaly_score=anom_score,
        created_at=reading.created_at,
    )
