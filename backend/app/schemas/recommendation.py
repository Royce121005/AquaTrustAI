"""AquaTrust AI — Process Recommendation Pydantic Schemas."""

from datetime import datetime
from typing import List, Optional, Any, Dict
from uuid import UUID
from pydantic import BaseModel, Field


class ParameterTargetDTO(BaseModel):
    parameter: str
    current_value: Optional[float] = None
    recommended_setpoint: float
    unit: str
    adjustment_delta: float


class RecommendationResponse(BaseModel):
    recommendation_id: UUID
    facility_id: UUID
    timestamp: datetime
    title: str
    action: str
    category: str
    severity: str
    urgency: str
    related_parameter: str
    trigger_source: str
    reason: Optional[str] = None
    parameter_target: Optional[ParameterTargetDTO] = None
    estimated_impact: Optional[str] = None
    status: str
    applied_at: Optional[datetime] = None
    applied_by: Optional[UUID] = None
    created_at: datetime


class RecommendationApplyRequest(BaseModel):
    setpoint_applied: Optional[float] = None
    operator_notes: Optional[str] = None


class RecommendationListResponse(BaseModel):
    facility_id: UUID
    total_count: int
    active_count: int
    critical_count: int
    recommendations: List[RecommendationResponse]
