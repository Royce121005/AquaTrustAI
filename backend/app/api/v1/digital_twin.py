"""AquaTrust AI — Digital Twin FastAPI Router.

Provides authenticated, RBAC-enforced REST endpoints for virtual plant state,
versioned history, configuration updates, what-if scenarios, process models,
and evidence-gated predictions/recommendations.
"""

from datetime import datetime, timezone
import asyncio
import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status, WebSocket, WebSocketDisconnect, Body
from sqlalchemy.orm import Session

from app.db.session import get_db, SessionLocal
from app.core.security import get_current_user_claims, require_role, decode_access_token
from app.models.user import UserRole
from app.digital_twin.service import DigitalTwinService
from app.digital_twin.engine_manager import TwinEngineManager
from app.digital_twin.alarms import AlarmManager

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


logger = logging.getLogger("aquatrust.twin_api")


# -----------------------------------------------------------------------------
# 6. Real-Time Engine Lifecycle & SCADA WebSocket
# -----------------------------------------------------------------------------

@router.post(
    "/facilities/{facility_id}/twin/engine/start",
    summary="Start Digital Twin SCADA execution engine",
)
async def start_twin_engine(
    facility_id: UUID,
    payload: Optional[Dict[str, Any]] = Body(default=None),
    interval_seconds: Optional[float] = Query(None),
    operating_mode: Optional[str] = Query(None),
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin"])),
):
    verify_facility_scope(facility_id, claims)
    engine_mgr = TwinEngineManager.get_instance()
    p = payload or {}
    interval = interval_seconds if interval_seconds is not None else float(p.get("interval_seconds", 1.0))
    mode = operating_mode if operating_mode is not None else p.get("operating_mode", "simulation")
    seed = int(p.get("seed", 42))
    facility_name = p.get("facility_name", "Central Delhi STP")
    return engine_mgr.start_engine(
        facility_id=facility_id,
        facility_name=facility_name,
        operating_mode=mode,
        interval_seconds=interval,
        seed=seed,
    )


@router.post(
    "/facilities/{facility_id}/twin/engine/stop",
    summary="Stop Digital Twin SCADA execution engine",
)
async def stop_twin_engine(
    facility_id: UUID,
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin"])),
):
    verify_facility_scope(facility_id, claims)
    engine_mgr = TwinEngineManager.get_instance()
    return engine_mgr.stop_engine(facility_id)


@router.post(
    "/facilities/{facility_id}/twin/engine/pause",
    summary="Pause Digital Twin SCADA execution engine",
)
async def pause_twin_engine(
    facility_id: UUID,
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin"])),
):
    verify_facility_scope(facility_id, claims)
    engine_mgr = TwinEngineManager.get_instance()
    return engine_mgr.pause_engine(facility_id)


@router.post(
    "/facilities/{facility_id}/twin/engine/resume",
    summary="Resume Digital Twin SCADA execution engine",
)
async def resume_twin_engine(
    facility_id: UUID,
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin"])),
):
    verify_facility_scope(facility_id, claims)
    engine_mgr = TwinEngineManager.get_instance()
    return engine_mgr.resume_engine(facility_id)


@router.get(
    "/facilities/{facility_id}/twin/engine/status",
    summary="Get Digital Twin execution engine status",
)
async def get_twin_engine_status(
    facility_id: UUID,
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"])),
):
    verify_facility_scope(facility_id, claims)
    engine_mgr = TwinEngineManager.get_instance()
    return engine_mgr.get_status(facility_id)


@router.get(
    "/facilities/{facility_id}/twin/alarms",
    summary="List active digital twin SCADA alarms and alarm history",
)
async def get_twin_alarms(
    facility_id: UUID,
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"])),
):
    verify_facility_scope(facility_id, claims)
    alarm_mgr = AlarmManager.get_instance()
    active_alarms = alarm_mgr.get_active_alarms(facility_id)
    alarm_history = alarm_mgr.get_alarm_history(facility_id)
    return {
        "facility_id": str(facility_id),
        "active_alarms": [a.model_dump(mode="json") for a in active_alarms],
        "alarm_history": [a.model_dump(mode="json") for a in alarm_history],
        "total_active": len(active_alarms),
        "total_historical": len(alarm_history),
    }


@router.post(
    "/facilities/{facility_id}/twin/alarms/{alarm_id}/ack",
    summary="Acknowledge active digital twin alarm",
)
async def acknowledge_twin_alarm(
    facility_id: UUID,
    alarm_id: str,
    claims: Dict[str, Any] = Depends(require_role(["operator", "admin"])),
):
    verify_facility_scope(facility_id, claims)
    alarm_mgr = AlarmManager.get_instance()
    alarm = alarm_mgr.acknowledge_alarm(facility_id, alarm_id)
    if not alarm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alarm not found or already resolved")
    alarm_data = alarm.model_dump(mode="json")
    await TwinEngineManager.get_instance().broadcast_to_facility(
        facility_id,
        {
            "type": "ALARM_ACKNOWLEDGED",
            "facility_id": str(facility_id),
            "alarm_id": alarm_id,
            "alarm": alarm_data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    res = alarm_data.copy()
    res["alarm"] = alarm_data
    res["status"] = "acknowledged"
    res["acknowledged"] = True
    return res


@router.websocket("/facilities/{facility_id}/twin/stream")
async def websocket_twin_stream(
    websocket: WebSocket,
    facility_id: UUID,
    token: Optional[str] = Query(None),
):
    """Real-time SCADA digital twin stream with snapshot and deltas."""
    auth_token = token
    if not auth_token:
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            auth_token = auth_header.split(" ", 1)[1]
        elif auth_header:
            auth_token = auth_header

    if not auth_token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication token required")
        return

    try:
        claims = decode_access_token(auth_token)
        verify_facility_scope(facility_id, claims)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired authentication token")
        return

    await websocket.accept()
    engine_mgr = TwinEngineManager.get_instance()
    alarm_mgr = AlarmManager.get_instance()

    await engine_mgr.register_subscriber(facility_id, websocket)

    async def send_twin_snapshot():
        db = SessionLocal()
        try:
            twin_service = DigitalTwinService(db)
            state_dto = twin_service.get_facility_state(facility_id)
            active_alarms = alarm_mgr.get_active_alarms(facility_id)
            worker = engine_mgr.get_worker(facility_id)
            status_dict = worker.to_status_dict() if worker else engine_mgr.get_status(facility_id)
            obs_map = {}
            if hasattr(state_dto, "observations") and state_dto.observations:
                obs_map = {k: (v.model_dump(mode="json") if hasattr(v, "model_dump") else v) for k, v in state_dto.observations.items()}
            elif hasattr(state_dto, "latest_observations") and state_dto.latest_observations:
                obs_map = {k: (v.model_dump(mode="json") if hasattr(v, "model_dump") else v) for k, v in state_dto.latest_observations.items()}

            snapshot_msg = {
                "type": "TWIN_SNAPSHOT",
                "facility_id": str(facility_id),
                "state_version": state_dto.state_version,
                "observed_at": state_dto.observed_at.isoformat() if hasattr(state_dto.observed_at, "isoformat") else str(state_dto.observed_at),
                "source_mode": state_dto.source_mode,
                "data_quality": state_dto.data_quality,
                "state_freshness": state_dto.state_freshness,
                "stage_states": {k: (v.model_dump(mode="json") if hasattr(v, "model_dump") else v) for k, v in state_dto.stage_states.items()},
                "latest_observations": obs_map,
                "operating_variables": {
                    "hrt_hours": 8.0,
                    "do_mg_l": 2.0,
                    "temperature_c": 20.0,
                },
                "active_alarms": [a.model_dump(mode="json") for a in active_alarms],
                "engine_status": status_dict,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            await websocket.send_json(snapshot_msg)
        finally:
            db.close()

    try:
        await send_twin_snapshot()

        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            if action == "RESYNC":
                await send_twin_snapshot()
            elif action == "ACK_ALARM":
                alarm_id = data.get("alarm_id")
                if alarm_id:
                    acked = alarm_mgr.acknowledge_alarm(facility_id, alarm_id)
                    if acked:
                        ack_msg = {
                            "type": "ALARM_ACKNOWLEDGED",
                            "facility_id": str(facility_id),
                            "alarm_id": alarm_id,
                            "alarm": acked.model_dump(mode="json"),
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }
                        await engine_mgr.broadcast_to_facility(facility_id, ack_msg)
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    except Exception as ws_err:
        logger.warning(f"WebSocket client loop exception for facility {facility_id}: {ws_err}")
    finally:
        await engine_mgr.unregister_subscriber(facility_id, websocket)

