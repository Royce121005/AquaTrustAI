"""AquaTrust AI — Digital Twin ORM Models.

Provides persistent virtual STP state representations, versioned state history,
state transition events, what-if scenarios, scenario comparative outputs,
process model registry, and evidence-gated predictions/recommendations.
Conforms to MASTER/DATABASE_SCHEMA.md with PostgreSQL & SQLite cross-dialect compatibility.
"""

from uuid import uuid4
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Numeric,
    ForeignKey,
    Index,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class TwinConfiguration(Base):
    """Versioned facility treatment configuration and digital twin parameters."""

    __tablename__ = "twin_configurations"

    config_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    facility_id = Column(
        UUID(as_uuid=True),
        ForeignKey("facilities.facility_id", ondelete="CASCADE"),
        nullable=False,
    )
    version = Column(Integer, nullable=False, default=1)
    facility_profile_version = Column(String, nullable=False, default="profile-v1.0")
    technology_type = Column(String, nullable=False, default="activated_sludge")
    treatment_stages = Column(JSONField, nullable=False, default=list)
    sensors_config = Column(JSONField, nullable=False, default=dict)
    operating_variables = Column(JSONField, nullable=False, default=dict)
    model_version = Column(String, nullable=False, default="aquatrust-process-v1.0")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)
    updated_at = Column(UTCDateTime, nullable=False, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        UniqueConstraint("facility_id", "version", name="uq_twin_configs_facility_version"),
        Index("ix_twin_configs_facility_active", "facility_id", "is_active"),
    )

    facility = relationship("Facility")


class TwinState(Base):
    """Persisted virtual STP state snapshot with monotonic per-facility state version."""

    __tablename__ = "twin_states"

    state_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    facility_id = Column(
        UUID(as_uuid=True),
        ForeignKey("facilities.facility_id", ondelete="CASCADE"),
        nullable=False,
    )
    state_version = Column(Integer, nullable=False)
    observed_at = Column(UTCDateTime, nullable=False)
    source_mode = Column(String, nullable=False, default="simulation")  # 'live', 'historical_replay', 'simulation'
    facility_profile_version = Column(String, nullable=False, default="profile-v1.0")
    stage_states = Column(JSONField, nullable=False, default=dict)
    sensor_states = Column(JSONField, nullable=False, default=dict)
    latest_observations = Column(JSONField, nullable=False, default=dict)
    last_accepted_observation_at = Column(UTCDateTime, nullable=True)
    latest_received_observation_at = Column(UTCDateTime, nullable=True)
    data_quality = Column(String, nullable=False, default="valid")  # 'valid', 'suspect', 'invalid', 'insufficient_data'
    state_freshness = Column(String, nullable=False, default="fresh")  # 'fresh', 'stale', 'expired'
    process_model_version = Column(String, nullable=False, default="aquatrust-process-v1.0")
    last_processed_reading_id = Column(
        UUID(as_uuid=True),
        ForeignKey("readings.reading_id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)

    __table_args__ = (
        UniqueConstraint("facility_id", "state_version", name="uq_twin_states_facility_version"),
        Index("ix_twin_states_facility_observed", "facility_id", "observed_at"),
        Index("ix_twin_states_facility_version", "facility_id", "state_version"),
    )

    facility = relationship("Facility")
    last_processed_reading = relationship("Reading")


class TwinStateEvent(Base):
    """Immutable audit trail of transitions and observations that generated each state version."""

    __tablename__ = "twin_state_events"

    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    facility_id = Column(
        UUID(as_uuid=True),
        ForeignKey("facilities.facility_id", ondelete="CASCADE"),
        nullable=False,
    )
    reading_id = Column(
        UUID(as_uuid=True),
        ForeignKey("readings.reading_id", ondelete="SET NULL"),
        nullable=True,
    )
    previous_state_version = Column(Integer, nullable=True)
    new_state_version = Column(Integer, nullable=False)
    event_type = Column(String, nullable=False)  # 'observation_applied', 'observation_rejected', 'observation_flagged_suspect', 'state_initialized'
    event_payload = Column(JSONField, nullable=False, default=dict)
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)

    __table_args__ = (
        Index("ix_twin_events_facility_version", "facility_id", "new_state_version"),
        Index("ix_twin_events_reading", "reading_id"),
    )

    facility = relationship("Facility")
    reading = relationship("Reading")


class TwinModelVersion(Base):
    """Registry of treatment-process models and ML predictors with configuration hashes."""

    __tablename__ = "twin_model_versions"

    model_version_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    model_name = Column(String, nullable=False)
    model_type = Column(String, nullable=False)  # 'process_model', 'predictor', 'hybrid'
    version = Column(String, nullable=False)
    configuration_hash = Column(String, nullable=False)  # SHA-256
    parameters = Column(JSONField, nullable=False, default=dict)
    validation_status = Column(String, nullable=False, default="validated")  # 'validated', 'experimental', 'deprecated'
    validation_metrics = Column(JSONField, nullable=True, default=dict)
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)

    __table_args__ = (
        UniqueConstraint("model_name", "version", name="uq_twin_models_name_version"),
        Index("ix_twin_models_hash", "configuration_hash"),
    )


class TwinScenario(Base):
    """What-if scenario configuration and execution lifecycle."""

    __tablename__ = "twin_scenarios"

    scenario_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    facility_id = Column(
        UUID(as_uuid=True),
        ForeignKey("facilities.facility_id", ondelete="CASCADE"),
        nullable=False,
    )
    base_state_version = Column(Integer, nullable=False)
    scenario_type = Column(String, nullable=False)
    scenario_name = Column(String, nullable=False)
    parameters = Column(JSONField, nullable=False, default=dict)
    duration_minutes = Column(Integer, nullable=False, default=120)
    time_step_seconds = Column(Integer, nullable=False, default=900)
    random_seed = Column(Integer, nullable=True, default=42)
    status = Column(String, nullable=False, default="pending")  # 'pending', 'running', 'completed', 'failed'
    error_details = Column(String, nullable=True)
    model_version = Column(String, nullable=False, default="aquatrust-process-v1.0")
    created_by = Column(String, nullable=True)
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)
    completed_at = Column(UTCDateTime, nullable=True)

    __table_args__ = (
        Index("ix_twin_scenarios_facility", "facility_id"),
        Index("ix_twin_scenarios_status", "status"),
    )

    facility = relationship("Facility")
    results = relationship("TwinScenarioResult", back_populates="scenario", cascade="all, delete-orphan")


class TwinScenarioResult(Base):
    """Comparative time series step results generated during what-if scenario execution."""

    __tablename__ = "twin_scenario_results"

    result_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    scenario_id = Column(
        UUID(as_uuid=True),
        ForeignKey("twin_scenarios.scenario_id", ondelete="CASCADE"),
        nullable=False,
    )
    step_index = Column(Integer, nullable=False)
    simulation_timestamp = Column(UTCDateTime, nullable=False)
    treatment_stage = Column(String, nullable=False)
    parameter = Column(String, nullable=False)
    baseline_value = Column(Numeric(20, 6), nullable=True)
    scenario_value = Column(Numeric(20, 6), nullable=True)
    unit = Column(String, nullable=False)
    estimated_compliance_status = Column(String, nullable=False, default="compliant")
    uncertainty_interval = Column(JSONField, nullable=True, default=dict)
    data_origin = Column(String, nullable=False, default="simulated")

    __table_args__ = (
        Index("ix_twin_scen_res_scen_step", "scenario_id", "step_index"),
        Index("ix_twin_scen_res_scen_stage", "scenario_id", "treatment_stage"),
    )

    scenario = relationship("TwinScenario", back_populates="results")


class TwinPrediction(Base):
    """Persisted forward water-quality predictions derived from validated process models or ML predictors."""

    __tablename__ = "twin_predictions"

    prediction_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    facility_id = Column(
        UUID(as_uuid=True),
        ForeignKey("facilities.facility_id", ondelete="CASCADE"),
        nullable=False,
    )
    base_state_version = Column(Integer, nullable=False)
    model_version = Column(String, nullable=False)
    horizon_hours = Column(Numeric(10, 2), nullable=False)
    predicted_values = Column(JSONField, nullable=False, default=dict)
    uncertainty_bounds = Column(JSONField, nullable=True, default=dict)
    input_features = Column(JSONField, nullable=True, default=dict)
    status = Column(String, nullable=False, default="ready")  # 'ready', 'insufficient_data', 'failed'
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)

    __table_args__ = (
        Index("ix_twin_predictions_facility_version", "facility_id", "base_state_version"),
    )

    facility = relationship("Facility")


class TwinRecommendation(Base):
    """Advisory operational recommendations derived from process analysis and scenario evaluation."""

    __tablename__ = "twin_recommendations"

    recommendation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    facility_id = Column(
        UUID(as_uuid=True),
        ForeignKey("facilities.facility_id", ondelete="CASCADE"),
        nullable=False,
    )
    scenario_id = Column(
        UUID(as_uuid=True),
        ForeignKey("twin_scenarios.scenario_id", ondelete="SET NULL"),
        nullable=True,
    )
    recommendation_type = Column(String, nullable=False)
    priority = Column(String, nullable=False, default="review")  # 'info', 'review', 'warning', 'urgent'
    evidence = Column(JSONField, nullable=False, default=list)
    suggested_action = Column(String, nullable=False)
    expected_outcome = Column(String, nullable=True)
    limitations = Column(JSONField, nullable=False, default=list)
    requires_human_review = Column(Boolean, nullable=False, default=True)
    status = Column(String, nullable=False, default="active")  # 'active', 'acknowledged', 'dismissed'
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)

    __table_args__ = (
        Index("ix_twin_rec_facility_status", "facility_id", "status"),
    )

    facility = relationship("Facility")
    scenario = relationship("TwinScenario")
