"""
AquaTrust AI — Simulator Anomaly Injector Module
Executes the 8 standardized anomaly recipes from anomaly_scenarios.yaml.
Preserves scenario ground truth separately from AI inference results.
Map non-canonical scenario strings to authoritative Pydantic status enums.
"""

from typing import Dict, Any, Optional, Tuple
import numpy as np

from backend.app.simulator.schemas import ScenarioGroundTruth


class AnomalyInjector:
    """
    Stateful anomaly injector maintaining scenario step counters and applying synthetic perturbations.
    """

    def __init__(self, rng: Optional[np.random.RandomState] = None):
        self.rng = rng or np.random.RandomState(42)
        self._active_scenarios: Dict[str, Dict[str, Any]] = {}

    def start_scenario(self, stream_key: str, scenario_id: str, recipe: Dict[str, Any]):
        """
        Activates an anomaly scenario for a target stream.
        """
        duration = recipe.get("duration_steps", 1)
        self._active_scenarios[stream_key] = {
            "scenario_id": scenario_id,
            "recipe": recipe,
            "current_step": 0,
            "total_steps": duration,
            "stuck_value": None,
            "last_reading_payload": None
        }

    def clear_scenario(self, stream_key: str):
        """Clears active scenario for a stream."""
        if stream_key in self._active_scenarios:
            del self._active_scenarios[stream_key]

    def is_scenario_active(self, stream_key: str) -> bool:
        """Returns True if a scenario is actively running on stream_key."""
        return stream_key in self._active_scenarios

    def apply_scenario(
        self,
        stream_key: str,
        param: str,
        nominal_value: float,
        quality_status: str,
        compliance_status: str,
        last_emitted_reading: Optional[Dict[str, Any]] = None
    ) -> Tuple[Optional[float], str, str, ScenarioGroundTruth]:
        """
        Applies active anomaly recipe to the nominal reading payload.

        Returns:
            Tuple of:
            - injected_value (Optional[float]): Modified value or None for missing
            - quality_status (str): Canonical QualityStatus enum string
            - compliance_status (str): Canonical ComplianceStatus enum string
            - ground_truth (ScenarioGroundTruth): Separate scenario ground truth object
        """
        if stream_key not in self._active_scenarios:
            ground_truth = ScenarioGroundTruth(
                scenario_id="NOMINAL_OPERATION",
                scenario_name="Nominal Baseline Operation",
                is_injected_anomaly=False,
                expected_quality_status=quality_status,
                expected_anomaly_status="normal",
                expected_compliance_status=compliance_status
            )
            return nominal_value, quality_status, compliance_status, ground_truth

        scen_state = self._active_scenarios[stream_key]
        recipe = scen_state["recipe"]
        scenario_id = scen_state["scenario_id"]
        scen_state["current_step"] += 1
        step_idx = scen_state["current_step"]
        total_steps = scen_state["total_steps"]

        param_lower = param.lower()

        # Extract recipe expectations
        exp_statuses = recipe.get("expected_statuses", {})
        raw_qual = exp_statuses.get("quality_status", "valid")
        raw_anom = exp_statuses.get("anomaly_status", "anomalous")
        raw_comp = exp_statuses.get("compliance_status", "compliant")

        # Canonical Status Enums Mapping
        # Map non-canonical documentation strings to valid Pydantic enums
        canonical_quality = quality_status
        canonical_compliance = compliance_status
        quality_reason = None

        if raw_qual == "valid":
            canonical_quality = "valid"
        elif raw_qual in ["missing", "insufficient_data"]:
            canonical_quality = "insufficient_data"
            quality_reason = raw_qual
        elif raw_qual in ["range_violation_or_stuck", "stuck", "range_violation", "suspect"]:
            canonical_quality = "suspect"
            quality_reason = raw_qual
        elif raw_qual in ["duplicate_rejected", "multivariate_inconsistency", "invalid"]:
            canonical_quality = "invalid"
            quality_reason = raw_qual

        if "non_compliant" in raw_comp:
            canonical_compliance = "non_compliant"
        elif "compliant" in raw_comp:
            canonical_compliance = "compliant"
        elif raw_comp in ["unknown", "not_applicable"]:
            canonical_compliance = "not_applicable"

        injected_value: Optional[float] = nominal_value

        # SCENARIO 01: Sensor Spike
        if "SCENARIO_01" in scenario_id or "SENSOR_SPIKE" in scenario_id:
            if param_lower == "ph":
                injected_value = 13.5
            else:
                multiplier = self.rng.uniform(4.0, 7.5)
                injected_value = round(nominal_value * multiplier, 2)
            canonical_quality = "valid"
            canonical_compliance = "non_compliant"

        # SCENARIO 02: Sensor Drop
        elif "SCENARIO_02" in scenario_id or "SENSOR_DROP" in scenario_id:
            injected_value = 0.0
            canonical_quality = "valid"
            canonical_compliance = "compliant"

        # SCENARIO 03: Stuck Sensor
        elif "SCENARIO_03" in scenario_id or "STUCK_SENSOR" in scenario_id:
            if scen_state["stuck_value"] is None:
                scen_state["stuck_value"] = nominal_value
            injected_value = scen_state["stuck_value"]
            canonical_quality = "suspect"

        # SCENARIO 04: Sensor Drift
        elif "SCENARIO_04" in scenario_id or "SENSOR_DRIFT" in scenario_id:
            drift_rate = 0.05 * (0.25 if param_lower == "ph" else 15.0)
            injected_value = round(nominal_value + (drift_rate * step_idx), 3)
            canonical_quality = "valid"

        # SCENARIO 05: Missing Reading
        elif "SCENARIO_05" in scenario_id or "MISSING_READING" in scenario_id:
            injected_value = None
            canonical_quality = "insufficient_data"
            canonical_compliance = "not_applicable"

        # SCENARIO 06: Duplicate Reading
        elif "SCENARIO_06" in scenario_id or "DUPLICATE_READING" in scenario_id:
            if last_emitted_reading and last_emitted_reading.get("value") is not None:
                injected_value = float(last_emitted_reading["value"])
            else:
                injected_value = nominal_value
            canonical_quality = "invalid"

        # SCENARIO 07: Parameter Inconsistency (BOD > COD violation)
        elif "SCENARIO_07" in scenario_id or "PARAMETER_INCONSISTENCY" in scenario_id:
            if param_lower == "bod":
                injected_value = 140.0
            elif param_lower == "cod":
                injected_value = 45.0
            else:
                injected_value = nominal_value
            canonical_quality = "invalid"
            canonical_compliance = "non_compliant"

        # SCENARIO 08: Sudden Process Change (Acidic toxic load + surge)
        elif "SCENARIO_08" in scenario_id or "SUDDEN_PROCESS_CHANGE" in scenario_id:
            if param_lower == "ph":
                injected_value = 5.8
            elif param_lower == "cod":
                injected_value = round(nominal_value * 2.8, 2)
            elif param_lower == "bod":
                injected_value = round(nominal_value * 2.5, 2)
            elif param_lower == "tss":
                injected_value = round(nominal_value * 2.2, 2)
            canonical_quality = "valid"
            canonical_compliance = "non_compliant"

        # Construct Ground Truth Object
        ground_truth = ScenarioGroundTruth(
            scenario_id=scenario_id,
            scenario_name=recipe.get("scenario_name", scenario_id),
            is_injected_anomaly=True,
            target_parameter=param,
            step_in_scenario=step_idx,
            total_scenario_steps=total_steps,
            expected_quality_status=canonical_quality,
            expected_anomaly_status="anomalous" if "insufficient_data" not in raw_anom else "insufficient_data",
            expected_compliance_status=canonical_compliance,
            injection_details={
                "nominal_value": nominal_value,
                "injected_value": injected_value,
                "quality_reason": quality_reason,
                "raw_recipe_quality": raw_qual,
                "raw_recipe_compliance": raw_comp
            }
        )

        # Deactivate scenario if duration reached
        if step_idx >= total_steps:
            self.clear_scenario(stream_key)

        return injected_value, canonical_quality, canonical_compliance, ground_truth
