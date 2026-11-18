"""AquaTrust AI — Sensor Health & Calibration Pydantic Schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class SensorHealthItem(BaseModel):
    sensor_id: UUID
    facility_id: UUID
    parameter: str
    unit: str
    treatment_stage: Optional[str] = None
    status: str
    calibration_status: str
    last_calibrated_at: Optional[datetime] = None
    days_since_calibration: Optional[int] = None
    is_calibration_due: bool = False
    drift_flag: bool = False
    health_score: float = Field(..., ge=0.0, le=100.0)
    diagnostic_message: str


class SensorHealthResponse(BaseModel):
    facility_id: UUID
    evaluated_at: datetime
    total_sensors: int
    healthy_sensors: int
    drift_flagged_sensors: int
    overdue_calibration_sensors: int
    overall_health_index: float = Field(..., ge=0.0, le=100.0)
    sensors: List[SensorHealthItem]


class SensorCalibrationRequest(BaseModel):
    sensor_id: UUID
    calibration_type: str = "routine_standard"
    performed_by: Optional[str] = None
    notes: Optional[str] = None


class SensorCalibrationResponse(BaseModel):
    sensor_id: UUID
    facility_id: UUID
    parameter: str
    calibration_status: str
    calibrated_at: datetime
    drift_flag: bool
    status: str
    message: str
