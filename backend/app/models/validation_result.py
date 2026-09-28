"""AquaTrust AI — Validation Result ORM Model."""

from uuid import uuid4
from sqlalchemy import Column, String, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class ValidationResult(Base):
    """Represents deterministic pre-AI data-trust validation outcomes."""

    __tablename__ = "validation_results"

    validation_result_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    reading_id = Column(UUID(as_uuid=True), ForeignKey("readings.reading_id", ondelete="CASCADE"), nullable=False)
    quality_status = Column(String, nullable=False)  # 'valid', 'invalid', 'suspect', 'insufficient_data'
    validation_flags = Column(JSONField, nullable=False, default=list)
    validation_version = Column(String, nullable=False, default="1.0.0")
    validated_at = Column(UTCDateTime, nullable=False, default=utc_now)

    __table_args__ = (
        Index("ix_validation_results_reading_id", "reading_id"),
    )

    # Relationships
    reading = relationship("Reading", back_populates="validation_results")
