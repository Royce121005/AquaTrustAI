"""AquaTrust AI — Reading Repository."""

from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.models.reading import Reading
from app.models.validation_result import ValidationResult
from app.models.anomaly_result import AnomalyResult
from app.repositories.base import BaseRepository


class ReadingRepository(BaseRepository[Reading]):
    """Repository handling raw telemetry, validation results, and anomaly inferences."""

    def __init__(self, db: Session):
        super().__init__(db, Reading)

    def get_by_id(self, reading_id: UUID) -> Optional[Reading]:
        """Fetch reading by UUID."""
        return self.get(reading_id)

    def get_by_idempotency_or_time_key(
        self,
        facility_id: UUID,
        parameter: str,
        treatment_stage: Optional[str],
        observed_at: datetime,
        idempotency_key: Optional[str] = None,
    ) -> Optional[Reading]:
        """Fetch existing reading matching idempotency_key or natural composite key (facility, parameter, stage, observed_at)."""
        # 1. Check natural composite time key
        stmt = select(Reading).where(
            Reading.facility_id == facility_id,
            Reading.parameter == parameter,
            Reading.observed_at == observed_at,
        )
        if treatment_stage is not None:
            stmt = stmt.where(Reading.treatment_stage == treatment_stage)
        else:
            stmt = stmt.where(Reading.treatment_stage.is_(None))

        existing = self.db.scalars(stmt).first()
        if existing:
            return existing

        # 2. If idempotency_key provided, search facility readings provenance
        if idempotency_key:
            recent_stmt = (
                select(Reading)
                .where(Reading.facility_id == facility_id)
                .order_by(desc(Reading.observed_at))
                .limit(500)
            )
            for r in self.db.scalars(recent_stmt).all():
                if r.provenance and isinstance(r.provenance, dict):
                    if r.provenance.get("idempotency_key") == idempotency_key:
                        return r

        return None

    def get_contemporaneous_readings(
        self,
        facility_id: UUID,
        observed_at: datetime,
        tolerance_seconds: int = 300,
        treatment_stage: Optional[str] = None,
    ) -> List[Reading]:
        """Fetch readings from the same facility within a temporal tolerance window."""
        start_time = observed_at - timedelta(seconds=tolerance_seconds)
        end_time = observed_at + timedelta(seconds=tolerance_seconds)
        stmt = select(Reading).where(
            Reading.facility_id == facility_id,
            Reading.observed_at >= start_time,
            Reading.observed_at <= end_time,
        )
        if treatment_stage is not None:
            stmt = stmt.where(Reading.treatment_stage == treatment_stage)

        stmt = stmt.order_by(Reading.observed_at.asc())
        return list(self.db.scalars(stmt).all())

    def get_readings(
        self,
        facility_id: Optional[UUID] = None,
        parameter: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        quality_status: Optional[str] = None,
        skip: int = 0,
        limit: Optional[int] = 100,
    ) -> List[Reading]:
        """Query readings with multi-dimensional filtering."""
        stmt = select(Reading)
        if facility_id:
            stmt = stmt.where(Reading.facility_id == facility_id)
        if parameter:
            stmt = stmt.where(Reading.parameter == parameter)
        if start_time:
            stmt = stmt.where(Reading.observed_at >= start_time)
        if end_time:
            stmt = stmt.where(Reading.observed_at <= end_time)
        if quality_status:
            stmt = stmt.where(Reading.quality_status == quality_status)

        stmt = stmt.order_by(desc(Reading.observed_at)).offset(skip)
        if limit is not None:
            stmt = stmt.limit(limit)
        return list(self.db.scalars(stmt).all())

    def get_readings_in_window(
        self,
        facility_id: UUID,
        start_time: datetime,
        end_time: datetime,
        treatment_stage: Optional[str] = None,
        quality_status: Optional[str] = None,
    ) -> List[Reading]:
        """Fetch ALL readings in a composite window chronologically ascending without arbitrary limit cap."""
        stmt = select(Reading).where(
            Reading.facility_id == facility_id,
            Reading.observed_at >= start_time,
            Reading.observed_at <= end_time,
        )
        if treatment_stage is not None:
            stmt = stmt.where(Reading.treatment_stage == treatment_stage)
        if quality_status is not None:
            stmt = stmt.where(Reading.quality_status == quality_status)

        stmt = stmt.order_by(Reading.observed_at.asc())
        return list(self.db.scalars(stmt).all())

    def get_historical_stream_window(
        self,
        facility_id: UUID,
        parameter: str,
        measurement_stage: Optional[str] = None,
        limit: int = 20,
    ) -> List[Reading]:
        """Hydrate sliding window context for AI inference ordered chronologically (observed_at ASC)."""
        stmt = select(Reading).where(
            Reading.facility_id == facility_id,
            Reading.parameter == parameter,
        )
        if measurement_stage:
            stmt = stmt.where(Reading.treatment_stage == measurement_stage)

        # Get latest `limit` readings descending, then return sorted chronologically ascending
        stmt = stmt.order_by(desc(Reading.observed_at)).limit(limit)
        results = list(self.db.scalars(stmt).all())
        results.reverse()
        return results

    def create_reading(self, reading: Reading) -> Reading:
        """Persist a single telemetry reading."""
        return self.create(reading)

    def create_batch(self, readings: List[Reading]) -> List[Reading]:
        """Bulk persist a batch of telemetry readings."""
        self.db.add_all(readings)
        self.db.flush()
        return readings

    def add_validation_result(self, validation_result: ValidationResult) -> ValidationResult:
        """Persist deterministic pre-AI validation outcome."""
        self.db.add(validation_result)
        self.db.flush()
        return validation_result

    def get_validation_result(self, reading_id: UUID) -> Optional[ValidationResult]:
        """Fetch validation result for a reading."""
        stmt = select(ValidationResult).where(ValidationResult.reading_id == reading_id)
        return self.db.scalars(stmt).first()

    def add_anomaly_result(self, anomaly_result: AnomalyResult) -> AnomalyResult:
        """Persist ML anomaly detection result."""
        self.db.add(anomaly_result)
        self.db.flush()
        return anomaly_result

    def get_anomaly_result(self, reading_id: UUID) -> Optional[AnomalyResult]:
        """Fetch anomaly result for a reading."""
        stmt = select(AnomalyResult).where(AnomalyResult.reading_id == reading_id)
        return self.db.scalars(stmt).first()
