"""AquaTrust AI — Correction ORM Model."""

from uuid import uuid4
from sqlalchemy import Column, String, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class Correction(Base):
    """Represents append-only corrections referencing finalized treatment records."""

    __tablename__ = "corrections"

    correction_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    original_record_id = Column(UUID(as_uuid=True), ForeignKey("treatment_records.record_id", ondelete="RESTRICT"), nullable=False)
    requested_by = Column(UUID(as_uuid=True), nullable=False)
    authorized_by = Column(UUID(as_uuid=True), nullable=True)
    reason = Column(String, nullable=False)
    proposed_changes = Column(JSONField, nullable=False, default=dict)
    status = Column(String, nullable=False, default="pending")  # 'pending', 'authorized', 'rejected', 'applied'
    corrected_record_id = Column(UUID(as_uuid=True), ForeignKey("treatment_records.record_id", ondelete="SET NULL"), nullable=True)
    new_certificate_id = Column(UUID(as_uuid=True), nullable=True)
    new_hash = Column(String(64), nullable=True)
    new_signature_id = Column(UUID(as_uuid=True), nullable=True)
    new_dlt_anchor_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)
    authorized_at = Column(UTCDateTime, nullable=True)
    completed_at = Column(UTCDateTime, nullable=True)

    __table_args__ = (
        Index("ix_corrections_original_record", "original_record_id"),
    )

    # Relationships
    original_record = relationship("TreatmentRecord", foreign_keys=[original_record_id], back_populates="corrections")
    corrected_record = relationship("TreatmentRecord", foreign_keys=[corrected_record_id])
