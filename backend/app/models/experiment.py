"""AquaTrust AI — Experiment ORM Models."""

from uuid import uuid4
from sqlalchemy import Column, String, Integer, Numeric, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import JSONField, UTCDateTime


class ExperimentRun(Base):
    """Represents benchmark and experiment execution runs."""

    __tablename__ = "experiment_runs"

    experiment_run_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    experiment_name = Column(String, nullable=False)
    architecture_variant = Column(String, nullable=False)  # e.g., 'monolithic', 'decoupled'
    workload_size = Column(Integer, nullable=False)
    scenario_id = Column(String, nullable=True)
    environment_snapshot = Column(JSONField, nullable=True, default=dict)
    seed = Column(Integer, nullable=True)
    started_at = Column(UTCDateTime, nullable=False, default=utc_now)
    ended_at = Column(UTCDateTime, nullable=True)
    status = Column(String, nullable=False, default="running")  # 'running', 'completed', 'failed'

    metrics = relationship("ExperimentMetric", back_populates="experiment_run", cascade="all, delete-orphan")


class ExperimentMetric(Base):
    """Represents granular benchmark metrics collected during experiment runs."""

    __tablename__ = "experiment_metrics"

    metric_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    experiment_run_id = Column(UUID(as_uuid=True), ForeignKey("experiment_runs.experiment_run_id", ondelete="CASCADE"), nullable=False)
    metric_name = Column(String, nullable=False)  # e.g., 'throughput_eps', 'latency_p95_ms'
    metric_value = Column(Numeric(20, 6), nullable=False)
    unit = Column(String, nullable=False)  # 'eps', 'ms', 'MB'
    percentile = Column(String, nullable=True)
    sample_count = Column(Integer, nullable=True)
    measurement_metadata = Column(JSONField, nullable=True, default=dict)

    __table_args__ = (
        Index("ix_experiment_metrics_run_id", "experiment_run_id"),
    )

    experiment_run = relationship("ExperimentRun", back_populates="metrics")
