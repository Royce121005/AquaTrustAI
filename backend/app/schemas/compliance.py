"""AquaTrust AI — Compliance Evaluation Pydantic Schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel


class ComplianceRuleResponse(BaseModel):
    """Environmental compliance rule definition."""
    rule_id: UUID
    parameter: str
    operator: str
    threshold: Optional[Decimal] = None
    threshold_min: Optional[Decimal] = None
    threshold_max: Optional[Decimal] = None
    threshold_unit: str
    stage_scope: Optional[str] = None
    rule_version: str
    source_reference: str
    active: bool
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None


class ParameterComplianceDetail(BaseModel):
    """Detailed compliance evaluation result for a single parameter."""
    parameter: str
    observed_value: Optional[float] = None
    observed_unit: Optional[str] = None
    normalized_value: Optional[float] = None
    rule_id: Optional[str] = None
    rule_version: Optional[str] = None
    operator: str
    threshold: Optional[float] = None
    threshold_min: Optional[float] = None
    threshold_max: Optional[float] = None
    threshold_unit: str
    status: str
    result: str
    reason: str
    sample_count: int
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    mean_value: Optional[float] = None


class ComplianceEvaluateRequest(BaseModel):
    """Request payload to trigger compliance evaluation."""
    treatment_record_id: Optional[UUID] = None
    facility_id: Optional[UUID] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    parameters: Optional[Dict[str, float]] = None


class ComplianceEvaluateResponse(BaseModel):
    """Compliance evaluation verdict report."""
    compliance_result_id: Optional[UUID] = None
    treatment_record_id: Optional[UUID] = None
    compliance_status: str
    overall_status: Optional[str] = None
    rule_version: str
    parameter_results: Dict[str, Any]
    evaluated_at: datetime


class ComplianceSummaryResponse(BaseModel):
    """Compliance summary report for dashboard."""
    total_evaluations: int
    compliant_count: int
    non_compliant_count: int
    compliance_rate_percent: float
    cpcb_standard_version: str = "CPCB_2021"
    recent_evaluations: List[Dict[str, Any]] = []
