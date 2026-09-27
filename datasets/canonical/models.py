"""
AquaTrust AI — Canonical Wastewater Reading Domain Model

Authoritative Pydantic v2 data contract representing canonical readings
exchanged between Dataset Adapters, Simulator, FastAPI Ingestion, Data Trust Validation,
Isolation Forest ML, QA Compliance, PostgreSQL Storage, and DLT Anchoring.
"""

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, ConfigDict, Field, field_validator


class DataOrigin(str, Enum):
    OBSERVED = "observed"
    SIMULATED = "simulated"


class MeasurementStage(str, Enum):
    INLET = "inlet"
    PRIMARY_SETTLER = "primary_settler"
    SECONDARY_AERATION = "secondary_aeration"
    FINAL_EFFLUENT = "final_effluent"
    SLUDGE_LINE = "sludge_line"
    FACILITY_METADATA = "facility_metadata"
    UNSPECIFIED = "unspecified"


class QualityStatus(str, Enum):
    PENDING = "pending"
    VALID = "valid"
    INVALID = "invalid"
    SUSPECT = "suspect"
    INSUFFICIENT_DATA = "insufficient_data"


class AnomalyStatus(str, Enum):
    PENDING = "pending"
    NORMAL = "normal"
    ANOMALOUS = "anomalous"
    INSUFFICIENT_DATA = "insufficient_data"


class ComplianceStatus(str, Enum):
    PENDING = "pending"
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    NOT_APPLICABLE = "not_applicable"


class CanonicalParameter(str, Enum):
    BOD = "BOD"
    COD = "COD"
    TSS = "TSS"
    PH = "pH"
    NH4_N = "NH4_N"
    TN = "TN"
    COND = "COND"
    FLOW_RATE = "FLOW_RATE"
    TOTAL_COLIFORM = "TOTAL_COLIFORM"
    FECAL_COLIFORM = "FECAL_COLIFORM"
    NOX_N = "NOx_N"
    TKN = "TKN"
    ZN = "ZN"
    INSTALLED_CAPACITY = "INSTALLED_CAPACITY"
    UTILIZED_CAPACITY = "UTILIZED_CAPACITY"


class CanonicalReading(BaseModel):
    """
    Standardized atomic reading object for AquaTrust AI.
    Guarantees strict separation between raw value, validation quality,
    AI anomaly status, compliance verdict, and cryptographic provenance.
    """
    model_config = ConfigDict(
        populate_by_name=True,
        validate_assignment=True,
        use_enum_values=True,
        arbitrary_types_allowed=True,
        json_encoders={
            datetime: lambda dt: dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            Decimal: lambda d: f"{d:.6f}"
        }
    )

    reading_id: UUID = Field(default_factory=uuid4, description="Unique identifier for the reading.")
    dataset_id: str = Field(..., description="Registered dataset identifier or simulation source slug.")
    source_record_id: str = Field(..., description="Line index, source CSV record key, or simulation step index.")
    facility_id: str = Field(..., description="Standardized facility identifier.")
    sensor_id: str = Field(..., description="Standardized telemetry sensor or laboratory assay identifier.")
    timestamp: datetime = Field(..., description="UTC ISO 8601 timestamp.")
    measurement_stage: MeasurementStage = Field(..., description="Wastewater treatment process stage.")
    parameter: CanonicalParameter = Field(..., description="Canonical parameter symbol.")
    value: Optional[Decimal] = Field(None, description="Numeric measurement value. None if parameter is missing.")
    unit: str = Field(..., description="Standard scientific unit string.")
    data_origin: DataOrigin = Field(..., description="Strict classification: 'observed' vs 'simulated'.")
    quality_status: QualityStatus = Field(default=QualityStatus.PENDING, description="Validation verdict.")
    anomaly_status: AnomalyStatus = Field(default=AnomalyStatus.PENDING, description="AI model anomaly outcome.")
    compliance_status: ComplianceStatus = Field(default=ComplianceStatus.PENDING, description="Compliance verdict.")
    provenance_id: str = Field(..., description="Cryptographic SHA-256 provenance link or acquisition manifest ID.")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Optional domain context tags.")

    @field_validator("timestamp")
    @classmethod
    def ensure_utc_timezone(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)

    @field_validator("data_origin")
    @classmethod
    def reject_ambiguous_origin(cls, v: Any) -> DataOrigin:
        if str(v).lower() in ["real", "fake", "actual", "synthetic"]:
            raise ValueError("Ambiguous data_origin rejected! Must be explicitly 'observed' or 'simulated'.")
        return v

    def to_canonical_dict(self) -> Dict[str, Any]:
        """Serialize reading to a deterministic dictionary for canonicalization & hashing."""
        return {
            "dataset_id": str(self.dataset_id),
            "source_record_id": str(self.source_record_id),
            "facility_id": str(self.facility_id),
            "sensor_id": str(self.sensor_id),
            "timestamp": self.timestamp.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "measurement_stage": str(self.measurement_stage),
            "parameter": str(self.parameter),
            "value": f"{self.value:.6f}" if self.value is not None else None,
            "unit": str(self.unit),
            "data_origin": str(self.data_origin),
            "quality_status": str(self.quality_status),
            "anomaly_status": str(self.anomaly_status),
            "compliance_status": str(self.compliance_status),
            "provenance_id": str(self.provenance_id)
        }
