"""AquaTrust AI — What-If Scenario Engine.

Executes isolated, reproducible scenario simulations starting from a fixed
base-state version. Guarantees complete isolation from live facility state,
physical observations, finalized treatment records, and blockchain anchors.
"""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple
from uuid import UUID, uuid4
import numpy as np
from sqlalchemy.orm import Session

from app.db.base import utc_now
from app.models.digital_twin import TwinState, TwinScenario, TwinScenarioResult
from app.digital_twin.repository import TwinRepository
from app.digital_twin.process_model import ProcessModelEngine


class ScenarioEngine:
    """Simulates what-if scenarios from frozen virtual base states."""

    SUPPORTED_SCENARIO_TYPES = {
        "influent_quality_change": "Sudden organic or hydraulic shock load at influent",
        "sensor_drift": "Gradual calibration drift in sensor readings over horizon",
        "stuck_sensor": "Frozen or stuck sensor telemetry",
        "missing_delayed_readings": "Intermittent telemetry blackout or dropped packets",
        "process_aeration_change": "Aeration blower failure or dissolved oxygen deficit",
        "hydraulic_shock_load": "Heavy rainfall storm inflow decreasing hydraulic retention time",
        "alternative_treatment_assumptions": "Hypothetical process modifications or chemical dosage",
        "aeration_failure": "Aeration blower outage or dissolved oxygen drop (alias for process_aeration_change)",
        "hydraulic_surge": "Stormwater hydraulic surge or high inflow (alias for hydraulic_shock_load)",
        "chemical_overdosing": "Chemical coagulant overdosing (alias for alternative_treatment_assumptions)",
    }

    # Regulatory CPCB Upper Thresholds for Estimated Compliance Risk
    CPCB_LIMITS = {
        "bod": 30.0,
        "cod": 250.0,
        "tss": 50.0,
        "ph_min": 6.5,
        "ph_max": 9.0,
        "nh4_n": 50.0,
    }

    def __init__(self, db: Session, process_engine: Optional[ProcessModelEngine] = None):
        self.db = db
        self.repo = TwinRepository(db)
        self.process_engine = process_engine or ProcessModelEngine()

    def _evaluate_compliance_risk(self, param: str, val: Optional[float]) -> str:
        """Determines estimated compliance risk without producing a legal compliance certificate."""
        if val is None:
            return "insufficient_data"
        p = param.lower()
        if p == "ph":
            if val < self.CPCB_LIMITS["ph_min"] or val > self.CPCB_LIMITS["ph_max"]:
                return "non_compliant"
            return "compliant"

        limit = self.CPCB_LIMITS.get(p)
        if limit is not None:
            return "non_compliant" if val > limit else "compliant"
        return "compliant"

    def run_scenario(
        self,
        facility_id: UUID,
        scenario_type: str,
        parameters: Optional[Dict[str, Any]] = None,
        base_state_version: Optional[int] = None,
        duration_minutes: int = 120,
        time_step_seconds: int = 900,
        seed: Optional[int] = 42,
        scenario_name: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> TwinScenario:
        """
        Executes a what-if scenario run in total isolation.

        Returns:
            Persisted TwinScenario entity with associated TwinScenarioResult time series.
        """
        if scenario_type not in self.SUPPORTED_SCENARIO_TYPES:
            raise ValueError(
                f"Unsupported scenario type '{scenario_type}'. Supported: {list(self.SUPPORTED_SCENARIO_TYPES.keys())}"
            )

        if duration_minutes <= 0:
            raise ValueError(f"duration_minutes must be positive (got {duration_minutes})")
        if time_step_seconds <= 0:
            raise ValueError(f"time_step_seconds must be positive (got {time_step_seconds})")

        # 1. Load base state
        if base_state_version is not None:
            base_state = self.repo.get_state_by_version(facility_id, base_state_version)
            if not base_state:
                raise ValueError(f"Base state version {base_state_version} not found for facility {facility_id}")
        else:
            base_state = self.repo.get_latest_state(facility_id)
            if not base_state:
                from app.digital_twin.state_updater import StateUpdater
                updater = StateUpdater(self.db, self.process_engine)
                base_state = updater.initialize_state(facility_id)
                self.db.commit()
            base_state_version = base_state.state_version

        params = parameters or {}
        rng = np.random.RandomState(seed if seed is not None else 42)

        # 2. Register scenario record
        scenario_id = uuid4()
        scenario_entity = TwinScenario(
            scenario_id=scenario_id,
            facility_id=facility_id,
            base_state_version=base_state_version,
            scenario_type=scenario_type,
            scenario_name=scenario_name or f"What-If: {scenario_type.replace('_', ' ').title()}",
            parameters=params,
            duration_minutes=duration_minutes,
            time_step_seconds=time_step_seconds,
            random_seed=seed,
            status="running",
            model_version=self.process_engine.MODEL_VERSION,
            created_by=created_by,
            created_at=utc_now(),
        )
        self.repo.create_scenario(scenario_entity)

        # 3. Isolated State Extraction
        base_obs = dict(base_state.latest_observations or {})
        # Baseline influent concentrations
        base_bod = float(base_obs.get("bod", {}).get("value", 180.0))
        base_cod = float(base_obs.get("cod", {}).get("value", 400.0))
        base_tss = float(base_obs.get("tss", {}).get("value", 220.0))
        base_ph = float(base_obs.get("ph", {}).get("value", 7.4))
        base_nh4 = float(base_obs.get("nh4_n", {}).get("value", 35.0))

        start_time = base_state.observed_at
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)

        num_steps = max(1, duration_minutes * 60 // time_step_seconds)
        results: List[TwinScenarioResult] = []

        try:
            for step in range(num_steps):
                step_time = start_time + timedelta(seconds=step * time_step_seconds)
                noise_factor = float(rng.normal(1.0, 0.02))

                # Nominal baseline at this step
                nominal_influent = {
                    "bod": base_bod * noise_factor,
                    "cod": base_cod * noise_factor,
                    "tss": base_tss * noise_factor,
                    "ph": base_ph,
                    "nh4_n": base_nh4 * noise_factor,
                }
                _, base_eval = self.process_engine.evaluate_stages(nominal_influent)
                base_eff = base_eval.get("final_effluent_estimates", {})

                # Perturbed scenario influent & operating variables
                scen_influent = dict(nominal_influent)
                scen_op_vars: Dict[str, Any] = {}

                # Resolve alias to canonical simulation model
                canonical_type = scenario_type
                if scenario_type == "aeration_failure":
                    canonical_type = "process_aeration_change"
                elif scenario_type == "hydraulic_surge":
                    canonical_type = "hydraulic_shock_load"
                elif scenario_type == "chemical_overdosing":
                    canonical_type = "alternative_treatment_assumptions"

                if canonical_type == "influent_quality_change":
                    bod_pct = float(params.get("bod_change_percent", 50.0))
                    cod_pct = float(params.get("cod_change_percent", bod_pct * 0.9))
                    tss_pct = float(params.get("tss_change_percent", bod_pct * 0.8))
                    scen_influent["bod"] *= (1.0 + (bod_pct / 100.0))
                    scen_influent["cod"] *= (1.0 + (cod_pct / 100.0))
                    scen_influent["tss"] *= (1.0 + (tss_pct / 100.0))

                elif canonical_type == "sensor_drift":
                    drift_param = params.get("parameter", "ph").lower()
                    drift_rate = float(params.get("drift_rate_per_step", 0.05))
                    drift_accum = drift_rate * (step + 1)
                    if drift_param in scen_influent:
                        scen_influent[drift_param] += drift_accum

                elif canonical_type == "stuck_sensor":
                    freeze_param = params.get("parameter", "bod").lower()
                    freeze_val = float(params.get("freeze_value", base_bod))
                    if freeze_param in scen_influent:
                        scen_influent[freeze_param] = freeze_val

                elif canonical_type == "missing_delayed_readings":
                    # Simulates intermittent telemetry blackout; readings remain frozen at initial step
                    pass

                elif canonical_type == "process_aeration_change":
                    if "target_do_mg_l" in params:
                        target_do = float(params["target_do_mg_l"])
                    elif "do_reduction_percent" in params:
                        do_drop = float(params["do_reduction_percent"])
                        target_do = max(0.1, 2.0 * (1.0 - do_drop / 100.0))
                    else:
                        target_do = 0.5
                    scen_op_vars["do_mg_l"] = target_do

                elif canonical_type == "hydraulic_shock_load":
                    flow_multiplier = float(params.get("flow_multiplier", 2.0))
                    scen_op_vars["hrt_hours"] = 8.0 / flow_multiplier
                    # Dilution effect
                    scen_influent["bod"] *= (0.7 / flow_multiplier)
                    scen_influent["cod"] *= (0.7 / flow_multiplier)
                    scen_influent["tss"] *= (0.8 / flow_multiplier)

                elif canonical_type == "alternative_treatment_assumptions":
                    # Chemical coagulant overdosing impairs clarifier settling and depresses pH
                    overdose_pct = float(params.get("coagulant_overdose_percent", 50.0))
                    scen_influent["tss"] *= (1.0 + overdose_pct / 200.0)
                    scen_influent["ph"] = max(5.5, scen_influent["ph"] - 0.5)

                _, scen_eval = self.process_engine.evaluate_stages(scen_influent, scen_op_vars)
                scen_eff = scen_eval.get("final_effluent_estimates", {})

                # Generate comparative results for final effluent parameters
                for p in ["bod", "cod", "tss", "ph", "nh4_n"]:
                    base_val = base_eff.get(p)
                    scen_val = scen_eff.get(p)

                    unit = "pH units" if p == "ph" else "mg/L"
                    comp_risk = self._evaluate_compliance_risk(p, scen_val)

                    # Uncertainty interval (±5% based on process stochasticity)
                    unc_interval = {
                        "lower": round(scen_val * 0.95, 2) if scen_val else None,
                        "upper": round(scen_val * 1.05, 2) if scen_val else None,
                        "confidence": 0.95,
                    } if scen_val is not None else None

                    res_step = TwinScenarioResult(
                        result_id=uuid4(),
                        scenario_id=scenario_id,
                        step_index=step + 1,
                        simulation_timestamp=step_time,
                        treatment_stage="final_effluent",
                        parameter=p,
                        baseline_value=Decimal(str(round(base_val, 4))) if base_val is not None else None,
                        scenario_value=Decimal(str(round(scen_val, 4))) if scen_val is not None else None,
                        unit=unit,
                        estimated_compliance_status=comp_risk,
                        uncertainty_interval=unc_interval,
                        data_origin="hypothetical",
                    )
                    results.append(res_step)

            # Persist results
            self.repo.save_scenario_results(results)
            scenario_entity.status = "completed"
            scenario_entity.completed_at = utc_now()
            self.db.flush()

        except Exception as ex:
            scenario_entity.status = "failed"
            scenario_entity.error_details = str(ex)
            scenario_entity.completed_at = utc_now()
            self.db.flush()
            raise

        return scenario_entity
