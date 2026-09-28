"""AquaTrust AI — Reading Repository."""

from typing import Optional, List
from uuid import UUID
from datetime import datetime
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

    def get_readings(
        self,
        facility_id: Optional[UUID] = None,
        parameter: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        quality_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
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

        stmt = stmt.order_by(desc(Reading.observed_at)).offset(skip).limit(limit)
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
