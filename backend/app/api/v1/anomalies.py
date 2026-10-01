"""AquaTrust AI — AI Anomaly Detection Router."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.db.session import get_db
from app.models.reading import Reading
from app.models.anomaly_result import AnomalyResult
from app.repositories.reading_repository import ReadingRepository
from app.services.anomaly_service import AnomalyService
from app.core.security import get_current_user_claims, require_role
from app.schemas.anomaly import (
    AnomalyInferRequest,
    AnomalyInferResponse,
    AnomalyMetricsSummary,
)
from ml.inference.schemas import CanonicalReadingInput

router = APIRouter(tags=["AI Anomaly Detection"])


@router.post(
    "/anomalies/infer",
    response_model=AnomalyInferResponse,
    summary="Execute AI anomaly inference on a reading",
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
def infer_anomaly(payload: AnomalyInferRequest, db: Session = Depends(get_db)):
    """Run Isolation Forest anomaly inference on a reading or ad-hoc payload."""
    if payload.reading_id is not None:
        reading_repo = ReadingRepository(db)
        reading = reading_repo.get_by_id(payload.reading_id)
        if not reading:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reading {payload.reading_id} not found")

        anom_res = AnomalyService.infer_reading(db, reading)
        db.commit()
        db.refresh(anom_res)

        return AnomalyInferResponse(
            anomaly_result_id=anom_res.anomaly_result_id,
            reading_id=anom_res.reading_id,
            anomaly_status=anom_res.anomaly_status,
            anomaly_score=anom_res.anomaly_score,
            model_version=anom_res.model_version,
            feature_set_version=anom_res.feature_set_version,
            is_anomalous=(anom_res.anomaly_status == "anomalous"),
            features=anom_res.model_metadata.get("features") if anom_res.model_metadata else None,
            inference_at=anom_res.inference_at,
        )

    # Ad-hoc inference
    if not payload.facility_id or not payload.parameter or payload.value is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either reading_id or (facility_id, parameter, value) must be provided",
        )

    engine = AnomalyService.get_engine()
    inp = CanonicalReadingInput(
        facility_id=str(payload.facility_id),
        parameter=payload.parameter,
        value=float(payload.value),
        unit=payload.unit or "mg/L",
        timestamp=payload.observed_at or datetime.now(timezone.utc),
        measurement_stage=payload.treatment_stage or "final_effluent",
    )
    output = engine.predict(inp, update_cache=True)

    return AnomalyInferResponse(
        anomaly_status=output.anomaly_status,
        anomaly_score=Decimal(f"{output.anomaly_score:.10f}") if output.anomaly_score is not None else None,
        model_version=engine.model_version,
        feature_set_version=engine.feature_set_version,
        is_anomalous=(output.anomaly_status == "anomalous"),
        features=output.features_used,
        inference_at=datetime.now(timezone.utc),
    )


@router.get(
    "/anomalies/readings/{reading_id}",
    response_model=AnomalyInferResponse,
    summary="Get anomaly report for a reading",
    dependencies=[Depends(get_current_user_claims)],
)
def get_anomaly_report(reading_id: UUID, db: Session = Depends(get_db)):
    """Retrieve anomaly inference report for a reading."""
    reading_repo = ReadingRepository(db)
    anom_res = reading_repo.get_anomaly_result(reading_id)
    if not anom_res:
        reading = reading_repo.get_by_id(reading_id)
        if not reading:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reading {reading_id} not found")
        anom_res = AnomalyService.infer_reading(db, reading)
        db.commit()

    return AnomalyInferResponse(
        anomaly_result_id=anom_res.anomaly_result_id,
        reading_id=anom_res.reading_id,
        anomaly_status=anom_res.anomaly_status,
        anomaly_score=anom_res.anomaly_score,
        model_version=anom_res.model_version,
        feature_set_version=anom_res.feature_set_version,
        is_anomalous=(anom_res.anomaly_status == "anomalous"),
        features=anom_res.model_metadata.get("features") if anom_res.model_metadata else None,
        inference_at=anom_res.inference_at,
    )


@router.get(
    "/anomalies/metrics",
    response_model=AnomalyMetricsSummary,
    summary="Get anomaly detection summary metrics",
    dependencies=[Depends(get_current_user_claims)],
)
def get_anomaly_metrics(db: Session = Depends(get_db)):
    """Summary metrics supporting frontend insights dashboard."""
    engine = AnomalyService.get_engine()
    total = db.scalar(select(func.count()).select_from(AnomalyResult)) or 0
    anomalies = db.scalar(select(func.count()).select_from(AnomalyResult).where(AnomalyResult.anomaly_status == "anomalous")) or 0
    rate = (float(anomalies) / float(total) * 100.0) if total > 0 else 0.0

    recent_stmt = select(AnomalyResult).where(AnomalyResult.anomaly_status == "anomalous").order_by(desc(AnomalyResult.inference_at)).limit(10)
    recent_rows = list(db.scalars(recent_stmt).all())
    events = [
        {
            "anomaly_result_id": str(r.anomaly_result_id),
            "reading_id": str(r.reading_id),
            "anomaly_score": float(r.anomaly_score) if r.anomaly_score else None,
            "inference_at": r.inference_at.isoformat(),
        }
        for r in recent_rows
    ]

    return AnomalyMetricsSummary(
        total_inferences=total,
        anomalies_detected=anomalies,
        anomaly_rate_percent=round(rate, 2),
        model_version=engine.model_version,
        recent_events=events,
    )

