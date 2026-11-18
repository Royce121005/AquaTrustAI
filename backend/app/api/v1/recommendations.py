"""AquaTrust AI — Process Recommendations Router (Member 2 Phase 4)."""

from typing import Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user_claims, require_role
from app.schemas.recommendation import (
    RecommendationResponse,
    RecommendationApplyRequest,
    RecommendationListResponse,
)
from app.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/recommendations", tags=["Prescriptive Process Recommendations"])


@router.get(
    "/active",
    response_model=RecommendationListResponse,
    summary="Get active operational recommendations for a facility",
    dependencies=[Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"]))],
)
def get_active_recommendations(
    facility_id: UUID = Query(..., description="Target facility ID"),
    db: Session = Depends(get_db),
):
    """Retrieves active recommendations (blower throttling, coagulant dosing, clarifier RAS/WAS adjustments)."""
    service = RecommendationService(db)
    return service.get_active_recommendations(facility_id)


@router.get(
    "/history",
    response_model=RecommendationListResponse,
    summary="Get historical recommendations and operator execution log",
    dependencies=[Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"]))],
)
def get_recommendation_history(
    facility_id: UUID = Query(..., description="Target facility ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Queries all past recommendations, including applied and superseded interventions."""
    service = RecommendationService(db)
    return service.get_recommendation_history(facility_id, skip=skip, limit=limit)


@router.post(
    "/{recommendation_id}/apply",
    response_model=RecommendationResponse,
    summary="Acknowledge or apply a recommended setpoint adjustment",
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
def apply_recommendation(
    recommendation_id: UUID,
    payload: RecommendationApplyRequest = RecommendationApplyRequest(),
    claims: Dict[str, Any] = Depends(get_current_user_claims),
    db: Session = Depends(get_db),
):
    """Marks a recommendation as applied, attributing the operator identity and logging an immutable audit record."""
    service = RecommendationService(db)
    actor_id_str = claims.get("user_id") or claims.get("sub")
    actor_id = None
    if actor_id_str:
        try:
            actor_id = UUID(str(actor_id_str))
        except (ValueError, TypeError, AttributeError):
            actor_id = None
    actor_role = claims.get("role", "operator")

    try:
        return service.apply_recommendation(
            recommendation_id, req=payload, actor_id=actor_id, actor_role=actor_role
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
