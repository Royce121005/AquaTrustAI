"""
AquaTrust AI — Treatment Quality Prediction Schemas (Phase 3)
Defines standard data structures for predicting downstream/effluent water quality
and assessing regulatory breach risk.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Optional, Any, Union
from datetime import datetime


# Central Pollution Control Board (CPCB) Schedule VI General Discharge Limits
CPCB_DISCHARGE_LIMITS = {
    "bod": 30.0,       # mg/L max
    "cod": 250.0,      # mg/L max
    "tss": 100.0,      # mg/L max
    "ph_min": 5.5,     # pH units min
    "ph_max": 9.0,     # pH units max
}


@dataclass
class TreatmentPredictionInput:
    """
    Influent & operating condition input for effluent water quality prediction.
    """
    facility_id: str
    timestamp: Union[str, datetime]
    inlet_bod: float
    inlet_cod: float
    inlet_tss: float
    inlet_ph: float
    flow_rate_q: Optional[float] = 35000.0  # m3/day nominal
    inlet_conductivity: Optional[float] = 2000.0  # uS/cm
    inlet_sediment: Optional[float] = 4.5  # ml/L
    lead_time_hours: float = 6.0  # Hydraulic Retention Time (HRT)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.facility_id or not isinstance(self.facility_id, str):
            raise ValueError("facility_id must be a non-empty string.")
        if isinstance(self.timestamp, datetime):
            self.timestamp = self.timestamp.isoformat()
        elif not isinstance(self.timestamp, str):
            raise ValueError("timestamp must be an ISO-8601 string or datetime object.")
        
        self.inlet_bod = float(self.inlet_bod)
        self.inlet_cod = float(self.inlet_cod)
        self.inlet_tss = float(self.inlet_tss)
        self.inlet_ph = float(self.inlet_ph)
        if self.flow_rate_q is not None:
            self.flow_rate_q = float(self.flow_rate_q)
        if self.inlet_conductivity is not None:
            self.inlet_conductivity = float(self.inlet_conductivity)
        if self.inlet_sediment is not None:
            self.inlet_sediment = float(self.inlet_sediment)

    def to_feature_vector(self) -> list:
        """Converts input fields into feature vector matching model training order."""
        return [
            self.flow_rate_q if self.flow_rate_q is not None else 35000.0,
            self.inlet_ph,
            self.inlet_bod,
            self.inlet_cod,
            self.inlet_tss,
            self.inlet_sediment if self.inlet_sediment is not None else 4.5,
            self.inlet_conductivity if self.inlet_conductivity is not None else 2000.0,
        ]


@dataclass
class PredictedParameter:
    """
    Predicted effluent parameter outcome with regulatory risk assessment.
    """
    parameter: str
    predicted_value: float
    unit: str
    cpcb_discharge_limit: float
    confidence_lower: float
    confidence_upper: float
    risk_level: str  # "COMPLIANT" | "BORDERLINE" | "BREACH_RISK"
    risk_score: float  # 0.0 (safe) to 1.0 (certain breach)
    expected_removal_efficiency_pct: float  # % reduction from inlet to effluent

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TreatmentQualityPredictionOutput:
    """
    Complete Phase 3 prediction contract delivered to Member 2 (Backend).
    """
    facility_id: str
    timestamp: str
    lead_time_hours: float
    predicted_parameters: Dict[str, PredictedParameter]
    overall_risk_status: str  # "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK"
    overall_risk_score: float  # Normalized 0.0 to 1.0
    is_cpcb_compliant: bool
    model_version: str
    summary_explanation: str
    inference_latency_ms: float
    recommendation_hint: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["predicted_parameters"] = {k: v.to_dict() if hasattr(v, "to_dict") else v for k, v in self.predicted_parameters.items()}
        return d
