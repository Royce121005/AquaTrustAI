"""AquaTrust AI — Certificate ORM Model."""

from uuid import uuid4
from sqlalchemy import Column, String, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class Certificate(Base):
    """Represents a digital treatment certificate issued upon record finalization."""

    __tablename__ = "certificates"

    certificate_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("treatment_records.record_id", ondelete="CASCADE"), unique=True, nullable=False)
    certificate_version = Column(String, nullable=False, default="1.0.0")
    issuer_identity = Column(String, nullable=False)
    issued_at = Column(UTCDateTime, nullable=False, default=utc_now)
    compliance_summary = Column(JSONField, nullable=False, default=dict)
    canonical_hash = Column(String(64), nullable=False)
    signature_id = Column(UUID(as_uuid=True), nullable=False)
    dlt_anchor_id = Column(UUID(as_uuid=True), nullable=True)
    status = Column(String, nullable=False, default="valid")  # 'valid', 'revoked', 'superseded'

    __table_args__ = (
        Index("ix_certificates_canonical_hash", "canonical_hash"),
    )

    # Relationships
    treatment_record = relationship("TreatmentRecord", back_populates="certificate")
    dlt_anchors = relationship("DLTAnchor", back_populates="certificate")
