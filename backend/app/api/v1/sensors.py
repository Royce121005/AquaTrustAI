"""AquaTrust AI — Sensor Health & Calibration Router (Member 2 Phase 2)."""

from typing import Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user_claims, require_role
from app.schemas.sensor import (
    SensorHealthResponse,
    SensorCalibrationRequest,
    SensorCalibrationResponse,
)
from app.services.sensor_service import SensorService

router = APIRouter(prefix="/sensors", tags=["Sensor Health & Calibration"])


@router.get(
    "/health",
    response_model=SensorHealthResponse,
    summary="Get sensor health index, calibration schedules, and drift flags",
    dependencies=[Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"]))],
)
def get_sensor_health(
    facility_id: UUID = Query(..., description="ID of the facility to inspect"),
    db: Session = Depends(get_db),
):
    """Evaluates 30-day calibration cycle and runs Member 1 SensorTrustClassifier on recent telemetry."""
    service = SensorService(db)
    return service.get_facility_sensor_health(facility_id)


@router.post(
    "/calibration",
    response_model=SensorCalibrationResponse,
    summary="Calibrate sensor and reset calibration interval and drift flags",
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
def calibrate_sensor(
    payload: SensorCalibrationRequest,
    claims: Dict[str, Any] = Depends(get_current_user_claims),
    db: Session = Depends(get_db),
):
    """Executes a routine or corrective calibration, resetting the overdue timer and recording an audit trail."""
    service = SensorService(db)
    actor_id_str = claims.get("sub")
    actor_id = None
    if actor_id_str:
        try:
            actor_id = UUID(actor_id_str)
        except (ValueError, TypeError, AttributeError):
            actor_id = None
    actor_role = claims.get("role", "operator")

    try:
        return service.calibrate_sensor(payload, actor_id=actor_id, actor_role=actor_role)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
