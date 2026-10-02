"""AquaTrust AI — Compliance Result ORM Model."""

from uuid import uuid4
from sqlalchemy import Column, String, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class ComplianceResult(Base):
    """Represents environmental compliance evaluation verdicts against treatment records."""

    __tablename__ = "compliance_results"

    compliance_result_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    treatment_record_id = Column(UUID(as_uuid=True), ForeignKey("treatment_records.record_id", ondelete="CASCADE"), nullable=False)
    compliance_status = Column(String, nullable=False)  # 'compliant', 'non_compliant', 'not_applicable'
    rule_version = Column(String, nullable=False, default="1.0.0")
    parameter_results = Column(JSONField, nullable=False, default=dict)
    evaluated_at = Column(UTCDateTime, nullable=False, default=utc_now)

    __table_args__ = (
        Index("ix_compliance_results_record_id", "treatment_record_id"),
        Index("idx_compliance_results_status_date", "compliance_status", "evaluated_at"),
    )

    # Relationships
    treatment_record = relationship("TreatmentRecord", back_populates="compliance_results")
