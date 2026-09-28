"""AquaTrust AI — Sensor ORM Model."""

from uuid import uuid4
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class Sensor(Base):
    """Represents an online telemetry sensor or laboratory assay point."""

    __tablename__ = "sensors"

    sensor_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.facility_id", ondelete="CASCADE"), nullable=False)
    parameter = Column(String, nullable=False)  # e.g., 'BOD', 'COD', 'pH', 'TSS'
    unit = Column(String, nullable=False)  # e.g., 'mg/L', 'pH units'
    treatment_stage = Column(String, nullable=True)  # e.g., 'inlet', 'secondary_aeration', 'final_effluent'
    sensor_metadata = Column("metadata", JSONField, nullable=True, default=dict)
    status = Column(String, nullable=False, default="active")  # 'active', 'offline', 'calibrating'
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)
    updated_at = Column(UTCDateTime, nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    facility = relationship("Facility", back_populates="sensors")
    readings = relationship("Reading", back_populates="sensor")
