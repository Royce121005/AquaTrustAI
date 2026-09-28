"""AquaTrust AI — Pre-AI Validation Pydantic Schemas."""

from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import UUID
from pydantic import BaseModel


class ValidationResponse(BaseModel):
    """Detailed deterministic validation report."""
    validation_result_id: UUID
    reading_id: UUID
    quality_status: str
    validation_flags: List[str]
    validation_version: str
    validated_at: datetime


class ValidationStatsResponse(BaseModel):
    """Aggregated validation statistics."""
    total_readings: int
    valid_count: int
    suspect_count: int
    invalid_count: int
    pending_count: int
    valid_rate_percent: float
