"""
AquaTrust AI — Runtime Simulator Schemas
Data contracts and configuration models for synthetic wastewater stream generation.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Any, Union


@dataclass
class FacilityStreamConfig:
    """Configuration for a simulated facility stream."""
    facility_id: str = "SIM_STP_001"
    profile_facility_key: str = "FAC_UCI_URBAN_ETP_01"
    random_seed: Optional[int] = 42
    time_step_seconds: int = 900  # 15 minutes (96 steps / day)
    simulation_start_time: Optional[datetime] = None

    def __post_init__(self):
        if self.simulation_start_time is None:
            self.simulation_start_time = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        elif self.simulation_start_time.tzinfo is None:
            self.simulation_start_time = self.simulation_start_time.replace(tzinfo=timezone.utc)


@dataclass
class ScenarioGroundTruth:
    """Scenario ground-truth metadata separate from AI inference outputs."""
    scenario_id: str = "NOMINAL_OPERATION"
    scenario_name: str = "Nominal Baseline Operation"
    is_injected_anomaly: bool = False
    target_parameter: Optional[str] = None
    step_in_scenario: int = 0
    total_scenario_steps: int = 0
    expected_quality_status: str = "valid"
    expected_anomaly_status: str = "normal"
    expected_compliance_status: str = "compliant"
    injection_details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SimulatedReadingPayload:
    """Intermediate payload before conversion to CanonicalReading and AI predict."""
    facility_id: str
    sensor_id: str
    timestamp: datetime
    measurement_stage: str
    parameter: str
    value: Optional[float]
    unit: str
    data_origin: str = "simulated"
    quality_status: str = "valid"
    compliance_status: str = "compliant"
    ground_truth: ScenarioGroundTruth = field(default_factory=ScenarioGroundTruth)
