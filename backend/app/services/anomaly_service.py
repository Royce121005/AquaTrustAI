"""AquaTrust AI — AI Anomaly Detection Service.

Integrates the 56 trained Isolation Forest models with PostgreSQL sliding-window cache hydration.
"""

from decimal import Decimal
from typing import Optional, Dict, Any, List
from uuid import uuid4, UUID
from sqlalchemy.orm import Session

from app.db.base import utc_now
from app.models.reading import Reading
from app.models.anomaly_result import AnomalyResult
from app.repositories.reading_repository import ReadingRepository
from ml.inference import AquaTrustAnomalyInferenceEngine, AnomalyInferenceOutput
from ml.inference.schemas import CanonicalReadingInput


class AnomalyService:
    """Service executing machine learning anomaly inference on wastewater streams."""

    _engine: Optional[AquaTrustAnomalyInferenceEngine] = None

    @classmethod
    def get_engine(cls) -> AquaTrustAnomalyInferenceEngine:
        """Singleton accessor for the anomaly inference engine."""
        if cls._engine is None:
            cls._engine = AquaTrustAnomalyInferenceEngine()
        return cls._engine

    @classmethod
    def hydrate_stream_cache(cls, db: Session, facility_id: UUID, parameter: str, stage: Optional[str] = None):
        """Hydrate StreamContextCache with historical readings from PostgreSQL on cold start."""
        engine = cls.get_engine()
        stream_key = f"{facility_id}:{stage or 'final_effluent'}:{parameter.lower()}"

        # If cache has fewer than 3 observations, query DB
        if engine.cache.get_history_length(stream_key) < 3:
            reading_repo = ReadingRepository(db)
            history = reading_repo.get_historical_stream_window(
                facility_id=facility_id,
                parameter=parameter,
                measurement_stage=stage,
                limit=20,
            )
            for r in history:
                if r.value is not None:
                    engine.cache.update(stream_key, r.observed_at, float(r.value))

    @classmethod
    def infer_reading(cls, db: Session, reading: Reading) -> AnomalyResult:
        """Run ML anomaly inference on an observation and persist outcome into anomaly_results."""
        engine = cls.get_engine()
        reading_repo = ReadingRepository(db)

        # 1. Warm cache if needed
        cls.hydrate_stream_cache(
            db=db,
            facility_id=reading.facility_id,
            parameter=reading.parameter,
            stage=reading.treatment_stage,
        )

        # 2. Build canonical input
        inp = CanonicalReadingInput(
            facility_id=str(reading.facility_id),
            sensor_id=str(reading.sensor_id or ""),
            timestamp=reading.observed_at,
            measurement_stage=reading.treatment_stage or "final_effluent",
            parameter=reading.parameter,
            value=float(reading.value) if reading.value is not None else None,
            unit=reading.unit,
            quality_status=reading.quality_status,
        )

        # 3. Execute inference
        try:
            output: AnomalyInferenceOutput = engine.predict(inp, update_cache=True)
            anomaly_status = output.anomaly_status
            anomaly_score = Decimal(f"{output.anomaly_score:.10f}") if output.anomaly_score is not None else None
            metadata = {
                "features": output.features_used,
                "latency_ms": output.inference_latency_ms,
                "threshold": output.threshold,
            }
        except Exception as exc:
            anomaly_status = "insufficient_data"
            anomaly_score = None
            metadata = {"error": str(exc)}

        # Create or update AnomalyResult
        existing = reading_repo.get_anomaly_result(reading.reading_id)
        if existing:
            existing.anomaly_status = anomaly_status
            existing.anomaly_score = anomaly_score
            existing.model_metadata = metadata
            existing.inference_at = utc_now()
            db.flush()
            return existing

        anom_res = AnomalyResult(
            anomaly_result_id=uuid4(),
            reading_id=reading.reading_id,
            anomaly_status=anomaly_status,
            anomaly_score=anomaly_score,
            model_version=engine.model_version,
            feature_set_version=engine.feature_set_version,
            inference_at=utc_now(),
            model_metadata=metadata,
        )
        reading_repo.add_anomaly_result(anom_res)
        db.flush()
        return anom_res
