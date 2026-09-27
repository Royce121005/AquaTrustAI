"""
AquaTrust AI — Runtime Synthetic Telemetry Simulator
Production-structured synthetic stream generator for multi-facility wastewater treatment plants.
Integrates empirical distributions, diurnal profiles, AR(1) mean reversion, stoichiometric coupling,
stage removal efficiencies, anomaly scenario injection, canonical Pydantic model construction,
and online AI Isolation Forest inference.
"""

import math
import hashlib
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np

from datasets.canonical.models import (
    CanonicalReading,
    DataOrigin,
    MeasurementStage,
    QualityStatus,
    AnomalyStatus,
    ComplianceStatus,
    CanonicalParameter
)
from ml.inference import AquaTrustAnomalyInferenceEngine, AnomalyInferenceOutput
from backend.app.simulator.schemas import (
    FacilityStreamConfig,
    ScenarioGroundTruth,
    SimulatedReadingPayload
)
from backend.app.simulator.profile_loader import ProfileLoader
from backend.app.simulator.anomalies import AnomalyInjector


PARAM_SLUG_TO_CANONICAL_ENUM = {
    "bod": CanonicalParameter.BOD,
    "cod": CanonicalParameter.COD,
    "tss": CanonicalParameter.TSS,
    "ph": CanonicalParameter.PH,
    "nh4_n": CanonicalParameter.NH4_N,
    "tn": CanonicalParameter.TN,
    "tkn": CanonicalParameter.TKN,
    "nox_n": CanonicalParameter.NOX_N,
    "cond": CanonicalParameter.COND,
    "flow_rate": CanonicalParameter.FLOW_RATE
}

PARAM_UNITS = {
    "bod": "mg/L",
    "cod": "mg/L",
    "tss": "mg/L",
    "ph": "pH units",
    "nh4_n": "mg/L",
    "tn": "mg/L",
    "tkn": "mg/L",
    "nox_n": "mg/L",
    "cond": "µS/cm",
    "flow_rate": "m3/day"
}


class AquaTrustRuntimeSimulator:
    """
    Runtime Telemetry Simulator for AquaTrust AI.
    Generates deterministic, physical-conforming synthetic telemetry streams.
    """

    def __init__(
        self,
        config: Optional[FacilityStreamConfig] = None,
        profile_loader: Optional[ProfileLoader] = None,
        ai_engine: Optional[AquaTrustAnomalyInferenceEngine] = None,
        enable_ai_inference: bool = True
    ):
        self.config = config or FacilityStreamConfig()
        self.loader = profile_loader or ProfileLoader()
        self.ai_engine = ai_engine
        self.enable_ai_inference = enable_ai_inference

        if self.enable_ai_inference and self.ai_engine is None:
            self.ai_engine = AquaTrustAnomalyInferenceEngine()

        # Initialize Random State
        seed = self.config.random_seed if self.config.random_seed is not None else 42
        self.rng = np.random.RandomState(seed)

        # Anomaly Injector
        self.injector = AnomalyInjector(rng=self.rng)

        # Simulation Clock & State Tracking
        self.current_time = self.config.simulation_start_time
        self.step_index = 0
        self._ar1_state: Dict[str, float] = {}  # stream_key -> x_{t-1}
        self._last_emitted: Dict[str, Dict[str, Any]] = {}

    def reset(self, random_seed: Optional[int] = None, start_time: Optional[datetime] = None):
        """Resets simulator state clock and AR(1) history."""
        if random_seed is not None:
            self.config.random_seed = random_seed
            self.rng = np.random.RandomState(random_seed)
            self.injector = AnomalyInjector(rng=self.rng)

        if start_time is not None:
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
            self.config.simulation_start_time = start_time

        self.current_time = self.config.simulation_start_time
        self.step_index = 0
        self._ar1_state.clear()
        self._last_emitted.clear()
        if self.ai_engine:
            self.ai_engine.reset_stream_cache()

    def inject_anomaly_scenario(self, scenario_id: str, stage: str = "final_effluent", param: str = "ph"):
        """
        Triggers an anomaly injection scenario for a target stage and parameter.
        """
        recipe = self.loader.get_anomaly_scenario_recipe(scenario_id)
        if not recipe:
            raise ValueError(f"Unknown anomaly scenario ID or recipe: '{scenario_id}'")

        target_params = recipe.get("target_parameters", [param])
        if "ALL" in target_params or param in target_params:
            stream_key = f"{self.config.facility_id}:{stage}:{param.lower()}"
            self.injector.start_scenario(stream_key, scenario_id, recipe)
        else:
            for p in target_params:
                stream_key = f"{self.config.facility_id}:{stage}:{p.lower()}"
                self.injector.start_scenario(stream_key, scenario_id, recipe)

    def _sample_baseline(self, stage: str, param: str) -> float:
        """Samples nominal baseline concentration from empirical distribution."""
        dist = self.loader.get_distribution(self.config.profile_facility_key, stage, param.lower())
        if not dist:
            # Fallback default values
            defaults = {
                "ph": 7.7, "bod": 18.0 if stage == "final_effluent" else 180.0,
                "cod": 80.0 if stage == "final_effluent" else 400.0,
                "tss": 20.0 if stage == "final_effluent" else 220.0,
                "nh4_n": 2.0 if stage == "final_effluent" else 35.0,
                "tn": 15.0 if stage == "final_effluent" else 50.0,
                "tkn": 3.0 if stage == "final_effluent" else 40.0
            }
            return defaults.get(param.lower(), 10.0)

        rec_dist = dist.get("recommended_distribution", "normal")
        dist_params = dist.get("distribution_parameters", {})

        if rec_dist == "lognormal":
            mu = dist_params.get("mu_log", math.log(dist.get("median", 10.0)))
            sigma = dist_params.get("sigma_log", 0.4)
            val = float(self.rng.lognormal(mean=mu, sigma=sigma))
        else:
            loc = dist_params.get("loc", dist.get("mean", 10.0))
            scale = dist_params.get("scale", dist.get("std", 1.0))
            val = float(self.rng.normal(loc=loc, scale=scale))

        return val

    def _apply_operating_bounds(self, param: str, value: float) -> float:
        """Clips generated value to physical non-negative boundaries."""
        op_range = self.loader.get_operating_range(param)
        if not op_range:
            return max(0.0, value)

        phys_bounds = op_range.get("physical_boundaries", {})
        min_bound = phys_bounds.get("theoretical_min", 0.0)
        max_bound = phys_bounds.get("physical_absolute_max", 10000.0)

        if param.lower() == "ph":
            return round(float(np.clip(value, 0.0, 14.0)), 2)
        return round(float(np.clip(value, min_bound, max_bound)), 2)

    def _generate_time_series_value(
        self,
        stage: str,
        param: str,
        timestamp: datetime
    ) -> float:
        """
        Applies diurnal load multiplier and AR(1) mean-reverting process.
        """
        param_slug = param.lower()
        stream_key = f"{self.config.facility_id}:{stage}:{param_slug}"

        # 1. Baseline distribution sample
        mu_baseline = self._sample_baseline(stage, param_slug)

        # 2. Diurnal factor based on hour of day
        hour = timestamp.hour
        diurnal_multipliers = self.loader.get_diurnal_hourly_multipliers()
        f_hour = diurnal_multipliers[hour] if hour < len(diurnal_multipliers) else 1.0

        if param_slug == "ph":
            # Additive small fluctuation for pH around neutral baseline
            mu_target = mu_baseline + (f_hour - 1.0) * 0.15
        else:
            mu_target = mu_baseline * f_hour

        # 3. AR(1) Mean-Reverting Ornstein-Uhlenbeck Process
        # x_t = mu_target + phi * (x_{t-1} - mu_target) + sigma_eps * eps_t
        ar_config = self.loader.get_ar1_parameters(param_slug)
        phi = ar_config.get("phi", 0.70)
        sigma_eps = ar_config.get("sigma_epsilon_effluent", 1.0)

        if stream_key not in self._ar1_state:
            x_prev = mu_target
        else:
            x_prev = self._ar1_state[stream_key]

        eps = float(self.rng.normal(0, 1))
        x_t = mu_target + phi * (x_prev - mu_target) + (sigma_eps * 0.2 * eps)

        # Ensure bounds
        x_bounded = self._apply_operating_bounds(param_slug, x_t)
        self._ar1_state[stream_key] = x_bounded

        return x_bounded

    def generate_raw_stage_readings(
        self,
        timestamp: Optional[datetime] = None,
        stage: str = "final_effluent",
        parameters: Optional[List[str]] = None
    ) -> Dict[str, float]:
        """
        Generates multi-parameter readings at a specific stage with stoichiometric coupling.
        """
        ts = timestamp or self.current_time
        params = parameters or ["bod", "cod", "tss", "ph", "nh4_n", "tkn", "tn"]

        raw_values: Dict[str, float] = {}
        for p in params:
            raw_values[p.lower()] = self._generate_time_series_value(stage, p, ts)

        # Enforce Stoichiometric Physical Coupling
        # 1. COD >= BOD constraint
        if "bod" in raw_values and "cod" in raw_values:
            min_ratio = 1.6 if stage == "inlet" else 2.0
            if raw_values["cod"] < (raw_values["bod"] * min_ratio):
                raw_values["cod"] = round(raw_values["bod"] * min_ratio, 2)

        # 2. TN >= TKN >= NH4-N constraint
        if "nh4_n" in raw_values:
            nh4 = raw_values["nh4_n"]
            if "tkn" in raw_values and raw_values["tkn"] < nh4:
                raw_values["tkn"] = round(nh4 * 1.15, 2)
            if "tn" in raw_values:
                tkn = raw_values.get("tkn", nh4 * 1.15)
                if raw_values["tn"] < tkn:
                    raw_values["tn"] = round(tkn * 1.2, 2)

        return raw_values

    def _determine_compliance_status(self, param: str, val: float, stage: str) -> str:
        """Evaluates value against statutory discharge limits."""
        if stage != "final_effluent" or val is None:
            return "not_applicable"

        op_range = self.loader.get_operating_range(param)
        if not op_range:
            return "compliant"

        stds = op_range.get("regulatory_discharge_standards", {})
        cpcb = stds.get("CPCB_India_General_Effluent", {})

        if param.lower() == "ph":
            min_p = cpcb.get("min_permissible", 6.5)
            max_p = cpcb.get("max_permissible", 9.0)
            if val < min_p or val > max_p:
                return "non_compliant"
            return "compliant"

        max_p = cpcb.get("max_permissible", 1000.0)
        if val > max_p:
            return "non_compliant"
        return "compliant"

    def step(
        self,
        parameters: Optional[List[str]] = None,
        stage: str = "final_effluent"
    ) -> List[CanonicalReading]:
        """
        Advances simulation clock by 1 step (15 min) and produces CanonicalReading objects.
        Executes AI inference if enabled.
        """
        self.step_index += 1
        ts = self.current_time
        params = parameters or ["ph", "cod", "bod", "tss", "nh4_n", "tkn"]

        # 1. Generate stoichiometric baseline readings
        raw_vals = self.generate_raw_stage_readings(timestamp=ts, stage=stage, parameters=params)

        canonical_readings: List[CanonicalReading] = []

        for p_slug, val_nominal in raw_vals.items():
            if p_slug not in PARAM_SLUG_TO_CANONICAL_ENUM:
                continue

            param_enum = PARAM_SLUG_TO_CANONICAL_ENUM[p_slug]
            unit = PARAM_UNITS.get(p_slug, "mg/L")
            stream_key = f"{self.config.facility_id}:{stage}:{p_slug}"
            sensor_id = f"SENSOR_{p_slug.upper()}_01"

            # Determine initial nominal compliance
            init_compliance = self._determine_compliance_status(p_slug, val_nominal, stage)

            # 2. Anomaly Injection
            last_emitted = self._last_emitted.get(stream_key)
            inj_val, qual_stat, comp_stat, ground_truth = self.injector.apply_scenario(
                stream_key=stream_key,
                param=p_slug,
                nominal_value=val_nominal,
                quality_status="valid",
                compliance_status=init_compliance,
                last_emitted_reading=last_emitted
            )

            # Convert numeric value to Decimal or None
            val_decimal = Decimal(str(round(inj_val, 4))) if inj_val is not None else None

            # Generate Provenance Link
            prov_input = f"{self.config.facility_id}:{ts.isoformat()}:{p_slug}:{inj_val}:{self.step_index}"
            prov_id = f"sim_prov_{hashlib.sha256(prov_input.encode()).hexdigest()[:16]}"

            # Construct Ground Truth Metadata
            metadata = {
                "profile_source": self.config.profile_facility_key,
                "simulation_step": self.step_index,
                "ground_truth": {
                    "scenario_id": ground_truth.scenario_id,
                    "scenario_name": ground_truth.scenario_name,
                    "is_injected_anomaly": ground_truth.is_injected_anomaly,
                    "expected_quality_status": ground_truth.expected_quality_status,
                    "expected_anomaly_status": ground_truth.expected_anomaly_status,
                    "expected_compliance_status": ground_truth.expected_compliance_status,
                    "injection_details": ground_truth.injection_details
                }
            }

            # Map Stage to Enum
            stage_enum = MeasurementStage.FINAL_EFFLUENT
            try:
                stage_enum = MeasurementStage(stage)
            except ValueError:
                pass

            # Map Status Strings to Enums
            q_enum = QualityStatus.VALID
            try:
                q_enum = QualityStatus(qual_stat)
            except ValueError:
                q_enum = QualityStatus.INVALID if qual_stat == "invalid" else QualityStatus.SUSPECT

            c_enum = ComplianceStatus.COMPLIANT
            try:
                c_enum = ComplianceStatus(comp_stat)
            except ValueError:
                c_enum = ComplianceStatus.NON_COMPLIANT

            # Initial Anomaly Status before AI predict
            a_enum = AnomalyStatus.PENDING

            # 3. AI Inference Integration
            if self.enable_ai_inference and self.ai_engine and inj_val is not None:
                ai_payload = {
                    "facility_id": self.config.facility_id,
                    "sensor_id": sensor_id,
                    "timestamp": ts.isoformat(),
                    "parameter": p_slug,
                    "value": float(inj_val),
                    "unit": unit,
                    "measurement_stage": stage,
                    "quality_status": q_enum.value,
                    "compliance_status": c_enum.value
                }

                try:
                    ai_out: AnomalyInferenceOutput = self.ai_engine.predict(ai_payload)
                    if ai_out.anomaly_status == "anomalous":
                        a_enum = AnomalyStatus.ANOMALOUS
                    elif ai_out.anomaly_status == "normal":
                        a_enum = AnomalyStatus.NORMAL
                    else:
                        a_enum = AnomalyStatus.INSUFFICIENT_DATA

                    metadata["ai_inference"] = {
                        "anomaly_score": ai_out.anomaly_score,
                        "model_version": ai_out.model_version,
                        "explanation": ai_out.explanation,
                        "inference_latency_ms": ai_out.inference_latency_ms
                    }
                except Exception as e:
                    # Unsupported parameter or missing payload handled gracefully
                    metadata["ai_inference_error"] = str(e)
                    a_enum = AnomalyStatus.INSUFFICIENT_DATA
            elif inj_val is None:
                a_enum = AnomalyStatus.INSUFFICIENT_DATA

            # 4. Instantiate Canonical Reading
            reading = CanonicalReading(
                dataset_id="SIMULATION_MULTI_STP_GRID",
                source_record_id=f"step_{self.step_index:06d}",
                facility_id=self.config.facility_id,
                sensor_id=sensor_id,
                timestamp=ts,
                measurement_stage=stage_enum,
                parameter=param_enum,
                value=val_decimal,
                unit=unit,
                data_origin=DataOrigin.SIMULATED,
                quality_status=q_enum,
                anomaly_status=a_enum,
                compliance_status=c_enum,
                provenance_id=prov_id,
                metadata=metadata
            )

            canonical_readings.append(reading)
            self._last_emitted[stream_key] = reading.to_canonical_dict()

        # Advance Clock by time_step_seconds
        self.current_time += timedelta(seconds=self.config.time_step_seconds)
        return canonical_readings

    def run_simulation_batch(
        self,
        num_steps: int = 96,
        stage: str = "final_effluent",
        parameters: Optional[List[str]] = None
    ) -> List[CanonicalReading]:
        """
        Executes a sequence of simulation time-steps and returns all emitted readings.
        """
        all_readings = []
        for _ in range(num_steps):
            readings = self.step(parameters=parameters, stage=stage)
            all_readings.extend(readings)
        return all_readings
