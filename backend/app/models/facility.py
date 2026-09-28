"""AquaTrust AI — Facility ORM Model."""

from uuid import uuid4
from sqlalchemy import Column, String, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class Facility(Base):
    """Represents a standardized wastewater treatment facility."""

    __tablename__ = "facilities"

    facility_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    facility_name = Column(String, nullable=False)
    facility_type = Column(String, nullable=False)  # e.g., 'municipal_stp', 'industrial_etp'
    location = Column(JSONField, nullable=False, default=dict)
    capacity = Column(Numeric(20, 6), nullable=True)
    capacity_unit = Column(String, nullable=True)  # e.g., 'MLD', 'm3/day'
    status = Column(String, nullable=False, default='active')  # 'active', 'inactive', 'maintenance'
    provenance = Column(JSONField, nullable=True, default=dict)
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)
    updated_at = Column(UTCDateTime, nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    sensors = relationship("Sensor", back_populates="facility", cascade="all, delete-orphan")
    readings = relationship("Reading", back_populates="facility", cascade="all, delete-orphan")
    treatment_records = relationship("TreatmentRecord", back_populates="facility", cascade="all, delete-orphan")
    dlt_anchors = relationship("DLTAnchor", back_populates="facility", cascade="all, delete-orphan")
