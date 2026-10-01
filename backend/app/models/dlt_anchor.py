"""AquaTrust AI — DLT Anchor ORM Model."""

from uuid import uuid4
from sqlalchemy import Column, String, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class DLTAnchor(Base):
    """Represents on-chain anchor transactions on Hyperledger Fabric."""

    __tablename__ = "dlt_anchors"

    anchor_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("treatment_records.record_id", ondelete="RESTRICT"), unique=True, nullable=False)
    certificate_id = Column(UUID(as_uuid=True), ForeignKey("certificates.certificate_id", ondelete="SET NULL"), nullable=True)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.facility_id", ondelete="CASCADE"), nullable=False)
    event_timestamp = Column(UTCDateTime, nullable=False, default=utc_now)
    canonical_hash = Column(String(64), nullable=False)
    compliance_status = Column(String, nullable=False)
    signature_metadata = Column(JSONField, nullable=True, default=dict)
    network_reference = Column(JSONField, nullable=True, default=dict)
    transaction_id = Column(String, nullable=True)
    anchor_status = Column(String, nullable=False, default="pending")  # 'pending', 'submitted', 'confirmed', 'failed', 'rejected'
    submitted_at = Column(UTCDateTime, nullable=True)
    confirmed_at = Column(UTCDateTime, nullable=True)
    failure_code = Column(String, nullable=True)
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)

    __table_args__ = (
        Index("ix_dlt_anchors_canonical_hash", "canonical_hash"),
        Index("ix_dlt_anchors_transaction_id", "transaction_id"),
    )

    # Relationships
    treatment_record = relationship("TreatmentRecord", back_populates="dlt_anchor")
    facility = relationship("Facility", back_populates="dlt_anchors")
    certificate = relationship("Certificate", back_populates="dlt_anchors")
