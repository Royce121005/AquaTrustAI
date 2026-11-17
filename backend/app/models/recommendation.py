"""AquaTrust AI — Process Recommendation ORM Model (Member 2 Phase 4)."""

from uuid import uuid4
from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class Recommendation(Base):
    """Stores actionable prescriptive recommendations generated from AI/ML anomaly and prediction signals."""

    __tablename__ = "recommendations"

    recommendation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.facility_id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(UTCDateTime, nullable=False, default=utc_now)
    title = Column(String(255), nullable=False)
    action = Column(Text, nullable=False)
    category = Column(String(64), nullable=False, default="AERATION")
    severity = Column(String(32), nullable=False, default="MEDIUM")
    urgency = Column(String(32), nullable=False, default="WITHIN_1_HOUR")
    related_parameter = Column(String(64), nullable=False, default="general")
    trigger_source = Column(String(64), nullable=False, default="AI_INFERENCE")
    reason = Column(Text, nullable=True)
    parameter_target = Column(JSONField, nullable=True)
    estimated_impact = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="active")  # 'active', 'applied', 'dismissed', 'superseded'
    applied_at = Column(UTCDateTime, nullable=True)
    applied_by = Column(UUID(as_uuid=True), nullable=True)
    recommendation_metadata = Column("metadata", JSONField, nullable=True, default=dict)
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)

    # Relationships
    facility = relationship("Facility", backref="recommendations")
