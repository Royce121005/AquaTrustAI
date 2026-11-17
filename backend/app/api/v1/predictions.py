"""AquaTrust AI — Quality Prediction Router (Member 2 Phase 3)."""

from typing import Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user_claims, require_role
from app.schemas.prediction import (
    PredictionEvaluateRequest,
    PredictionResponse,
    PredictionLatestResponse,
)
from app.services.prediction_service import PredictionService

router = APIRouter(prefix="/predictions", tags=["Treatment Quality Predictions"])


@router.post(
    "/evaluate",
    response_model=PredictionResponse,
    summary="Evaluate downstream effluent water quality forecast using AI supervised model",
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
def evaluate_prediction(
    payload: PredictionEvaluateRequest,
    claims: Dict[str, Any] = Depends(get_current_user_claims),
    db: Session = Depends(get_db),
):
    """
    Executes supervised ML forecasting 4-8 hours ahead against CPCB Schedule VI discharge limits.
    Supports explicit influent inputs or automatic resolution from recent online telemetry.
    """
    service = PredictionService(db)
    actor_id_str = claims.get("sub")
    actor_id = None
    if actor_id_str:
        try:
            actor_id = UUID(actor_id_str)
        except (ValueError, TypeError, AttributeError):
            actor_id = None
    actor_role = claims.get("role", "operator")

    return service.evaluate_prediction(payload, actor_id=actor_id, actor_role=actor_role)


@router.get(
    "/latest",
    response_model=PredictionLatestResponse,
    summary="Get newest effluent water quality forecast for a facility",
    dependencies=[Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"]))],
)
def get_latest_prediction(
    facility_id: UUID = Query(..., description="Target facility ID"),
    db: Session = Depends(get_db),
):
    """Retrieves the most recent predictive effluent forecast, generating a fresh baseline if none exists."""
    service = PredictionService(db)
    return service.get_latest_prediction(facility_id)
