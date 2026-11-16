"""
AquaTrust AI — Process Recommendations Schemas (Phase 4)
Defines structured data contracts for prescriptive operational recommendations,
bridging AI anomaly detection, sensor trust, and predictive quality forecasts
into actionable operator guidance.
"""

from enum import Enum
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from uuid import uuid4


class RecommendationCategory(str, Enum):
    """Operational domain categories for treatment plant interventions."""
    AERATION = "AERATION"                  # Blowers, DO setpoints, diffusers
    CHEMICAL_DOSING = "CHEMICAL_DOSING"    # Coagulant (PAC/Alum), acid/caustic neutralization
    HYDRAULIC_CONTROL = "HYDRAULIC_CONTROL"# Equalization basins, diversion gates, storm holding
    SLUDGE_MANAGEMENT = "SLUDGE_MANAGEMENT"# RAS / WAS recycling, clarifier scraper
    MAINTENANCE = "MAINTENANCE"            # Sensor recalibration, probe cleaning, hardware repair
    RESOURCE_SAVING = "RESOURCE_SAVING"    # Energy throttling during low organic load


class RecommendationSeverity(str, Enum):
    """Standardized severity levels."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RecommendationUrgency(str, Enum):
    """Time window within which the operational action must be executed."""
    IMMEDIATE = "IMMEDIATE"            # < 15 minutes (Critical breach or sensor failure)
    WITHIN_1_HOUR = "WITHIN_1_HOUR"    # 15 - 60 minutes (Shock load or fast drift)
    WITHIN_4_HOURS = "WITHIN_4_HOURS"  # 1 - 4 hours (Preemptive mitigation before effluent discharge)
    ROUTINE = "ROUTINE"                # Routine shift adjustment / maintenance


@dataclass
class ParameterTarget:
    """Quantitative operating setpoint adjustment."""
    parameter: str
    current_value: Optional[float]
    recommended_setpoint: float
    unit: str
    adjustment_delta: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ProcessRecommendation:
    """
    Standardized operational recommendation contract produced by Member 1 for Member 2.
    """
    recommendation_id: str
    facility_id: str
    timestamp: str
    title: str
    action: str
    category: RecommendationCategory
    severity: RecommendationSeverity
    urgency: RecommendationUrgency
    related_parameter: str
    trigger_source: str  # "ANOMALY_DETECTION" | "QUALITY_PREDICTION" | "SENSOR_TRUST" | "OPTIMIZATION"
    reason: str
    parameter_target: Optional[ParameterTarget] = None
    estimated_impact: str = ""
    is_automated_dispatch_eligible: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["category"] = self.category.value
        d["severity"] = self.severity.value
        d["urgency"] = self.urgency.value
        if self.parameter_target is not None:
            d["parameter_target"] = self.parameter_target.to_dict()
        return d


@dataclass
class RecommendationBatchOutput:
    """
    Collection of active recommendations for a facility at an evaluation window.
    """
    facility_id: str
    timestamp: str
    active_count: int
    critical_count: int
    recommendations: List[ProcessRecommendation]
    highest_severity: RecommendationSeverity
    summary: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "facility_id": self.facility_id,
            "timestamp": self.timestamp,
            "active_count": self.active_count,
            "critical_count": self.critical_count,
            "highest_severity": self.highest_severity.value,
            "summary": self.summary,
            "recommendations": [r.to_dict() for r in self.recommendations],
        }
