"""AquaTrust AI — Quality Prediction ORM Model (Member 2 Phase 3)."""

from uuid import uuid4
from sqlalchemy import Column, String, Float, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class Prediction(Base):
    """Stores downstream effluent water quality predictions and regulatory risk scores."""

    __tablename__ = "predictions"

    prediction_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.facility_id", ondelete="CASCADE"), nullable=False)
    treatment_stage = Column(String(64), nullable=False, default="effluent")
    cycle_timestamp = Column(UTCDateTime, nullable=False, default=utc_now)
    horizon_hours = Column(Float, nullable=False, default=6.0)
    predicted_parameters = Column(JSONField, nullable=False, default=dict)
    overall_risk_status = Column(String(32), nullable=False, default="LOW_RISK")
    overall_risk_score = Column(Float, nullable=False, default=0.0)
    is_cpcb_compliant = Column(Boolean, nullable=False, default=True)
    model_version = Column(String(64), nullable=False, default="treatment_predictor_v1.0.0")
    summary_explanation = Column(Text, nullable=True)
    prediction_metadata = Column("metadata", JSONField, nullable=True, default=dict)
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)

    # Relationships
    facility = relationship("Facility", backref="predictions")
