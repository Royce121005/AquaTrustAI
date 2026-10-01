"""AquaTrust AI — Experiment & Benchmark Repository."""

from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, desc

from app.models.experiment import ExperimentRun, ExperimentMetric
from app.repositories.base import BaseRepository


class ExperimentRepository(BaseRepository[ExperimentRun]):
    """Repository handling benchmark experiment execution runs and metrics."""

    def __init__(self, db: Session):
        super().__init__(db, ExperimentRun)

    def get_run_with_metrics(self, experiment_run_id: UUID) -> Optional[ExperimentRun]:
        """Fetch experiment run with eager loading of associated metrics."""
        stmt = (
            select(ExperimentRun)
            .where(ExperimentRun.experiment_run_id == experiment_run_id)
            .options(selectinload(ExperimentRun.metrics))
        )
        return self.db.scalars(stmt).first()

    def list_runs(
        self,
        experiment_name: Optional[str] = None,
        architecture_variant: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[ExperimentRun]:
        """List benchmark runs with filtering."""
        stmt = select(ExperimentRun)
        if experiment_name:
            stmt = stmt.where(ExperimentRun.experiment_name == experiment_name)
        if architecture_variant:
            stmt = stmt.where(ExperimentRun.architecture_variant == architecture_variant)
        if status:
            stmt = stmt.where(ExperimentRun.status == status)

        stmt = stmt.order_by(desc(ExperimentRun.started_at)).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def record_metric(
        self,
        experiment_run_id: UUID,
        metric_name: str,
        metric_value: Decimal,
        unit: str,
        percentile: Optional[str] = None,
        sample_count: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> ExperimentMetric:
        """Persist a single benchmark metric under an experiment run."""
        metric = ExperimentMetric(
            experiment_run_id=experiment_run_id,
            metric_name=metric_name,
            metric_value=metric_value,
            unit=unit,
            percentile=percentile,
            sample_count=sample_count,
            measurement_metadata=metadata or {},
        )
        self.db.add(metric)
        self.db.flush()
        return metric

    def record_metrics_batch(
        self,
        metrics: List[ExperimentMetric],
    ) -> List[ExperimentMetric]:
        """Bulk persist a batch of benchmark metrics with a single flush."""
        self.db.add_all(metrics)
        self.db.flush()
        return metrics
