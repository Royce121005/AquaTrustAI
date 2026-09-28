"""AquaTrust AI — Compliance Rule ORM Model."""

from uuid import uuid4
from sqlalchemy import Column, String, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class ComplianceRule(Base):
    """Represents environmental regulatory discharge standards (e.g. CPCB / EPA)."""

    __tablename__ = "compliance_rules"

    rule_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    parameter = Column(String, nullable=False)
    operator = Column(String, nullable=False)  # '<=', '>=', 'BETWEEN'
    threshold = Column(Numeric(20, 6), nullable=True)
    threshold_min = Column(Numeric(20, 6), nullable=True)
    threshold_max = Column(Numeric(20, 6), nullable=True)
    threshold_unit = Column(String, nullable=False)
    facility_scope = Column(JSONField, nullable=True)
    stage_scope = Column(String, nullable=True, default="final_effluent")
    effective_from = Column(UTCDateTime, nullable=False, default=utc_now)
    effective_to = Column(UTCDateTime, nullable=True)
    rule_version = Column(String, nullable=False, default="1.0.0")
    source_reference = Column(String, nullable=False, default="CPCB_2021")
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)
