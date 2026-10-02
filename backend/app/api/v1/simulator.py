import asyncio
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from app.services.simulator_service import SimulatorService
from app.schemas.simulator import (
    SimulatorStartRequest,
    SimulatorStopRequest,
    SimulatorStatusResponse,
    AnomalyInjectionRequest,
)
from app.core.security import get_current_user_claims, require_role, decode_access_token

router = APIRouter(prefix="/simulator", tags=["Telemetry Simulator Bridge"])


@router.post(
    "/start",
    summary="Start synthetic telemetry stream simulation",
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
async def start_simulator(payload: SimulatorStartRequest = SimulatorStartRequest()):
    """Starts runtime synthetic telemetry stream generator."""
    service = SimulatorService.get_instance()
    result = service.start(
        facility_id=payload.facility_id,
        facility_name=payload.facility_name or "Bharwara STP Lucknow",
        interval_seconds=payload.interval_seconds,
        seed=payload.seed,
        use_http_bridge=payload.use_http_bridge,
        bridge_endpoint=payload.bridge_endpoint,
    )
    return result


@router.post(
    "/stop",
    summary="Stop synthetic telemetry stream simulation",
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
async def stop_simulator(payload: SimulatorStopRequest = SimulatorStopRequest()):
    """Stops runtime synthetic telemetry generator."""
    service = SimulatorService.get_instance()
    return service.stop()


@router.get(
    "/status",
    response_model=SimulatorStatusResponse,
    summary="Get simulator status",
    dependencies=[Depends(get_current_user_claims)],
)
async def get_simulator_status():
    """Retrieve real-time generator status."""
    service = SimulatorService.get_instance()
    data = service.get_status()
    return SimulatorStatusResponse(**data)


@router.post(
    "/inject-anomaly",
    summary="Inject anomaly scenario into active simulation",
    dependencies=[Depends(require_role(["operator", "admin"]))],
)
async def inject_anomaly(payload: AnomalyInjectionRequest):
    """Inject a physical or sensor anomaly into the running stream."""
    service = SimulatorService.get_instance()
    try:
        return service.inject_anomaly(
            scenario_id=payload.scenario_id,
            severity=payload.severity,
            duration_steps=payload.duration_steps,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))



@router.websocket("/stream")
async def websocket_telemetry_stream(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """Real-time SCADA telemetry WebSocket stream broadcasting live basin readings.
    Requires valid JWT authentication token supplied via '?token=...' query parameter or Authorization header.
    """
    auth_token = token
    if not auth_token:
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            auth_token = auth_header.split(" ", 1)[1]

    if not auth_token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication token required")
        return

    try:
        decode_access_token(auth_token)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired authentication token")
        return

    await websocket.accept()
    service = SimulatorService.get_instance()
    try:
        while True:
            status_data = service.get_status()
            await websocket.send_json({
                "type": "TELEMETRY_UPDATE",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": status_data,
            })
            await asyncio.sleep(max(service.interval_seconds, 1.0))
    except WebSocketDisconnect:
        pass
