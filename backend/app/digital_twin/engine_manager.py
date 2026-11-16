"""AquaTrust AI — Continuously Running Digital Twin Execution Engine.

Owns the server-side authoritative execution loop, lifecycle state transitions
(STOPPED, STARTING, RUNNING, PAUSED, ERROR), tick synchronization, real-time WebSocket
broadcasting, and cross-facility isolation.
"""

import asyncio
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Any, Set, Literal
from uuid import UUID, uuid4

from app.db.session import SessionLocal
from app.models.reading import Reading
from app.models.sensor import Sensor
from app.models.facility import Facility
from app.repositories.facility_repository import FacilityRepository
from app.repositories.reading_repository import ReadingRepository
from app.services.validation_service import ValidationService
from app.services.anomaly_service import AnomalyService
from app.digital_twin.service import DigitalTwinService
from app.digital_twin.alarms import AlarmManager, TwinAlarmEvent

try:
    from backend.app.simulator.engine import AquaTrustRuntimeSimulator
    from backend.app.simulator.schemas import FacilityStreamConfig
except ImportError:
    from app.simulator.engine import AquaTrustRuntimeSimulator
    from app.simulator.schemas import FacilityStreamConfig

logger = logging.getLogger("aquatrust.twin_engine")

LifecycleState = Literal["stopped", "starting", "running", "paused", "degraded", "stopping", "error"]
OperatingMode = Literal["live", "simulation", "historical_replay", "scenario"]


class FacilityTwinWorker:
    """Active background worker running the digital twin execution loop for a specific facility."""

    def __init__(
        self,
        facility_id: UUID,
        facility_name: str,
        operating_mode: OperatingMode = "simulation",
        interval_seconds: float = 1.0,
    ):
        self.facility_id = facility_id
        self.facility_name = facility_name
        self.operating_mode: OperatingMode = operating_mode
        self.interval_seconds = interval_seconds
        self.lifecycle_state: LifecycleState = "stopped"
        self.tick_count: int = 0
        self.active_state_version: int = 1
        self.last_tick_at: Optional[datetime] = None
        self.current_scenario: str = "baseline_normal"
        self.error_message: Optional[str] = None

        self._task: Optional[asyncio.Task] = None
        self._simulator: Optional[AquaTrustRuntimeSimulator] = None
        self._is_paused: bool = False

    def to_status_dict(self) -> Dict[str, Any]:
        return {
            "facility_id": str(self.facility_id),
            "facility_name": self.facility_name,
            "lifecycle_state": self.lifecycle_state,
            "operating_mode": self.operating_mode,
            "interval_seconds": self.interval_seconds,
            "tick_count": self.tick_count,
            "active_state_version": self.active_state_version,
            "last_tick_at": self.last_tick_at.isoformat() if self.last_tick_at else None,
            "current_scenario": self.current_scenario,
            "is_paused": self._is_paused,
            "is_healthy": self.lifecycle_state in ("running", "paused", "stopped"),
            "error_message": self.error_message,
        }


class TwinEngineManager:
    """Master singleton managing facility twin workers and WebSocket subscribers."""

    _instance: Optional["TwinEngineManager"] = None

    def __init__(self):
        # facility_id (str) -> FacilityTwinWorker
        self._workers: Dict[str, FacilityTwinWorker] = {}
        # facility_id (str) -> Set of active WebSocket connections
        self._subscribers: Dict[str, Set[Any]] = {}

    @classmethod
    def get_instance(cls) -> "TwinEngineManager":
        if cls._instance is None:
            cls._instance = TwinEngineManager()
        return cls._instance

    def clear(self):
        """Halt all workers and clear internal registries (test isolation)."""
        for worker in self._workers.values():
            if worker._task and not worker._task.done():
                worker._task.cancel()
        self._workers.clear()
        self._subscribers.clear()


    def get_worker(self, facility_id: UUID) -> Optional[FacilityTwinWorker]:
        return self._workers.get(str(facility_id))

    def get_or_create_worker(
        self,
        facility_id: UUID,
        facility_name: str = "Central Delhi STP",
        operating_mode: OperatingMode = "simulation",
        interval_seconds: float = 1.0,
    ) -> FacilityTwinWorker:
        fac_key = str(facility_id)
        if fac_key not in self._workers:
            self._workers[fac_key] = FacilityTwinWorker(
                facility_id=facility_id,
                facility_name=facility_name,
                operating_mode=operating_mode,
                interval_seconds=interval_seconds,
            )
        return self._workers[fac_key]

    # -------------------------------------------------------------------------
    # WebSocket Subscription Management
    # -------------------------------------------------------------------------

    async def register_subscriber(self, facility_id: UUID, websocket: Any):
        fac_key = str(facility_id)
        if fac_key not in self._subscribers:
            self._subscribers[fac_key] = set()
        self._subscribers[fac_key].add(websocket)
        logger.info(f"Subscribed websocket client to facility {fac_key} (total: {len(self._subscribers[fac_key])})")

    async def unregister_subscriber(self, facility_id: UUID, websocket: Any):
        fac_key = str(facility_id)
        if fac_key in self._subscribers:
            self._subscribers[fac_key].discard(websocket)
            logger.info(f"Unsubscribed websocket client from facility {fac_key} (remaining: {len(self._subscribers[fac_key])})")

    async def broadcast_to_facility(self, facility_id: UUID, message: Dict[str, Any]):
        fac_key = str(facility_id)
        subscribers = self._subscribers.get(fac_key, set())
        if not subscribers:
            return

        dead_connections = []
        for ws in list(subscribers):
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"Error sending to subscriber on {fac_key}: {e}")
                dead_connections.append(ws)

        for ws in dead_connections:
            subscribers.discard(ws)

    # -------------------------------------------------------------------------
    # Engine Lifecycle Controls
    # -------------------------------------------------------------------------

    def start_engine(
        self,
        facility_id: UUID,
        facility_name: str = "Central Delhi STP",
        operating_mode: OperatingMode = "simulation",
        interval_seconds: float = 1.0,
        seed: int = 42,
    ) -> Dict[str, Any]:
        """Initiate real-time background twin execution loop for a facility."""
        worker = self.get_or_create_worker(
            facility_id=facility_id,
            facility_name=facility_name,
            operating_mode=operating_mode,
            interval_seconds=interval_seconds,
        )

        if worker.lifecycle_state == "running":
            return {"status": "already_running", "worker": worker.to_status_dict()}

        worker.lifecycle_state = "starting"
        worker.operating_mode = operating_mode
        worker.interval_seconds = interval_seconds
        worker._is_paused = False

        if operating_mode == "simulation":
            config = FacilityStreamConfig(
                facility_id=str(facility_id),
                random_seed=seed,
                simulation_start_time=datetime.now(timezone.utc),
            )
            worker._simulator = AquaTrustRuntimeSimulator(config=config, enable_ai_inference=False)

        # Launch async execution loop
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

        worker._task = loop.create_task(self._run_engine_loop(worker))
        worker.lifecycle_state = "running"

        logger.info(f"Started Digital Twin Engine worker for facility {facility_id} in mode '{operating_mode}'")
        return {"status": "started", "worker": worker.to_status_dict()}

    def clear(self, facility_id: Optional[UUID] = None) -> None:
        """Clear workers and subscribers for test isolation."""
        if facility_id:
            fac_key = str(facility_id)
            worker = self._workers.pop(fac_key, None)
            if worker and worker._task and not worker._task.done():
                worker._task.cancel()
            self._subscribers.pop(fac_key, None)
        else:
            for worker in list(self._workers.values()):
                if worker._task and not worker._task.done():
                    worker._task.cancel()
            self._workers.clear()
            self._subscribers.clear()

    def stop_engine(self, facility_id: UUID) -> Dict[str, Any]:
        """Halt real-time twin execution loop."""
        worker = self.get_worker(facility_id)
        if not worker or worker.lifecycle_state == "stopped":
            return {"status": "not_running"}

        worker.lifecycle_state = "stopping"
        if worker._task and not worker._task.done():
            worker._task.cancel()

        worker.lifecycle_state = "stopped"
        worker._is_paused = False
        logger.info(f"Stopped Digital Twin Engine worker for facility {facility_id}")
        return {"status": "stopped", "worker": worker.to_status_dict()}

    def pause_engine(self, facility_id: UUID) -> Dict[str, Any]:
        """Pause execution loop without terminating state."""
        worker = self.get_worker(facility_id)
        if not worker or worker.lifecycle_state != "running":
            return {"status": "cannot_pause", "message": "Worker is not running"}

        worker._is_paused = True
        worker.lifecycle_state = "paused"
        logger.info(f"Paused Digital Twin Engine worker for facility {facility_id}")
        return {"status": "paused", "worker": worker.to_status_dict()}

    def resume_engine(self, facility_id: UUID) -> Dict[str, Any]:
        """Resume execution loop from paused state."""
        worker = self.get_worker(facility_id)
        if not worker or worker.lifecycle_state != "paused":
            return {"status": "cannot_resume", "message": "Worker is not paused"}

        worker._is_paused = False
        worker.lifecycle_state = "running"
        logger.info(f"Resumed Digital Twin Engine worker for facility {facility_id}")
        return {"status": "resumed", "worker": worker.to_status_dict()}

    def get_status(self, facility_id: UUID) -> Dict[str, Any]:
        worker = self.get_worker(facility_id)
        if not worker:
            return {
                "facility_id": str(facility_id),
                "lifecycle_state": "stopped",
                "operating_mode": "simulation",
                "interval_seconds": 1.0,
                "tick_count": 0,
                "active_state_version": 1,
                "last_tick_at": None,
                "current_scenario": "baseline_normal",
                "is_paused": False,
                "is_healthy": True,
                "error_message": None,
            }
        return worker.to_status_dict()

    # -------------------------------------------------------------------------
    # Core Engine Execution Loop
    # -------------------------------------------------------------------------

    async def _run_engine_loop(self, worker: FacilityTwinWorker):
        """Authoritative execution tick loop advancing facility twin state continuously."""
        facility_id = worker.facility_id
        alarm_mgr = AlarmManager.get_instance()

        try:
            while worker.lifecycle_state in ("running", "paused"):
                if worker._is_paused:
                    await asyncio.sleep(0.5)
                    continue

                worker.tick_count += 1
                now_utc = datetime.now(timezone.utc)
                worker.last_tick_at = now_utc

                # Execute cycle within transactional database session
                db = SessionLocal()
                try:
                    twin_service = DigitalTwinService(db)

                    # Ensure facility exists in DB
                    fac_repo = FacilityRepository(db)
                    fac = fac_repo.get_by_id(facility_id)
                    if not fac:
                        fac = Facility(
                            facility_id=facility_id,
                            facility_name=worker.facility_name,
                            facility_type="municipal_stp",
                            location={"city": "Delhi", "state": "DL"},
                            capacity=Decimal("10.000000"),
                            capacity_unit="MLD",
                            status="active",
                        )
                        fac_repo.create(fac)
                        db.commit()

                    updated_twin_state = None

                    if worker.operating_mode == "simulation" and worker._simulator:
                        # 1. Step simulation to produce synthetic basin telemetry
                        readings = worker._simulator.step()
                        reading_repo = ReadingRepository(db)

                        for r in readings:
                            param_str = str(r.parameter.value if hasattr(r.parameter, "value") else r.parameter).upper()
                            sensor = db.query(Sensor).filter(
                                Sensor.facility_id == facility_id,
                                Sensor.parameter == param_str,
                            ).first()
                            sensor_id = sensor.sensor_id if sensor else None

                            obs_val = None
                            if r.value is not None:
                                try:
                                    obs_val = Decimal(str(round(float(r.value), 4)))
                                except Exception:
                                    obs_val = Decimal(str(r.value))

                            reading_row = Reading(
                                reading_id=r.reading_id,
                                facility_id=facility_id,
                                sensor_id=sensor_id,
                                observed_at=now_utc,
                                treatment_stage=str(r.measurement_stage.value if hasattr(r.measurement_stage, "value") else r.measurement_stage),
                                parameter=param_str,
                                value=obs_val,
                                unit=str(r.unit),
                                source="simulated",
                                quality_status="pending",
                            )
                            reading_repo.create(reading_row)

                            # Validate & run anomaly detection
                            ValidationService.validate_reading(db, reading_row)
                            AnomalyService.infer_reading(db, reading_row)

                            # Synchronize with Digital Twin virtual state
                            try:
                                updated_twin_state = twin_service.synchronize_reading(reading_row)
                            except Exception as sync_err:
                                logger.warning(f"State sync warning: {sync_err}")

                        db.commit()

                    if updated_twin_state:
                        worker.active_state_version = updated_twin_state.state_version

                    # 2. Retrieve authoritative state snapshot
                    state_dto = twin_service.get_facility_state(facility_id)

                    # 3. Evaluate operational alarms & CPCB compliance
                    active_alarms = alarm_mgr.evaluate_state_alarms(
                        facility_id=facility_id,
                        stage_states=state_dto.stage_states,
                        data_quality=state_dto.data_quality,
                        state_freshness=state_dto.state_freshness,
                        is_scenario=False,
                    )

                    # 4. Construct real-time state delta payload
                    delta_payload = {
                        "type": "TWIN_STATE_DELTA",
                        "facility_id": str(facility_id),
                        "state_version": state_dto.state_version,
                        "observed_at": state_dto.observed_at.isoformat(),
                        "source_mode": state_dto.source_mode,
                        "data_quality": state_dto.data_quality,
                        "state_freshness": state_dto.state_freshness,
                        "stage_states": {k: v.model_dump(mode="json") for k, v in state_dto.stage_states.items()},
                        "latest_observations": {k: v.model_dump(mode="json") for k, v in state_dto.observations.items()},
                        "operating_variables": {
                            "hrt_hours": 8.0,
                            "do_mg_l": 2.0,
                            "temperature_c": 20.0,
                        },
                        "active_alarms": [a.model_dump(mode="json") for a in active_alarms],
                        "engine_status": worker.to_status_dict(),
                        "timestamp": now_utc.isoformat(),
                    }

                    # 5. Broadcast to connected WebSocket subscribers
                    await self.broadcast_to_facility(facility_id, delta_payload)

                except Exception as cycle_err:
                    logger.error(f"Error in engine cycle for {facility_id}: {cycle_err}", exc_info=True)
                    worker.error_message = str(cycle_err)
                    db.rollback()
                finally:
                    db.close()

                await asyncio.sleep(worker.interval_seconds)

        except asyncio.CancelledError:
            logger.info(f"Twin engine task cancelled for facility {facility_id}")
            worker.lifecycle_state = "stopped"
        except Exception as ex:
            logger.error(f"Fatal twin engine error for {facility_id}: {ex}", exc_info=True)
            worker.lifecycle_state = "error"
            worker.error_message = str(ex)
