from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.facility import Facility
from app.repositories.deps import get_facility_repository, get_reading_repository
from app.repositories.facility_repository import FacilityRepository
from app.repositories.reading_repository import ReadingRepository
from app.schemas.ingestion import FacilityCreate, FacilityResponse, ReadingResponse
from app.core.security import get_current_user_claims, require_role

router = APIRouter(tags=["Facilities"])


@router.get(
    "/facilities",
    response_model=List[FacilityResponse],
    summary="List all registered treatment facilities",
    dependencies=[Depends(get_current_user_claims)],
)
def list_facilities(fac_repo: FacilityRepository = Depends(get_facility_repository)):
    """List all registered wastewater treatment facilities."""
    facilities = fac_repo.list()
    return [
        FacilityResponse(
            facility_id=f.facility_id,
            facility_name=f.facility_name,
            facility_type=f.facility_type,
            location=f.location or {},
            capacity=f.capacity,
            capacity_unit=f.capacity_unit,
            status=f.status,
            created_at=f.created_at,
            updated_at=f.updated_at,
        )
        for f in facilities
    ]


@router.get(
    "/facilities/{facility_id}",
    response_model=FacilityResponse,
    summary="Get facility details",
    dependencies=[Depends(get_current_user_claims)],
)
def get_facility(
    facility_id: UUID,
    fac_repo: FacilityRepository = Depends(get_facility_repository),
):
    """Retrieve facility details by UUID."""
    facility = fac_repo.get_by_id(facility_id)
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Facility {facility_id} not found")

    return FacilityResponse(
        facility_id=facility.facility_id,
        facility_name=facility.facility_name,
        facility_type=facility.facility_type,
        location=facility.location or {},
        capacity=facility.capacity,
        capacity_unit=facility.capacity_unit,
        status=facility.status,
        created_at=facility.created_at,
        updated_at=facility.updated_at,
    )


@router.post(
    "/facilities",
    response_model=FacilityResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new wastewater treatment facility",
    dependencies=[Depends(require_role(["admin"]))],
)
def create_facility(
    payload: FacilityCreate,
    fac_repo: FacilityRepository = Depends(get_facility_repository),
    db: Session = Depends(get_db),
):
    """Register a new wastewater treatment facility."""
    facility = Facility(
        facility_id=uuid4(),
        facility_name=payload.facility_name,
        facility_type=payload.facility_type,
        location=payload.location,
        capacity=payload.capacity,
        capacity_unit=payload.capacity_unit,
        status=payload.status,
        provenance=payload.provenance or {},
    )
    fac_repo.create(facility)
    db.commit()
    db.refresh(facility)

    return FacilityResponse(
        facility_id=facility.facility_id,
        facility_name=facility.facility_name,
        facility_type=facility.facility_type,
        location=facility.location or {},
        capacity=facility.capacity,
        capacity_unit=facility.capacity_unit,
        status=facility.status,
        created_at=facility.created_at,
        updated_at=facility.updated_at,
    )


@router.get(
    "/facilities/{facility_id}/readings",
    response_model=List[ReadingResponse],
    summary="Get telemetry readings for a specific facility",
    dependencies=[Depends(get_current_user_claims)],
)
def get_facility_readings(
    facility_id: UUID,
    parameter: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    quality_status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    fac_repo: FacilityRepository = Depends(get_facility_repository),
    reading_repo: ReadingRepository = Depends(get_reading_repository),
):
    """Retrieve paginated and filtered telemetry readings for a facility."""
    facility = fac_repo.get_by_id(facility_id)
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Facility {facility_id} not found")
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

