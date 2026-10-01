"""AquaTrust AI — Treatment Record ORM Model."""

from uuid import uuid4
from sqlalchemy import Column, String, Integer, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class TreatmentRecord(Base):
    """Represents composite aggregated wastewater treatment window records."""

    __tablename__ = "treatment_records"

    record_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.facility_id", ondelete="CASCADE"), nullable=False)
    period_start = Column(UTCDateTime, nullable=False)
    period_end = Column(UTCDateTime, nullable=False)
    record_version = Column(Integer, nullable=False, default=1)
    record_state = Column(String, nullable=False, default="draft")  # 'draft', 'eligible_for_finalization', 'finalized', 'superseded_by_correction'
    quality_status = Column(String, nullable=False, default="pending")
    anomaly_status = Column(String, nullable=False, default="pending")
    compliance_status = Column(String, nullable=False, default="pending")
    provenance = Column(JSONField, nullable=True, default=dict)
    evidence_snapshot = Column(JSONField, nullable=True, default=dict)
    certificate_id = Column(UUID(as_uuid=True), nullable=True)
    canonical_hash = Column(String(64), nullable=True)
    signature_id = Column(UUID(as_uuid=True), nullable=True)
    anchor_status = Column(String, nullable=False, default="not_required")  # 'not_required', 'pending', 'submitted', 'confirmed', 'failed', 'rejected'
    supersedes_record_id = Column(UUID(as_uuid=True), ForeignKey("treatment_records.record_id", ondelete="RESTRICT"), nullable=True)
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)
    finalized_at = Column(UTCDateTime, nullable=True)

    __table_args__ = (
        Index("ix_treatment_records_facility_period", "facility_id", "period_start", "period_end"),
        Index("ix_treatment_records_canonical_hash", "canonical_hash"),
    )

    # Relationships
    facility = relationship("Facility", back_populates="treatment_records")
    compliance_results = relationship("ComplianceResult", back_populates="treatment_record", cascade="all, delete-orphan")
    certificate = relationship("Certificate", back_populates="treatment_record", uselist=False, cascade="all, delete-orphan")
    cryptographic_artifact = relationship("CryptographicArtifact", back_populates="treatment_record", uselist=False, cascade="all, delete-orphan")
    dlt_anchor = relationship("DLTAnchor", back_populates="treatment_record", uselist=False, cascade="all, delete-orphan")
    corrections = relationship("Correction", back_populates="original_record", foreign_keys="Correction.original_record_id")
