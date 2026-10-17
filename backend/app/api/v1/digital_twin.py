"""AquaTrust AI — Digital Twin FastAPI Router.

Provides authenticated, RBAC-enforced REST endpoints for virtual plant state,
versioned history, configuration updates, what-if scenarios, process models,
and evidence-gated predictions/recommendations.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user_claims, require_role
from app.models.user import UserRole
from app.digital_twin.service import DigitalTwinService
from app.digital_twin.schemas import (
    TwinStateResponse,
    TwinHistoryResponse,
    TwinConfigResponse,
    TwinConfigUpdateRequest,
    ScenarioCreateRequest,
    ScenarioResponse,
    ScenarioListResponse,
    TwinPredictionResponse,
    TwinRecommendationResponse,
    TwinModelVersionResponse,
)

router = APIRouter(tags=["Digital Twin Engine"])


def verify_facility_scope(facility_id: UUID, claims: Dict[str, Any]) -> None:
    """Enforces server-side facility-level authorization per RBAC_PERMISSION_MATRIX.md."""
    user_role = claims.get("role")
    scoped_facility = claims.get("facility_id")

    # Admins, auditors, and regulators have multi-facility oversight
    if user_role in (UserRole.ADMIN.value, UserRole.AUDITOR.value, UserRole.REGULATORY_STAKEHOLDER.value, "admin", "auditor", "regulatory_stakeholder"):
        return

    # Plant operators are restricted to their assigned facility
    if scoped_facility and str(scoped_facility) != str(facility_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cross-facility access denied: Operator scoped to '{scoped_facility}', requested '{facility_id}'",
        )


# -----------------------------------------------------------------------------
# 1. Facility Virtual State
# -----------------------------------------------------------------------------

@router.get(
    "/facilities/{facility_id}/twin",
    response_model=TwinStateResponse,
    summary="Retrieve current virtual plant state",
)
def get_facility_twin_state(
    facility_id: UUID,
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"])),
    db: Session = Depends(get_db),
):
    """Retrieve virtual STP state snapshot, stage variables, freshness, and latest observations."""
    verify_facility_scope(facility_id, claims)
    service = DigitalTwinService(db)
    try:
        return service.get_facility_state(facility_id)
    except Exception as ex:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(ex))


@router.get(
    "/facilities/{facility_id}/twin/history",
    response_model=TwinHistoryResponse,
    summary="Retrieve historical state versions",
)
def get_facility_twin_history(
    facility_id: UUID,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"])),
    db: Session = Depends(get_db),
):
    """Paginated retrieval of historical virtual state snapshots."""
    verify_facility_scope(facility_id, claims)
    service = DigitalTwinService(db)
    return service.get_state_history(
        facility_id=facility_id,
        limit=limit,
        offset=offset,
        start_time=start_time,
        end_time=end_time,
    )


@router.post(
    "/facilities/{facility_id}/twin/reconstruct",
    response_model=TwinStateResponse,
    summary="Reconstruct virtual state from event history",
)
def reconstruct_facility_twin_state(
    facility_id: UUID,
    target_version: Optional[int] = Query(None, ge=1),
    claims: Dict[str, Any] = Depends(require_role(["admin", "auditor"])),
    db: Session = Depends(get_db),
):
    """Reconstruct state snapshot by replaying event log up to target version."""
    verify_facility_scope(facility_id, claims)
    service = DigitalTwinService(db)
    try:
        return service.reconstruct_facility_state(facility_id, target_version)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


# -----------------------------------------------------------------------------
# 2. Facility Twin Configuration
# -----------------------------------------------------------------------------

@router.get(
    "/facilities/{facility_id}/twin/config",
    response_model=TwinConfigResponse,
    summary="Retrieve active twin configuration",
)
def get_facility_twin_config(
    facility_id: UUID,
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"])),
    db: Session = Depends(get_db),
):
    """Retrieve active facility process and sensor configuration."""
    verify_facility_scope(facility_id, claims)
    service = DigitalTwinService(db)
    return service.get_configuration(facility_id)


@router.put(
    "/facilities/{facility_id}/twin/config",
    response_model=TwinConfigResponse,
    summary="Update facility configuration (Admin only)",
)
def update_facility_twin_config(
    facility_id: UUID,
    payload: TwinConfigUpdateRequest,
    claims: Dict[str, Any] = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    """Create a new versioned facility configuration. Operator cannot mutate configuration."""
    service = DigitalTwinService(db)
    actor_id = claims.get("username") or claims.get("sub")
    return service.update_configuration(facility_id, payload, actor_id=actor_id)


# -----------------------------------------------------------------------------
# 3. What-If Scenarios
# -----------------------------------------------------------------------------

@router.post(
    "/facilities/{facility_id}/twin/scenarios",
    response_model=ScenarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create and run what-if scenario",
)
def create_facility_scenario(
    facility_id: UUID,
    payload: ScenarioCreateRequest,
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin"])),
    db: Session = Depends(get_db),
):
    """Launch an isolated what-if scenario from a base state version."""
    verify_facility_scope(facility_id, claims)
    service = DigitalTwinService(db)
    actor = claims.get("username") or claims.get("sub")
    try:
        return service.create_and_run_scenario(facility_id, payload, created_by=actor)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as ex:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(ex))


@router.get(
    "/facilities/{facility_id}/twin/scenarios",
    response_model=ScenarioListResponse,
    summary="List facility scenarios",
)
def list_facility_scenarios(
    facility_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"])),
    db: Session = Depends(get_db),
):
    """List what-if scenario runs for a facility."""
    verify_facility_scope(facility_id, claims)
    service = DigitalTwinService(db)
    return service.list_scenarios(facility_id, limit, offset)


@router.get(
    "/twin/scenarios/{scenario_id}",
    response_model=ScenarioResponse,
    summary="Retrieve scenario details and results",
)
def get_scenario_details(
    scenario_id: UUID,
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"])),
    db: Session = Depends(get_db),
):
    """Retrieve full comparative time series and execution metadata for a scenario."""
    service = DigitalTwinService(db)
    try:
        scenario = service.get_scenario(scenario_id)
        verify_facility_scope(scenario.facility_id, claims)
        return scenario
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@router.post(
    "/twin/scenarios/{scenario_id}/run",
    response_model=ScenarioResponse,
    summary="Re-execute scenario",
)
def rerun_scenario(
    scenario_id: UUID,
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin"])),
    db: Session = Depends(get_db),
):
    """Re-run a completed or failed scenario."""
    service = DigitalTwinService(db)
    try:
        scenario_dto = service.get_scenario(scenario_id)
        verify_facility_scope(scenario_dto.facility_id, claims)
        # Re-run from existing parameters
        req = ScenarioCreateRequest(
            base_state_version=scenario_dto.base_state_version,
            scenario_type=scenario_dto.scenario_type,
            scenario_name=scenario_dto.scenario_name,
            duration_minutes=scenario_dto.duration_minutes,
            time_step_seconds=scenario_dto.time_step_seconds,
            parameters=scenario_dto.parameters,
            seed=scenario_dto.random_seed,
        )
        return service.create_and_run_scenario(scenario_dto.facility_id, req)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


# -----------------------------------------------------------------------------
# 4. Predictions & Recommendations & Sustainability
# -----------------------------------------------------------------------------

@router.get(
    "/facilities/{facility_id}/twin/predictions",
    response_model=TwinPredictionResponse,
    summary="Retrieve steady-state kinetic effluent projections",
)
def get_facility_predictions(
    facility_id: UUID,
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"])),
    db: Session = Depends(get_db),
):
    """Retrieve steady-state effluent water quality estimates derived from process kinetics and empirical holdout error intervals."""
    verify_facility_scope(facility_id, claims)
    service = DigitalTwinService(db)
    return service.get_predictions(facility_id)


@router.get(
    "/facilities/{facility_id}/twin/recommendations",
    response_model=List[TwinRecommendationResponse],
    summary="Retrieve advisory recommendations",
)
def get_facility_recommendations(
    facility_id: UUID,
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"])),
    db: Session = Depends(get_db),
):
    """Retrieve advisory operational recommendations. Autonomous control is strictly prohibited."""
    verify_facility_scope(facility_id, claims)
    service = DigitalTwinService(db)
    return service.get_recommendations(facility_id)


@router.get(
    "/facilities/{facility_id}/twin/sustainability",
    summary="Retrieve water reuse and sustainability metrics",
)
def get_facility_sustainability(
    facility_id: UUID,
    daily_treated_flow_m3: Optional[float] = Query(None, ge=0.0),
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"])),
    db: Session = Depends(get_db),
):
    """Retrieve water reuse volume, freshwater displacement, and safe reuse gating evaluation."""
    verify_facility_scope(facility_id, claims)
    service = DigitalTwinService(db)
    return service.get_sustainability_metrics(facility_id)


# -----------------------------------------------------------------------------
# 5. Model Registry
# -----------------------------------------------------------------------------

@router.get(
    "/twin/models",
    response_model=List[TwinModelVersionResponse],
    summary="List registered process models",
)
def list_twin_models(
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"])),
    db: Session = Depends(get_db),
):
    """List registered process models, versions, parameter hashes, and validation status."""
    service = DigitalTwinService(db)
    return service.list_models()


@router.post(
    "/twin/models/evaluate",
    summary="Run offline empirical model evaluation",
)
def evaluate_twin_model(
    dataset_path: Optional[str] = Query(None, description="Optional path to empirical dataset CSV"),
    claims: Dict[str, Any] = Depends(require_role(["admin", "auditor"])),
    db: Session = Depends(get_db),
):
    """Executes empirical temporal holdout benchmark evaluation against actual wastewater data."""
    service = DigitalTwinService(db)
    return service.evaluate_model(dataset_path)
