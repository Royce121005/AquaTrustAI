"""AquaTrust AI — Ingestion & Telemetry Pydantic Schemas."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, ConfigDict


class ReadingIngestRequest(BaseModel):
    """Payload for ingesting an atomic telemetry observation."""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    facility_id: UUID = Field(..., description="Target facility UUID")
    sensor_id: Optional[UUID] = Field(None, description="Optional sensor UUID")
    observed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="UTC timestamp")
    treatment_stage: Optional[str] = Field("final_effluent", description="Process stage: inlet, secondary_aeration, final_effluent")
    parameter: str = Field(..., description="Canonical parameter symbol (e.g. BOD, COD, pH, TSS)")
    value: Optional[Decimal] = Field(None, description="Standardized numeric measurement value")
    unit: str = Field(..., description="Scientific unit string (e.g. mg/L, pH units)")
    source: str = Field("telemetry", description="Data origin: telemetry, simulated, laboratory")
    provenance: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Cryptographic/source metadata")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Operational context tags")


class ReadingIngestResponse(BaseModel):
    """Response confirming telemetry ingestion, validation, and AI inference."""
    reading_id: UUID
    facility_id: UUID
    parameter: str
    value: Optional[Decimal]
    unit: str
    observed_at: datetime
    quality_status: str
    anomaly_status: str
    anomaly_score: Optional[Decimal] = None
    ingested_at: datetime


class BatchIngestRequest(BaseModel):
    """Payload for ingesting multiple telemetry readings."""
    facility_id: UUID
    batch_id: Optional[UUID] = Field(default_factory=uuid4)
    readings: List[ReadingIngestRequest]


class BatchIngestResponse(BaseModel):
    """Response confirming batch telemetry ingestion."""
    batch_id: UUID
    facility_id: UUID
    total_received: int
    total_ingested: int
    reading_ids: List[UUID]
    status: str = "completed"


class FacilityCreate(BaseModel):
    """Payload for registering a wastewater treatment facility."""
    facility_name: str
    facility_type: str
    location: Dict[str, Any] = Field(default_factory=dict)
    capacity: Optional[Decimal] = None
    capacity_unit: Optional[str] = "MLD"
    status: str = "active"
    provenance: Optional[Dict[str, Any]] = Field(default_factory=dict)


class FacilityResponse(BaseModel):
    """Facility details response."""
    facility_id: UUID
    facility_name: str
    facility_type: str
    location: Dict[str, Any]
    capacity: Optional[Decimal]
    capacity_unit: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime


class ReadingResponse(BaseModel):
    """Reading detail response."""
    reading_id: UUID
    facility_id: UUID
    sensor_id: Optional[UUID]
    observed_at: datetime
    treatment_stage: Optional[str]
    parameter: str
    value: Optional[Decimal]
    unit: str
    source: str
    quality_status: str
    anomaly_status: Optional[str] = None
    anomaly_score: Optional[Decimal] = None
    created_at: datetime


class SensorResponse(BaseModel):
    """Sensor details response."""
    sensor_id: UUID
    facility_id: UUID
    parameter: str
    unit: str
    treatment_stage: Optional[str] = None
    status: str
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
