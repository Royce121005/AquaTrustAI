"""
AquaTrust AI — Process Recommendations Engine (Phase 4)
Translates AI anomaly detections, sensor trust diagnostics, and predictive quality forecasts
into prioritized, actionable, and standardized process interventions for wastewater treatment plant operators.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Union
from uuid import uuid4

from ml.recommendations.schemas import (
    ProcessRecommendation,
    RecommendationCategory,
    RecommendationSeverity,
    RecommendationUrgency,
    ParameterTarget,
    RecommendationBatchOutput,
)
from ml.inference.schemas import AnomalyInferenceOutput
from ml.inference.sensor_trust import SensorTrustAnomalyType
from ml.prediction.schemas import TreatmentQualityPredictionOutput


class AquaTrustProcessRecommendationEngine:
    """
    Expert prescriptive recommendation engine for AquaTrust AI.
    Synthesizes sensor trust faults, Isolation Forest anomalies, and forward-looking
    treatment quality predictions to produce concrete operational instructions.
    """

    def __init__(self):
        pass

    def generate_recommendations(
        self,
        facility_id: str,
        timestamp: Optional[str] = None,
        prediction_output: Optional[TreatmentQualityPredictionOutput] = None,
        anomaly_outputs: Optional[List[AnomalyInferenceOutput]] = None,
        current_readings: Optional[Dict[str, float]] = None,
    ) -> RecommendationBatchOutput:
        """
        Evaluates operational health and generates prioritized process recommendations.

        Args:
            facility_id: Target facility identifier (e.g. 'BHARWARA_STP').
            timestamp: ISO-8601 evaluation timestamp (defaults to current UTC).
            prediction_output: Optional Phase 3 predictive forecast output.
            anomaly_outputs: Optional list of Phase 2 anomaly / sensor trust results.
            current_readings: Optional dict of raw parameter values at evaluation time.

        Returns:
            RecommendationBatchOutput containing prioritized ProcessRecommendation objects.
        """
        eval_time = timestamp or datetime.now(timezone.utc).isoformat()
        recommendations: List[ProcessRecommendation] = []
        readings = current_readings or {}

        # 1. Evaluate Predictive Quality Forecasts (Preemptive Interventions)
        if prediction_output is not None:
            pred_recs = self._evaluate_prediction_recs(facility_id, eval_time, prediction_output)
            recommendations.extend(pred_recs)

        # 2. Evaluate Sensor Trust & Telemetry Anomaly Detections
        if anomaly_outputs:
            for anom in anomaly_outputs:
                anom_rec = self._evaluate_anomaly_rec(facility_id, eval_time, anom)
                if anom_rec is not None:
                    recommendations.append(anom_rec)

        # 3. Evaluate Resource Throttling / Efficiency Opportunities
        if prediction_output is not None and not recommendations:
            opt_rec = self._evaluate_energy_optimization(facility_id, eval_time, prediction_output, readings)
            if opt_rec is not None:
                recommendations.append(opt_rec)

        # Deduplicate recommendations by title
        deduped = []
        seen_titles = set()
        for r in recommendations:
            if r.title not in seen_titles:
                seen_titles.add(r.title)
                deduped.append(r)

        # Prioritize recommendations by severity: CRITICAL -> HIGH -> MEDIUM -> LOW
        severity_rank = {
            RecommendationSeverity.CRITICAL: 0,
            RecommendationSeverity.HIGH: 1,
            RecommendationSeverity.MEDIUM: 2,
            RecommendationSeverity.LOW: 3,
        }
        deduped.sort(key=lambda x: severity_rank.get(x.severity, 4))

        # Determine summary statistics
        critical_count = sum(1 for r in deduped if r.severity == RecommendationSeverity.CRITICAL)
        highest_severity = deduped[0].severity if deduped else RecommendationSeverity.LOW

        if not deduped:
            summary = "All biological, physical, and sensor parameters are nominal. No operator interventions required."
        else:
            summary = (
                f"{len(deduped)} active recommendation(s) generated. "
                f"Highest severity: {highest_severity.value}. "
                f"Top priority action: {deduped[0].title}."
            )

        return RecommendationBatchOutput(
            facility_id=facility_id,
            timestamp=eval_time,
            active_count=len(deduped),
            critical_count=critical_count,
            recommendations=deduped,
            highest_severity=highest_severity,
            summary=summary,
        )

    def _evaluate_prediction_recs(
        self,
        facility_id: str,
        timestamp: str,
        pred: TreatmentQualityPredictionOutput,
    ) -> List[ProcessRecommendation]:
        """Generates proactive interventions based on forecasted downstream effluent quality."""
        recs: List[ProcessRecommendation] = []
        preds = pred.predicted_parameters

        # BOD Breach / Borderline
        if "bod" in preds:
            bod_p = preds["bod"]
            if bod_p.risk_level == "BREACH_RISK":
                recs.append(
                    ProcessRecommendation(
                        recommendation_id=str(uuid4()),
                        facility_id=facility_id,
                        timestamp=timestamp,
                        title="Increase Aeration Basin Air Flow",
                        action=(
                            "Increase aeration blower VFD frequency by +20% (or engage standby blower B-03). "
                            "Target Dissolved Oxygen (DO) setpoint in aeration basin: 2.5 mg/L."
                        ),
                        category=RecommendationCategory.AERATION,
                        severity=RecommendationSeverity.HIGH,
                        urgency=RecommendationUrgency.WITHIN_1_HOUR,
                        related_parameter="bod",
                        trigger_source="QUALITY_PREDICTION",
                        reason=(
                            f"Effluent BOD forecast is {bod_p.predicted_value} mg/L, exceeding the statutory CPCB "
                            f"discharge limit of {bod_p.cpcb_discharge_limit} mg/L within the {pred.lead_time_hours}h retention window."
                        ),
                        parameter_target=ParameterTarget(
                            parameter="dissolved_oxygen",
                            current_value=1.5,
                            recommended_setpoint=2.5,
                            unit="mg/L",
                            adjustment_delta=1.0,
                        ),
                        estimated_impact="Prevents statutory CPCB breach; projected to reduce effluent BOD by 8 to 12 mg/L.",
                        is_automated_dispatch_eligible=False,
                    )
                )
            elif bod_p.risk_level == "BORDERLINE":
                recs.append(
                    ProcessRecommendation(
                        recommendation_id=str(uuid4()),
                        facility_id=facility_id,
                        timestamp=timestamp,
                        title="Trim Aerator Blower Output (+10%)",
                        action="Increment blower output by +10% to raise Dissolved Oxygen from 1.6 to 2.2 mg/L.",
                        category=RecommendationCategory.AERATION,
                        severity=RecommendationSeverity.MEDIUM,
                        urgency=RecommendationUrgency.WITHIN_4_HOURS,
                        related_parameter="bod",
                        trigger_source="QUALITY_PREDICTION",
                        reason=(
                            f"Effluent BOD is trending towards upper safety margin ({bod_p.predicted_value} mg/L vs limit {bod_p.cpcb_discharge_limit} mg/L)."
                        ),
                        parameter_target=ParameterTarget(
                            parameter="dissolved_oxygen",
                            current_value=1.6,
                            recommended_setpoint=2.2,
                            unit="mg/L",
                            adjustment_delta=0.6,
                        ),
                        estimated_impact="Stabilizes biological oxidation and maintains safe compliance buffer.",
                        is_automated_dispatch_eligible=True,
                    )
                )

        # COD Breach Forecast
        if "cod" in preds:
            cod_p = preds["cod"]
            if cod_p.risk_level == "BREACH_RISK":
                recs.append(
                    ProcessRecommendation(
                        recommendation_id=str(uuid4()),
                        facility_id=facility_id,
                        timestamp=timestamp,
                        title="Divert Flow to Equalization Basin & Increase RAS Rate",
                        action=(
                            "Open equalization basin diversion gate by 20% to attenuate organic shock load. "
                            "Increase Return Activated Sludge (RAS) pumping rate by +15% to boost active biomass inventory."
                        ),
                        category=RecommendationCategory.HYDRAULIC_CONTROL,
                        severity=RecommendationSeverity.CRITICAL,
                        urgency=RecommendationUrgency.WITHIN_1_HOUR,
                        related_parameter="cod",
                        trigger_source="QUALITY_PREDICTION",
                        reason=(
                            f"Forecasted effluent COD of {cod_p.predicted_value} mg/L exceeds the statutory 250 mg/L limit."
                        ),
                        parameter_target=ParameterTarget(
                            parameter="ras_ratio",
                            current_value=0.50,
                            recommended_setpoint=0.65,
                            unit="ratio",
                            adjustment_delta=0.15,
                        ),
                        estimated_impact="Buffers biological shock load and increases hydraulic retention time by 1.8 hours.",
                        is_automated_dispatch_eligible=False,
                    )
                )

        # TSS Breach Forecast (Secondary Clarifier solids carryover)
        if "tss" in preds:
            tss_p = preds["tss"]
            if tss_p.risk_level == "BREACH_RISK":
                recs.append(
                    ProcessRecommendation(
                        recommendation_id=str(uuid4()),
                        facility_id=facility_id,
                        timestamp=timestamp,
                        title="Increase Coagulant Dosing (PAC / Alum)",
                        action=(
                            "Increase Polyaluminium Chloride (PAC) chemical metering pump stroke to deliver +25% coagulant dosage. "
                            "Inspect secondary clarifier scraper mechanism and scum baffle."
                        ),
                        category=RecommendationCategory.CHEMICAL_DOSING,
                        severity=RecommendationSeverity.HIGH,
                        urgency=RecommendationUrgency.WITHIN_1_HOUR,
                        related_parameter="tss",
                        trigger_source="QUALITY_PREDICTION",
                        reason=(
                            f"Effluent TSS forecast ({tss_p.predicted_value} mg/L) indicates risk of solids carryover exceeding CPCB 100 mg/L limit."
                        ),
                        parameter_target=ParameterTarget(
                            parameter="pac_dosage",
                            current_value=15.0,
                            recommended_setpoint=22.5,
                            unit="mg/L",
                            adjustment_delta=7.5,
                        ),
                        estimated_impact="Restores rapid flocculation in clarifier; projected effluent TSS reduction of 15-25 mg/L.",
                        is_automated_dispatch_eligible=True,
                    )
                )

        # pH Breach Forecast
        if "ph" in preds:
            ph_p = preds["ph"]
            if ph_p.risk_level == "BREACH_RISK":
                action = (
                    "Dose Caustic Soda (NaOH) solution at 18 L/hr into neutralization tank."
                    if ph_p.predicted_value < 5.5
                    else "Dose dilute Sulfuric Acid (H2SO4) at 12 L/hr into neutralization tank."
                )
                recs.append(
                    ProcessRecommendation(
                        recommendation_id=str(uuid4()),
                        facility_id=facility_id,
                        timestamp=timestamp,
                        title="Activate Chemical pH Neutralization",
                        action=action,
                        category=RecommendationCategory.CHEMICAL_DOSING,
                        severity=RecommendationSeverity.HIGH,
                        urgency=RecommendationUrgency.IMMEDIATE,
                        related_parameter="ph",
                        trigger_source="QUALITY_PREDICTION",
                        reason=f"Predicted effluent pH ({ph_p.predicted_value}) falls outside regulatory envelope (5.5 - 9.0).",
                        parameter_target=ParameterTarget(
                            parameter="ph",
                            current_value=ph_p.predicted_value,
                            recommended_setpoint=7.2,
                            unit="pH_units",
                            adjustment_delta=round(7.2 - ph_p.predicted_value, 2),
                        ),
                        estimated_impact="Buffers effluent to safe neutral range (pH 7.0 - 7.4) prior to discharge or reuse.",
                        is_automated_dispatch_eligible=True,
                    )
                )

        return recs

    def _evaluate_anomaly_rec(
        self,
        facility_id: str,
        timestamp: str,
        anom: AnomalyInferenceOutput,
    ) -> Optional[ProcessRecommendation]:
        """Maps specific Phase 2 sensor trust faults and anomalies into operator actions."""
        atype = anom.anomaly_type

        if atype == SensorTrustAnomalyType.STUCK_SENSOR.value:
            return ProcessRecommendation(
                recommendation_id=str(uuid4()),
                facility_id=facility_id,
                timestamp=timestamp,
                title=f"Inspect & Clean Frozen Sensor ({anom.parameter.upper()})",
                action=(
                    f"Dispatch instrument technician to inspect {anom.parameter.upper()} sensor probe. "
                    f"Clean optical lens / electrode face to clear biofouling accumulation and verify transducer signal output."
                ),
                category=RecommendationCategory.MAINTENANCE,
                severity=RecommendationSeverity.HIGH,
                urgency=RecommendationUrgency.WITHIN_4_HOURS,
                related_parameter=anom.parameter,
                trigger_source="SENSOR_TRUST",
                reason=(
                    f"Sensor is frozen on constant value ({anom.value} {anom.unit}) across consecutive samples without physical variation."
                ),
                estimated_impact="Restores telemetry observability and prevents blinded automated control loops.",
                is_automated_dispatch_eligible=False,
            )

        elif atype == SensorTrustAnomalyType.SENSOR_FAILURE.value:
            return ProcessRecommendation(
                recommendation_id=str(uuid4()),
                facility_id=facility_id,
                timestamp=timestamp,
                title=f"Isolate & Replace Failed Sensor ({anom.parameter.upper()})",
                action=(
                    f"Switch SCADA automated control loop for {anom.parameter.upper()} to fallback manual setpoints. "
                    f"Isolate sensor channel and replace hardware transmitter / electrode."
                ),
                category=RecommendationCategory.MAINTENANCE,
                severity=RecommendationSeverity.CRITICAL,
                urgency=RecommendationUrgency.IMMEDIATE,
                related_parameter=anom.parameter,
                trigger_source="SENSOR_TRUST",
                reason=f"Sensor reported physically impossible value: {anom.value} {anom.unit}.",
                estimated_impact="Eliminates corrupted control signals and guards against runaway dosing.",
                is_automated_dispatch_eligible=False,
            )

        elif atype == SensorTrustAnomalyType.SENSOR_DRIFT.value:
            return ProcessRecommendation(
                recommendation_id=str(uuid4()),
                facility_id=facility_id,
                timestamp=timestamp,
                title=f"Recalibrate Drifted Sensor ({anom.parameter.upper()})",
                action=(
                    f"Schedule two-point buffer recalibration for {anom.parameter.upper()} instrument at the end of the shift."
                ),
                category=RecommendationCategory.MAINTENANCE,
                severity=RecommendationSeverity.MEDIUM,
                urgency=RecommendationUrgency.ROUTINE,
                related_parameter=anom.parameter,
                trigger_source="SENSOR_TRUST",
                reason="Systematic monotonic drift detected across observation window without plant process justification.",
                estimated_impact="Eliminates measurement drift bias before it triggers false regulatory alarms.",
                is_automated_dispatch_eligible=False,
            )

        elif atype == SensorTrustAnomalyType.PARAMETER_INCONSISTENCY.value:
            return ProcessRecommendation(
                recommendation_id=str(uuid4()),
                facility_id=facility_id,
                timestamp=timestamp,
                title=f"Re-Verify Analytical Measurements ({anom.parameter.upper()})",
                action=(
                    f"Quarantine sample and perform re-test for {anom.parameter.upper()}. "
                    f"Cross-check laboratory spectrophotometer calibration curve and reagent blanks."
                ),
                category=RecommendationCategory.MAINTENANCE,
                severity=RecommendationSeverity.HIGH,
                urgency=RecommendationUrgency.WITHIN_1_HOUR,
                related_parameter=anom.parameter,
                trigger_source="SENSOR_TRUST",
                reason=anom.explanation or "Stoichiometric relationship between parameters was violated (e.g. COD < BOD).",
                estimated_impact="Prevents invalid data from entering regulatory compliance snapshots.",
                is_automated_dispatch_eligible=False,
            )

        elif atype in [SensorTrustAnomalyType.SUDDEN_PROCESS_CHANGE.value, SensorTrustAnomalyType.SUDDEN_SPIKE.value]:
            if not anom.is_sensor_fault:
                return ProcessRecommendation(
                    recommendation_id=str(uuid4()),
                    facility_id=facility_id,
                    timestamp=timestamp,
                    title="Industrial Shock Load: Engage Equalization & Maximize Aeration",
                    action=(
                        "Engage storm/equalization holding tank to dampen incoming contamination surge. "
                        "Spin up secondary aeration blowers to maximum rated capacity to prevent biomass oxygen starvation."
                    ),
                    category=RecommendationCategory.HYDRAULIC_CONTROL,
                    severity=RecommendationSeverity.CRITICAL,
                    urgency=RecommendationUrgency.IMMEDIATE,
                    related_parameter=anom.parameter,
                    trigger_source="ANOMALY_DETECTION",
                    reason=f"Severe contamination spike observed on {anom.parameter.upper()} ({anom.value} {anom.unit}).",
                    estimated_impact="Protects biological activated sludge biomass from toxic collapse.",
                    is_automated_dispatch_eligible=False,
                )

        return None

    def _evaluate_energy_optimization(
        self,
        facility_id: str,
        timestamp: str,
        pred: TreatmentQualityPredictionOutput,
        readings: Dict[str, float],
    ) -> Optional[ProcessRecommendation]:
        """Identifies safe opportunities to throttle aeration blowers during low-load periods."""
        bod_pred = pred.predicted_parameters.get("bod")
        cod_pred = pred.predicted_parameters.get("cod")

        # If effluent is far below limits (e.g. BOD < 14, COD < 70) and inlet is modest
        if bod_pred and bod_pred.predicted_value < 14.0 and cod_pred and cod_pred.predicted_value < 75.0:
            return ProcessRecommendation(
                recommendation_id=str(uuid4()),
                facility_id=facility_id,
                timestamp=timestamp,
                title="Throttle Blower VFD (Energy Conservation Mode)",
                action=(
                    "Reduce aeration blower output by -20% (lower frequency by 5 Hz). "
                    "Maintain dissolved oxygen setpoint at safe 1.8 mg/L."
                ),
                category=RecommendationCategory.RESOURCE_SAVING,
                severity=RecommendationSeverity.LOW,
                urgency=RecommendationUrgency.ROUTINE,
                related_parameter="bod",
                trigger_source="OPTIMIZATION",
                reason=(
                    f"Effluent organic load is exceptionally low (predicted BOD: {bod_pred.predicted_value} mg/L << 30 mg/L). "
                    f"Excessive aeration wastes electrical energy without treatment benefit."
                ),
                parameter_target=ParameterTarget(
                    parameter="blower_power",
                    current_value=50.0,
                    recommended_setpoint=36.0,
                    unit="kW",
                    adjustment_delta=-14.0,
                ),
                estimated_impact="Reduces plant energy consumption by ~140 kWh/day (saving ~₹1,120/day) while staying fully compliant.",
                is_automated_dispatch_eligible=True,
            )
        return None
