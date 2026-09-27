"""
AquaTrust AI — AI Inference Schemas (Member 2 Contract)
Defines standard data structures for canonical measurement ingestion and anomaly inference results.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any, Union
from datetime import datetime


CANONICAL_PARAM_MAP = {
    "bod": "bod",
    "bod5": "bod",
    "biochemical_oxygen_demand": "bod",
    "cod": "cod",
    "chemical_oxygen_demand": "cod",
    "tss": "tss",
    "total_suspended_solids": "tss",
    "ph": "ph",
    "nh4": "nh4_n",
    "nh4_n": "nh4_n",
    "nh4-n": "nh4_n",
    "ammonia": "nh4_n",
    "ammonia_nitrogen": "nh4_n",
    "tkn": "tkn",
    "total_kjeldahl_nitrogen": "tkn",
    "tn": "tn",
    "total_nitrogen": "tn",
    "nox": "nox_n",
    "nox_n": "nox_n",
    "nox-n": "nox_n",
    "nitrate_nitrite": "nox_n"
}

CANONICAL_UNITS = {
    "bod": ["mg/L", "mg/l", "ppm"],
    "cod": ["mg/L", "mg/l", "ppm"],
    "tss": ["mg/L", "mg/l", "ppm"],
    "ph": ["pH_units", "pH", "ph", "units"],
    "nh4_n": ["mg/L", "mg/l", "ppm"],
    "tkn": ["mg/L", "mg/l", "ppm"],
    "tn": ["mg/L", "mg/l", "ppm"],
    "nox_n": ["mg/L", "mg/l", "ppm"]
}


def canonicalize_parameter_name(name: str) -> str:
    """Normalizes input parameter string to canonical lowercase slug."""
    if not isinstance(name, str):
        raise ValueError(f"Parameter name must be a string, got {type(name).__name__}")
    norm = name.strip().lower().replace("-", "_").replace(" ", "_")
    return CANONICAL_PARAM_MAP.get(norm, norm)


@dataclass
class CanonicalReadingInput:
    """
    Input schema accepted by AquaTrust AI Inference Engine.
    Represents a single canonical water quality observation.
    """
    facility_id: str
    timestamp: Union[str, datetime]
    parameter: str
    value: float
    unit: str
    measurement_stage: str = "final_effluent"
    sensor_id: Optional[str] = None
    dataset_source: Optional[str] = "SIMULATOR"
    quality_status: Optional[str] = "valid"
    compliance_status: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        # Format validation
        if not self.facility_id or not isinstance(self.facility_id, str):
            raise ValueError("facility_id must be a non-empty string.")
        
        if isinstance(self.timestamp, datetime):
            self.timestamp = self.timestamp.isoformat()
        elif not isinstance(self.timestamp, str):
            raise ValueError("timestamp must be an ISO-8601 string or datetime object.")
            
        if self.value is None or not isinstance(self.value, (int, float)):
            raise ValueError("value must be a numeric float or integer.")
        self.value = float(self.value)
        
        self.parameter_slug = canonicalize_parameter_name(self.parameter)
        self.unit = str(self.unit).strip()
        self.measurement_stage = str(self.measurement_stage).strip().lower()

    @property
    def stream_key(self) -> str:
        """Unique stream identifier key for sliding window state."""
        return f"{self.facility_id}:{self.measurement_stage}:{self.parameter_slug}"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return asdict(self)


@dataclass
class AnomalyInferenceOutput:
    """
    Standard output contract produced by AquaTrust AI Inference Engine.
    """
    facility_id: str
    timestamp: str
    parameter: str
    value: float
    unit: str
    measurement_stage: str
    anomaly_status: str  # "normal" | "anomalous" | "insufficient_data"
    anomaly_score: Optional[float]  # Raw decision_function output, or None for insufficient_data
    model_version: str
    feature_set_version: str
    threshold: float
    quality_status: Optional[str] = "valid"
    compliance_status: Optional[str] = None
    features_used: Optional[Dict[str, float]] = None
    explanation: str = ""
    inference_latency_ms: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to standard serializable dictionary."""
        return asdict(self)
