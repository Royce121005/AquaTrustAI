import asyncio
import os
import logging
import httpx
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, Any, List
from uuid import UUID, uuid4

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.facility import Facility
from app.models.sensor import Sensor
from app.models.reading import Reading
from app.repositories.facility_repository import FacilityRepository
from app.repositories.reading_repository import ReadingRepository
from app.services.validation_service import ValidationService
from app.services.anomaly_service import AnomalyService
from app.core.security import create_access_token
from app.models.user import UserRole
try:
    from backend.app.simulator.engine import AquaTrustRuntimeSimulator
    from backend.app.simulator.schemas import FacilityStreamConfig
except ImportError:
    from app.simulator.engine import AquaTrustRuntimeSimulator
    from app.simulator.schemas import FacilityStreamConfig

logger = logging.getLogger("aquatrust.simulator")


class SimulatorService:
    """Singleton service managing runtime telemetry simulation and ingestion bridge."""

    _instance: Optional["SimulatorService"] = None

    def __init__(self):
        self.is_running: bool = False
        self.simulator: Optional[AquaTrustRuntimeSimulator] = None
        self.active_facility_id: Optional[UUID] = None
        self.active_facility_name: Optional[str] = None
        self.interval_seconds: float = 1.0
        self.use_http_bridge: bool = False
        self.bridge_endpoint: Optional[str] = None
        self.steps_generated: int = 0
        self.readings_ingested: int = 0
        self.current_scenario: str = "baseline_normal"
        self.last_tick_at: Optional[str] = None
        self._task: Optional[asyncio.Task] = None

    @classmethod
    def get_instance(cls) -> "SimulatorService":
        if cls._instance is None:
            cls._instance = SimulatorService()
        return cls._instance

    def start(
        self,
        facility_id: Optional[UUID] = None,
        facility_name: str = "Bharwara STP Lucknow",
        interval_seconds: float = 1.0,
        seed: int = 42,
        use_http_bridge: bool = False,
        bridge_endpoint: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Start the background telemetry generator."""
        if self.is_running:
            return {"status": "already_running", "facility_id": str(self.active_facility_id)}

        BHARWARA_ID = UUID("085a9719-c9d0-4562-b4d7-bc389dec12b3")
        self.active_facility_id = facility_id or BHARWARA_ID
        self.active_facility_name = facility_name or "Bharwara STP Lucknow"
        self.interval_seconds = interval_seconds
        self.use_http_bridge = use_http_bridge
        self.bridge_endpoint = bridge_endpoint

        config = FacilityStreamConfig(
            facility_id=str(self.active_facility_id),
            random_seed=seed,
            simulation_start_time=datetime.now(timezone.utc),
        )
        self.simulator = AquaTrustRuntimeSimulator(config=config, enable_ai_inference=False)
        self.is_running = True

        # Launch background runner loop if event loop is running
        try:
            loop = asyncio.get_running_loop()
            self._task = loop.create_task(self._run_loop())
        except RuntimeError:
            try:
                loop = asyncio.get_event_loop()
                self._task = loop.create_task(self._run_loop())
            except Exception:
                self._task = None

        return {
            "status": "started",
            "facility_id": str(self.active_facility_id),
            "facility_name": self.active_facility_name,
            "interval_seconds": self.interval_seconds,
            "use_http_bridge": self.use_http_bridge,
        }

    def stop(self) -> Dict[str, Any]:
        """Stop the background telemetry generator."""
        if not self.is_running:
            return {"status": "not_running"}

        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()

        return {
            "status": "stopped",
            "steps_generated": self.steps_generated,
            "readings_ingested": self.readings_ingested,
        }

    SCENARIO_ALIASES = {
        "organic_shock": "SCENARIO_08_SUDDEN_PROCESS_CHANGE",
        "sensor_spike": "SCENARIO_01_SENSOR_SPIKE",
        "sensor_drop": "SCENARIO_02_SENSOR_DROP",
        "sensor_freeze": "SCENARIO_03_STUCK_SENSOR",
        "sensor_drift": "SCENARIO_04_SENSOR_DRIFT",
        "missing_reading": "SCENARIO_05_MISSING_READING",
        "duplicate_reading": "SCENARIO_06_DUPLICATE_READING",
        "parameter_inconsistency": "SCENARIO_07_PARAMETER_INCONSISTENCY",
        "process_change": "SCENARIO_08_SUDDEN_PROCESS_CHANGE",
        "aeration_failure": "SCENARIO_08_SUDDEN_PROCESS_CHANGE",
        "toxic_inflow": "SCENARIO_08_SUDDEN_PROCESS_CHANGE",
        "ph_drift": "SCENARIO_04_SENSOR_DRIFT",
        "false_compliance": "SCENARIO_07_PARAMETER_INCONSISTENCY",
        "storm_dilution": "SCENARIO_08_SUDDEN_PROCESS_CHANGE",
    }

    def inject_anomaly(self, scenario_id: str, severity: float = 1.0, duration_steps: int = 10) -> Dict[str, Any]:
        """Inject an anomaly scenario into the active simulation."""
        if not self.is_running or not self.simulator:
            raise ValueError("Simulator is not currently running.")

        target_scenario = self.SCENARIO_ALIASES.get(scenario_id.lower(), scenario_id)
        self.simulator.inject_anomaly_scenario(
            target_scenario,
            duration_steps=duration_steps,
            severity=severity,
        )
        self.current_scenario = scenario_id
        return {
            "status": "injected",
            "scenario_id": scenario_id,
            "target_scenario": target_scenario,
            "severity": severity,
            "duration_steps": duration_steps,
        }

    def get_status(self) -> Dict[str, Any]:
        """Return real-time simulator status report."""
        return {
            "is_running": self.is_running,
            "active_facility_id": str(self.active_facility_id) if self.active_facility_id else None,
            "active_facility_name": self.active_facility_name,
            "steps_generated": self.steps_generated,
            "readings_ingested": self.readings_ingested,
            "current_scenario": self.current_scenario,
            "use_http_bridge": self.use_http_bridge,
            "last_tick_at": self.last_tick_at,
        }

    async def _run_loop(self):
        """Internal asynchronous simulation loop."""
        try:
            while self.is_running and self.simulator:
                # 1. Step simulation
                readings = self.simulator.step()
                self.steps_generated += 1
                self.last_tick_at = datetime.now(timezone.utc).isoformat()

                if self.use_http_bridge:
                    app_settings = get_settings()
                    port = os.environ.get("PORT", str(app_settings.APP_PORT))
                    endpoint = self.bridge_endpoint or f"http://127.0.0.1:{port}{app_settings.API_V1_STR}/telemetry/ingest"
                    token = create_access_token({
                        "sub": "simulator_service",
                        "username": "simulator_service",
                        "role": UserRole.OPERATOR.value,
                        "facility_id": str(self.active_facility_id),
                    })
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        for r in readings:
                            payload = {
                                "facility_id": str(self.active_facility_id),
                                "observed_at": datetime.now(timezone.utc).isoformat(),
                                "treatment_stage": str(r.measurement_stage),
                                "parameter": str(r.parameter),
                                "value": float(r.value) if r.value is not None else None,
                                "unit": str(r.unit),
                                "source": "simulated",
                            }
                            try:
                                resp = await client.post(
                                    endpoint,
                                    json=payload,
                                    headers={
                                        "Idempotency-Key": f"sim-{r.reading_id}",
                                        "Authorization": f"Bearer {token}",
                                    },
                                )
                                if resp.status_code in (200, 201):
                                    self.readings_ingested += 1
                            except Exception:
                                pass
                else:
                    # 2. Ingest into database
                    db = SessionLocal()
                    try:
                        # Ensure facility exists in DB
                        fac_repo = FacilityRepository(db)
                        fac = fac_repo.get_by_id(self.active_facility_id)
                        if not fac:
                            fac = Facility(
                                facility_id=self.active_facility_id,
                                facility_name=self.active_facility_name or "Bharwara STP Lucknow",
                                facility_type="municipal_stp",
                                location={"city": "Lucknow", "state": "UP"},
                                capacity=Decimal("345.000000"),
                                capacity_unit="MLD",
                                status="active",
                            )
                            fac_repo.create(fac)
                            db.commit()

                        reading_repo = ReadingRepository(db)
                        now_utc = datetime.now(timezone.utc)
                        for r in readings:
                            param_str = str(r.parameter.value if hasattr(r.parameter, "value") else r.parameter).upper()
                            sensor = db.query(Sensor).filter(
                                Sensor.facility_id == self.active_facility_id,
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
                                facility_id=self.active_facility_id,
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

                            # Validate & Anomaly detect
                            ValidationService.validate_reading(db, reading_row)
                            AnomalyService.infer_reading(db, reading_row)
                            self.readings_ingested += 1

                        db.commit()
                    except Exception as e:
                        logger.error(f"Error in simulator ingestion loop: {e}", exc_info=True)
                        db.rollback()
                    finally:
                        db.close()

                await asyncio.sleep(self.interval_seconds)
        except asyncio.CancelledError:
            pass
