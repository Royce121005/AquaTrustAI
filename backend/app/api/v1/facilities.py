from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.base import utc_now
from app.models.facility import Facility
from app.models.sensor import Sensor
from app.models.reading import Reading
from app.repositories.deps import get_facility_repository, get_reading_repository
from app.repositories.facility_repository import FacilityRepository
from app.repositories.reading_repository import ReadingRepository
from app.schemas.ingestion import FacilityCreate, FacilityResponse, ReadingResponse, SensorCreate, SensorResponse
from app.core.security import get_current_user_claims, require_role

router = APIRouter(tags=["Facilities"])

CANONICAL_SENSOR_SPECS = [
    {
        "parameter": "BOD",
        "unit": "mg/L",
        "treatment_stage": "final_effluent",
        "metadata": {"sensor_model": "AquaSensor-BOD-Online", "sampling_frequency": "15m", "measurement_type": "optical_fluorometric"},
    },
    {
        "parameter": "COD",
        "unit": "mg/L",
        "treatment_stage": "final_effluent",
        "metadata": {"sensor_model": "AquaSensor-COD-UV", "sampling_frequency": "15m", "measurement_type": "uv_vis_spectrophotometry"},
    },
    {
        "parameter": "TSS",
        "unit": "mg/L",
        "treatment_stage": "final_effluent",
        "metadata": {"sensor_model": "AquaSensor-TSS-Optic", "sampling_frequency": "15m", "measurement_type": "near_infrared_scatter"},
    },
    {
        "parameter": "PH",
        "unit": "pH units",
        "treatment_stage": "final_effluent",
        "metadata": {"sensor_model": "AquaSensor-pH-Glass", "sampling_frequency": "15m", "measurement_type": "potentiometric_glass_electrode"},
    },
    {
        "parameter": "NH4_N",
        "unit": "mg/L",
        "treatment_stage": "final_effluent",
        "metadata": {"sensor_model": "AquaSensor-ISE-NH4", "sampling_frequency": "15m", "measurement_type": "ion_selective_electrode"},
    },
    {
        "parameter": "TKN",
        "unit": "mg/L",
        "treatment_stage": "final_effluent",
        "metadata": {"sensor_model": "AquaSensor-Spectro-TKN", "sampling_frequency": "15m", "measurement_type": "spectrophotometric"},
    },
    {
        "parameter": "DO",
        "unit": "mg/L",
        "treatment_stage": "secondary_aeration",
        "metadata": {"sensor_model": "AquaSensor-Opti-DO", "sampling_frequency": "1m", "measurement_type": "luminescent_optical"},
    },
    {
        "parameter": "MLSS",
        "unit": "mg/L",
        "treatment_stage": "secondary_aeration",
        "metadata": {"sensor_model": "AquaSensor-Opti-MLSS", "sampling_frequency": "5m", "measurement_type": "attenuated_light_scatter"},
    },
    {
        "parameter": "FLOW_RATE",
        "unit": "MLD",
        "treatment_stage": "inlet",
        "metadata": {"sensor_model": "AquaSensor-Mag-Flow", "sampling_frequency": "1m", "measurement_type": "electromagnetic_induction"},
    },
]


def provision_canonical_sensors_for_facility(facility_id: UUID, session: Session) -> List[Sensor]:
    """Provisions canonical SCADA instrumentation nodes and links unlinked telemetry readings."""
    now = utc_now()
    existing_sensors = session.query(Sensor).filter(Sensor.facility_id == facility_id).all()
    existing_params = {(s.parameter.upper(), (s.treatment_stage or "").lower()) for s in existing_sensors}

    created_sensors = []
    for spec in CANONICAL_SENSOR_SPECS:
        key = (spec["parameter"].upper(), spec["treatment_stage"].lower())
        if key not in existing_params:
            s = Sensor(
                sensor_id=uuid4(),
                facility_id=facility_id,
                parameter=spec["parameter"],
                unit=spec["unit"],
                treatment_stage=spec["treatment_stage"],
                sensor_metadata=spec["metadata"],
                status="active",
                last_calibrated_at=now - timedelta(days=3),
                calibration_status="calibrated",
                drift_flag=False,
                created_at=now,
                updated_at=now,
            )
            session.add(s)
            created_sensors.append(s)

    session.flush()

    # Backfill sensor_id on existing readings for this facility where sensor_id is NULL
    all_sensors = session.query(Sensor).filter(Sensor.facility_id == facility_id).all()
    for s in all_sensors:
        session.query(Reading).filter(
            Reading.facility_id == facility_id,
            Reading.parameter.ilike(s.parameter),
            Reading.sensor_id.is_(None),
        ).update({Reading.sensor_id: s.sensor_id}, synchronize_session=False)

    session.commit()
    return created_sensors


def auto_provision_all_facility_sensors(session: Session) -> int:
    """Auto-provisions canonical sensors for any active facilities missing sensors."""
    facilities = session.query(Facility).filter(Facility.status == "active").all()
    total_provisioned = 0
    for fac in facilities:
        sensor_count = session.query(Sensor).filter(Sensor.facility_id == fac.facility_id).count()
        if sensor_count == 0:
            provision_canonical_sensors_for_facility(fac.facility_id, session)
            total_provisioned += 1
    return total_provisioned


@router.get(
    "/facilities",
    response_model=List[FacilityResponse],
    summary="List all registered treatment facilities",
    dependencies=[Depends(get_current_user_claims)],
)
def list_facilities(
    limit: int = 500,
    skip: int = 0,
    fac_repo: FacilityRepository = Depends(get_facility_repository),
):
    """List all registered wastewater treatment facilities."""
    facilities = fac_repo.list(skip=skip, limit=limit)
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


@router.get(
    "/facilities/{facility_id}/sensors",
    response_model=List[SensorResponse],
    summary="Get sensors registered under a facility",
    dependencies=[Depends(get_current_user_claims)],
)
def get_facility_sensors(
    facility_id: UUID,
    fac_repo: FacilityRepository = Depends(get_facility_repository),
):
    """Retrieve all sensors associated with a treatment facility."""
    facility = fac_repo.get_by_id(facility_id)
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Facility {facility_id} not found")
    sensors = fac_repo.get_sensors(facility_id)
    return [
        SensorResponse(
            sensor_id=s.sensor_id,
            facility_id=s.facility_id,
            parameter=s.parameter,
            unit=s.unit,
            treatment_stage=s.treatment_stage,
            status=s.status,
            metadata=s.sensor_metadata or {},
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in sensors
    ]


@router.post(
    "/facilities/{facility_id}/sensors",
    response_model=SensorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new sensor probe under a facility",
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
def create_facility_sensor(
    facility_id: UUID,
    payload: SensorCreate,
    fac_repo: FacilityRepository = Depends(get_facility_repository),
    db: Session = Depends(get_db),
):
    """Register a new online telemetry sensor node under the specified facility."""
    facility = fac_repo.get_by_id(facility_id)
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Facility {facility_id} not found")

    now = utc_now()
    sensor = Sensor(
        sensor_id=uuid4(),
        facility_id=facility_id,
        parameter=payload.parameter.strip().upper(),
        unit=payload.unit.strip(),
        treatment_stage=payload.treatment_stage,
        sensor_metadata=payload.metadata or {},
        status=payload.status or "active",
        last_calibrated_at=now,
        calibration_status="calibrated",
        drift_flag=False,
        created_at=now,
        updated_at=now,
    )
    fac_repo.add_sensor(sensor)

    # Backfill unlinked readings
    db.query(Reading).filter(
        Reading.facility_id == facility_id,
        Reading.parameter.ilike(sensor.parameter),
        Reading.sensor_id.is_(None),
    ).update({Reading.sensor_id: sensor.sensor_id}, synchronize_session=False)

    db.commit()
    db.refresh(sensor)

    return SensorResponse(
        sensor_id=sensor.sensor_id,
        facility_id=sensor.facility_id,
        parameter=sensor.parameter,
        unit=sensor.unit,
        treatment_stage=sensor.treatment_stage,
        status=sensor.status,
        metadata=sensor.sensor_metadata or {},
        created_at=sensor.created_at,
        updated_at=sensor.updated_at,
    )


@router.post(
    "/facilities/{facility_id}/sensors/provision-defaults",
    response_model=List[SensorResponse],
    summary="Provision canonical SCADA and CPCB sensor nodes for a facility",
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
def provision_facility_default_sensors(
    facility_id: UUID,
    fac_repo: FacilityRepository = Depends(get_facility_repository),
    db: Session = Depends(get_db),
):
    """Automatically provisions standard CPCB Schedule VI & SCADA sensor suite for this facility."""
    facility = fac_repo.get_by_id(facility_id)
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Facility {facility_id} not found")

    provision_canonical_sensors_for_facility(facility_id, db)
    sensors = fac_repo.get_sensors(facility_id)
    return [
        SensorResponse(
            sensor_id=s.sensor_id,
            facility_id=s.facility_id,
            parameter=s.parameter,
            unit=s.unit,
            treatment_stage=s.treatment_stage,
            status=s.status,
            metadata=s.sensor_metadata or {},
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in sensors
    ]


@router.post(
    "/facilities/provision-all-sensors",
    summary="Provision standard sensor suites across all registered facilities missing sensors",
    dependencies=[Depends(require_role(["admin"]))],
)
def provision_all_facilities_sensors(
    db: Session = Depends(get_db),
):
    """Network-wide maintenance: provisions standard SCADA sensors for all facilities missing sensors."""
    count = auto_provision_all_facility_sensors(db)
    return {
        "status": "success",
        "facilities_provisioned": count,
        "message": f"Successfully provisioned standard SCADA sensors across {count} facilities.",
    }


@router.get(
    "/facilities/{facility_id}/optimization",
    summary="Get resource optimization and sustainability KPIs for a facility",
    dependencies=[Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"]))],
)
def get_facility_resource_optimization(
    facility_id: UUID,
    flow_rate_override: Optional[float] = Query(None, description="Optional flow rate override in m3/day"),
    reuse_rate_override: Optional[float] = Query(None, description="Optional treated water reuse rate in m3/day"),
    db: Session = Depends(get_db),
):
    """Calculates aeration power and coagulant dosing optimization for the facility."""
    from app.services.sustainability_service import SustainabilityService
    service = SustainabilityService(db)
    try:
        return service.get_facility_optimization(
            facility_id=facility_id,
            flow_rate_override=flow_rate_override,
            reuse_rate_override=reuse_rate_override,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


