"""AquaTrust AI — Simulator Control Schemas."""

from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class SimulatorStartRequest(BaseModel):
    """Request payload to start synthetic stream simulation."""
    facility_id: Optional[UUID] = None
    facility_name: Optional[str] = "Bharwara STP Lucknow"
    facility_type: Optional[str] = "municipal_stp"
    interval_seconds: float = Field(default=1.0, ge=0.1, le=60.0)
    seed: int = 42
    auto_ingest: bool = True


class SimulatorStopRequest(BaseModel):
    """Request payload to stop simulation."""
    pass


class SimulatorStatusResponse(BaseModel):
    """Status report of runtime simulation."""
    is_running: bool
    active_facility_id: Optional[str] = None
    active_facility_name: Optional[str] = None
    steps_generated: int
    readings_ingested: int
    current_scenario: str
    last_tick_at: Optional[str] = None


class AnomalyInjectionRequest(BaseModel):
    """Request to inject a specific anomaly scenario into the running simulator."""
    scenario_id: str = Field(..., description="Scenario ID: organic_shock, toxic_inflow, ph_drift, sensor_freeze, sensor_drift, false_compliance, storm_dilution, aeration_failure")
    severity: float = Field(default=1.0, ge=0.1, le=5.0)
    duration_steps: int = Field(default=10, ge=1, le=500)
