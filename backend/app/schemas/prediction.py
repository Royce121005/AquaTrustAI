"""AquaTrust AI — Quality Prediction Pydantic Schemas."""

from datetime import datetime
from typing import Dict, List, Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field


class PredictionEvaluateRequest(BaseModel):
    facility_id: UUID
    inlet_bod: Optional[float] = Field(None, description="Raw influent BOD in mg/L (optional, auto-resolved from telemetry if omitted)")
    inlet_cod: Optional[float] = Field(None, description="Raw influent COD in mg/L")
    inlet_tss: Optional[float] = Field(None, description="Raw influent TSS in mg/L")
    inlet_ph: Optional[float] = Field(None, description="Raw influent pH")
    flow_rate_q: Optional[float] = Field(None, description="Hydraulic inflow rate in m3/day")
    lead_time_hours: float = Field(6.0, ge=1.0, le=24.0, description="Forward forecast horizon in hours")


class PredictedParameterDTO(BaseModel):
    parameter: str
    predicted_value: float
    unit: str
    cpcb_discharge_limit: float
    confidence_lower: float
    confidence_upper: float
    risk_level: str  # "COMPLIANT", "BORDERLINE", "BREACH_RISK"
    risk_score: float  # 0.0 to 1.0
    expected_removal_efficiency_pct: float


class PredictionResponse(BaseModel):
    prediction_id: UUID
    facility_id: UUID
    treatment_stage: str
    cycle_timestamp: datetime
    horizon_hours: float
    predicted_parameters: Dict[str, PredictedParameterDTO]
    overall_risk_status: str
    overall_risk_score: float
    is_cpcb_compliant: bool
    model_version: str
    summary_explanation: Optional[str] = None
    created_at: datetime


class PredictionLatestResponse(BaseModel):
    facility_id: UUID
    evaluated_at: datetime
    has_prediction: bool
    latest_prediction: Optional[PredictionResponse] = None
