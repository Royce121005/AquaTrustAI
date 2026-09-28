"""AquaTrust AI — AI Anomaly Inference Pydantic Schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel


class AnomalyInferRequest(BaseModel):
    """Payload for requesting ad-hoc or reading-linked anomaly inference."""
    reading_id: Optional[UUID] = None
    facility_id: Optional[UUID] = None
    parameter: Optional[str] = None
    value: Optional[Decimal] = None
    unit: Optional[str] = None
    observed_at: Optional[datetime] = None
    treatment_stage: Optional[str] = "final_effluent"


class AnomalyInferResponse(BaseModel):
    """Detailed anomaly inference report."""
    anomaly_result_id: Optional[UUID] = None
    reading_id: Optional[UUID] = None
    anomaly_status: str
    anomaly_score: Optional[Decimal] = None
    model_version: str
    feature_set_version: str
    is_anomalous: bool
    features: Optional[Dict[str, Any]] = None
    inference_at: datetime


class AnomalyMetricsSummary(BaseModel):
    """Aggregated anomaly metrics for dashboard and insights UI."""
    total_inferences: int
    anomalies_detected: int
    anomaly_rate_percent: float
    model_version: str
    recent_events: List[Dict[str, Any]] = []
