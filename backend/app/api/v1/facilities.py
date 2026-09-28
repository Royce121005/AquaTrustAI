"""AquaTrust AI — Facilities Router."""

from typing import List
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.facility import Facility
from app.repositories.facility_repository import FacilityRepository
from app.schemas.ingestion import FacilityCreate, FacilityResponse

router = APIRouter(tags=["Facilities"])


@router.get(
    "/facilities",
    response_model=List[FacilityResponse],
    summary="List all registered treatment facilities",
)
def list_facilities(db: Session = Depends(get_db)):
    """List all registered wastewater treatment facilities."""
    fac_repo = FacilityRepository(db)
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
)
def get_facility(facility_id: UUID, db: Session = Depends(get_db)):
    """Retrieve facility details by UUID."""
    fac_repo = FacilityRepository(db)
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
)
def create_facility(payload: FacilityCreate, db: Session = Depends(get_db)):
    """Register a new wastewater treatment facility."""
    fac_repo = FacilityRepository(db)
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
