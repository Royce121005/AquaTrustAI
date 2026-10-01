"""AquaTrust AI — Reading ORM Model."""

from uuid import uuid4
from sqlalchemy import Column, String, Numeric, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class Reading(Base):
    """Represents an atomic telemetry or laboratory water quality observation."""

    __tablename__ = "readings"

    reading_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.facility_id", ondelete="CASCADE"), nullable=False)
    sensor_id = Column(UUID(as_uuid=True), ForeignKey("sensors.sensor_id", ondelete="SET NULL"), nullable=True)
    observed_at = Column(UTCDateTime, nullable=False)
    treatment_stage = Column(String, nullable=True)
    parameter = Column(String, nullable=False)
    value = Column(Numeric(20, 6), nullable=True)
    unit = Column(String, nullable=False)
    source = Column(String, nullable=False, default="telemetry")
    provenance = Column(JSONField, nullable=True, default=dict)
    quality_status = Column(String, nullable=False, default="pending")
    ingestion_batch_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)

    # Compound, query, and uniqueness constraints
    __table_args__ = (
        Index("ix_readings_facility_observed", "facility_id", "observed_at"),
        Index("ix_readings_parameter_observed", "parameter", "observed_at"),
        Index("ix_readings_ingestion_batch", "ingestion_batch_id"),
        Index("ix_readings_dedup_lookup", "facility_id", "parameter", "treatment_stage", "observed_at"),
        UniqueConstraint("facility_id", "parameter", "treatment_stage", "observed_at", name="uq_readings_natural_key"),
    )

    # Relationships
    facility = relationship("Facility", back_populates="readings")
    sensor = relationship("Sensor", back_populates="readings")
    validation_results = relationship("ValidationResult", back_populates="reading", cascade="all, delete-orphan")
    anomaly_results = relationship("AnomalyResult", back_populates="reading", cascade="all, delete-orphan")
