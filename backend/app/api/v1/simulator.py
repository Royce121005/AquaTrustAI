"""AquaTrust AI — Simulator Telemetry Bridge Router."""

from fastapi import APIRouter, HTTPException, status
from app.services.simulator_service import SimulatorService
from app.schemas.simulator import (
    SimulatorStartRequest,
    SimulatorStopRequest,
    SimulatorStatusResponse,
    AnomalyInjectionRequest,
)

router = APIRouter(prefix="/simulator", tags=["Telemetry Simulator Bridge"])


@router.post(
    "/start",
    summary="Start synthetic telemetry stream simulation",
)
def start_simulator(payload: SimulatorStartRequest = SimulatorStartRequest()):
    """Starts runtime synthetic telemetry stream generator."""
    service = SimulatorService.get_instance()
    result = service.start(
        facility_id=payload.facility_id,
        facility_name=payload.facility_name or "Bharwara STP Lucknow",
        interval_seconds=payload.interval_seconds,
        seed=payload.seed,
    )
    return result


@router.post(
    "/stop",
    summary="Stop synthetic telemetry stream simulation",
)
def stop_simulator(payload: SimulatorStopRequest = SimulatorStopRequest()):
    """Stops runtime synthetic telemetry generator."""
    service = SimulatorService.get_instance()
    return service.stop()


@router.get(
    "/status",
    response_model=SimulatorStatusResponse,
    summary="Get simulator status",
)
def get_simulator_status():
    """Retrieve real-time generator status."""
    service = SimulatorService.get_instance()
    data = service.get_status()
    return SimulatorStatusResponse(**data)


@router.post(
    "/inject-anomaly",
    summary="Inject anomaly scenario into active simulation",
)
def inject_anomaly(payload: AnomalyInjectionRequest):
    """Inject a physical or sensor anomaly into the running stream."""
    service = SimulatorService.get_instance()
    try:
        return service.inject_anomaly(
            scenario_id=payload.scenario_id,
            severity=payload.severity,
            duration_steps=payload.duration_steps,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
