"""AquaTrust AI — Anomaly Result ORM Model."""

from uuid import uuid4
from sqlalchemy import Column, String, Numeric, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class AnomalyResult(Base):
    """Represents machine learning anomaly detection inference outcomes."""

    __tablename__ = "anomaly_results"

    anomaly_result_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    reading_id = Column(UUID(as_uuid=True), ForeignKey("readings.reading_id", ondelete="CASCADE"), nullable=False)
    anomaly_status = Column(String, nullable=False)  # 'normal', 'anomalous', 'insufficient_data'
    anomaly_score = Column(Numeric(20, 10), nullable=True)
    model_version = Column(String, nullable=False)
    feature_set_version = Column(String, nullable=False, default="v1.0")
    inference_at = Column(UTCDateTime, nullable=False, default=utc_now)
    model_metadata = Column(JSONField, nullable=True, default=dict)

    __table_args__ = (
        Index("ix_anomaly_results_reading_id", "reading_id"),
    )

    # Relationships
    reading = relationship("Reading", back_populates="anomaly_results")
