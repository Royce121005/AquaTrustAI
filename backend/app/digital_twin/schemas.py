"""AquaTrust AI — Digital Twin Pydantic Schemas.

Defines API data contracts, state snapshots, scenario specifications,
and strict data provenance taxonomy (observed vs simulated vs predicted vs hypothetical).
"""

from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Any, Union, Literal
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


# Strict Data Origin Taxonomy
DataOriginType = Literal["observed", "simulated", "predicted", "hypothetical"]
StateFreshnessType = Literal["fresh", "stale", "expired"]
DataQualityType = Literal["valid", "suspect", "invalid", "insufficient_data"]
SourceModeType = Literal["live", "historical_replay", "simulation"]
ScenarioStatusType = Literal["pending", "running", "completed", "failed"]


class ObservationValue(BaseModel):
    """Atomic observation within a virtual STP state with explicit provenance."""
    model_config = ConfigDict(from_attributes=True)

    value: Optional[float] = None
    unit: str
    source: DataOriginType = "observed"
    quality_status: DataQualityType = "valid"
    observed_at: Optional[datetime] = None
    reading_id: Optional[UUID] = None
    sensor_id: Optional[UUID] = None


class TreatmentStageState(BaseModel):
    """State of an individual wastewater treatment stage."""
    model_config = ConfigDict(from_attributes=True)

    stage_id: str
    stage_name: str
    sequence_order: int
    operating_status: str = "nominal"  # 'nominal', 'degraded', 'offline', 'bypassed'
    parameters: Dict[str, ObservationValue] = Field(default_factory=dict)
    operating_variables: Dict[str, Any] = Field(default_factory=dict)  # e.g. DO, HRT, Flow
    modeled_outputs: Dict[str, Any] = Field(default_factory=dict)
    flags: List[str] = Field(default_factory=list)


class ProcessModelStatus(BaseModel):
    """Metadata regarding active treatment process model execution."""
    version: str
    status: str = "ready"  # 'ready', 'insufficient_data', 'recalculating'
    configuration_hash: Optional[str] = None
    evaluated_at: Optional[datetime] = None


class TwinStateResponse(BaseModel):
    """Comprehensive virtual STP facility state snapshot."""
    model_config = ConfigDict(from_attributes=True)

    facility_id: UUID
    state_version: int
    observed_at: datetime
    source_mode: SourceModeType = "simulation"
    facility_profile_version: str = "profile-v1.0"
    state_freshness: StateFreshnessType = "fresh"
    data_quality: DataQualityType = "valid"
    last_accepted_observation_at: Optional[datetime] = None
    latest_received_observation_at: Optional[datetime] = None
    process_model: ProcessModelStatus
    observations: Dict[str, ObservationValue] = Field(default_factory=dict)
    stage_states: Dict[str, TreatmentStageState] = Field(default_factory=dict)
    sensor_states: Dict[str, Any] = Field(default_factory=dict)
    predictions: Optional[Dict[str, Any]] = None
    last_processed_reading_id: Optional[UUID] = None
    created_at: datetime


class TwinHistoryResponse(BaseModel):
    """Paginated list of historical virtual state snapshots."""
    total: int
    limit: int
    offset: int
    history: List[TwinStateResponse]


class TwinConfigResponse(BaseModel):
    """Active twin facility configuration and model parameters."""
    model_config = ConfigDict(from_attributes=True)

    config_id: UUID
    facility_id: UUID
    version: int
    facility_profile_version: str
    technology_type: str
    treatment_stages: List[Dict[str, Any]]
    sensors_config: Dict[str, Any]
    operating_variables: Dict[str, Any]
    model_version: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TwinConfigUpdateRequest(BaseModel):
    """Request to update facility configuration and create a new version."""
    facility_profile_version: Optional[str] = None
    technology_type: Optional[str] = None
    treatment_stages: Optional[List[Dict[str, Any]]] = None
    sensors_config: Optional[Dict[str, Any]] = None
    operating_variables: Optional[Dict[str, Any]] = None
    model_version: Optional[str] = None


class ScenarioCreateRequest(BaseModel):
    """Request to define and launch an isolated what-if scenario."""
    base_state_version: Optional[int] = Field(None, description="Base state version. Defaults to latest active state.")
    scenario_type: str = Field(..., description="Scenario type e.g. influent_quality_change, sensor_drift, stuck_sensor, process_aeration_change, hydraulic_shock_load")
    scenario_name: Optional[str] = None
    duration_minutes: int = Field(120, ge=15, le=1440, description="Simulation horizon in minutes")
    time_step_seconds: int = Field(900, ge=60, le=3600, description="Cadence per step in seconds")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Scenario perturbation parameters")
    seed: Optional[int] = Field(42, description="Random seed for reproducibility")


class ScenarioResultStep(BaseModel):
    """Single step comparison in what-if scenario."""
    model_config = ConfigDict(from_attributes=True)

    step_index: int
    simulation_timestamp: datetime
    treatment_stage: str
    parameter: str
    baseline_value: Optional[float] = None
    scenario_value: Optional[float] = None
    unit: str
    estimated_compliance_status: str
    uncertainty_interval: Optional[Dict[str, float]] = None
    data_origin: DataOriginType = "hypothetical"


class ScenarioResponse(BaseModel):
    """Full scenario execution report and comparative results."""
    model_config = ConfigDict(from_attributes=True)

    scenario_id: UUID
    facility_id: UUID
    base_state_version: int
    scenario_type: str
    scenario_name: str
    status: ScenarioStatusType
    parameters: Dict[str, Any]
    duration_minutes: int
    time_step_seconds: int
    random_seed: Optional[int] = None
    model_version: str
    created_by: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_details: Optional[str] = None
    comparison_summary: Optional[Dict[str, Any]] = None
    results: List[ScenarioResultStep] = Field(default_factory=list)


class ScenarioListResponse(BaseModel):
    """Paginated list of facility what-if scenarios."""
    total: int
    limit: int
    offset: int
    scenarios: List[ScenarioResponse]


class TwinPredictionResponse(BaseModel):
    """Predicted effluent quality outputs with uncertainty bounds."""
    model_config = ConfigDict(from_attributes=True)

    prediction_id: UUID
    facility_id: UUID
    base_state_version: int
    model_version: str
    horizon_hours: float
    status: str
    predicted_values: Dict[str, Any]
    uncertainty_bounds: Optional[Dict[str, Any]] = None
    input_features: Optional[Dict[str, Any]] = None
    created_at: datetime


class TwinRecommendationResponse(BaseModel):
    """Advisory operational recommendations derived from process analysis."""
    model_config = ConfigDict(from_attributes=True)

    recommendation_id: UUID
    facility_id: UUID
    scenario_id: Optional[UUID] = None
    recommendation_type: str
    priority: str
    evidence: List[str]
    suggested_action: str
    expected_outcome: Optional[str] = None
    limitations: List[str]
    requires_human_review: bool = True
    status: str
    created_at: datetime


class TwinModelVersionResponse(BaseModel):
    """Registered process model metadata and configuration."""
    model_config = ConfigDict(from_attributes=True)

    model_version_id: UUID
    model_name: str
    model_type: str
    version: str
    configuration_hash: str
    parameters: Dict[str, Any]
    validation_status: str
    validation_metrics: Optional[Dict[str, Any]] = None
    created_at: datetime
