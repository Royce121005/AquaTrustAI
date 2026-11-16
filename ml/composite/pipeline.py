"""
AquaTrust AI — Composite Cycle Intelligence Pipeline (Phases 6 & 7)
Unifies Member 1's AI capabilities into a single integration contract:
- Phase 2: Sensor Trust & Anomaly Classification
- Phase 3: Downstream Effluent Quality Forecasting
- Phase 4: Prescriptive Process Recommendations
- Phase 5: Sustainability & Circular Resource Optimization

Supplies Member 2 (Backend) with finalized AI status, prediction status, risk status,
and the cryptographic evidence snapshot fragment for DLT anchoring.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timezone

from ml.inference.engine import AquaTrustAnomalyInferenceEngine
from ml.inference.schemas import CanonicalReadingInput, AnomalyInferenceOutput
from ml.prediction.engine import AquaTrustTreatmentPredictionEngine
from ml.prediction.schemas import TreatmentPredictionInput, TreatmentQualityPredictionOutput
from ml.recommendations.engine import AquaTrustProcessRecommendationEngine
from ml.recommendations.schemas import RecommendationBatchOutput
from ml.optimization.engine import AquaTrustResourceOptimizer
from ml.optimization.schemas import ResourceOptimizationInput, ResourceOptimizationOutput


@dataclass
class CycleIntelligenceOutput:
    """
    Finalized AI, prediction, recommendation, and sustainability intelligence
    for a completed treatment observation cycle.
    """
    facility_id: str
    period_start: str
    period_end: str
    ai_status: str                     # "normal" | "anomalous"
    prediction_status: str             # "COMPLIANT" | "BORDERLINE" | "BREACH_RISK"
    risk_status: str                   # "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK"
    risk_score: float                  # Normalized composite risk score 0.0 to 1.0
    is_treatment_cycle_approved: bool  # True if safe for discharge / reuse
    anomaly_summary: Dict[str, Any]
    predictions: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    sustainability: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_evidence_snapshot_fragment(self) -> Dict[str, Any]:
        """
        Returns standardized fragment to merge into TreatmentRecord.evidence_snapshot (Phase 7).
        Deterministic, serializable, and suitable for atc-v1 canonical hashing.
        """
        return {
            "ai_status": self.ai_status,
            "prediction_status": self.prediction_status,
            "risk_status": self.risk_status,
            "risk_score": round(self.risk_score, 4),
            "is_treatment_cycle_approved": self.is_treatment_cycle_approved,
            "anomaly_summary": self.anomaly_summary,
            "predictions_summary": {
                p: {
                    "predicted_value": data.get("predicted_value"),
                    "risk_level": data.get("risk_level"),
                    "expected_removal_pct": data.get("expected_removal_efficiency_pct"),
                }
                for p, data in self.predictions.get("predicted_parameters", {}).items()
            },
            "recommendations_count": len(self.recommendations),
            "highest_recommendation_severity": self.metadata.get("highest_recommendation_severity", "LOW"),
            "sustainability_summary": {
                "freshwater_saved_kl": self.sustainability.get("sustainability_kpis", {}).get("freshwater_saved_kl_day", 0.0),
                "water_circularity_pct": self.sustainability.get("sustainability_kpis", {}).get("water_circularity_ratio_pct", 0.0),
                "carbon_avoided_kg": self.sustainability.get("sustainability_kpis", {}).get("carbon_emissions_avoided_kg_co2_day", 0.0),
                "energy_saved_kwh": self.sustainability.get("aeration_optimization", {}).get("daily_energy_saved_kwh", 0.0),
                "cost_saved_inr": self.sustainability.get("total_daily_savings_inr", 0.0),
            },
        }

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class AquaTrustCycleIntelligencePipeline:
    """
    Master pipeline orchestrating Phases 2, 3, 4, and 5 for treatment cycle finalization.
    """

    def __init__(
        self,
        anomaly_engine: Optional[AquaTrustAnomalyInferenceEngine] = None,
        prediction_engine: Optional[AquaTrustTreatmentPredictionEngine] = None,
        recommendation_engine: Optional[AquaTrustProcessRecommendationEngine] = None,
        resource_optimizer: Optional[AquaTrustResourceOptimizer] = None,
    ):
        self.anomaly_engine = anomaly_engine or AquaTrustAnomalyInferenceEngine()
        self.prediction_engine = prediction_engine or AquaTrustTreatmentPredictionEngine()
        self.recommendation_engine = recommendation_engine or AquaTrustProcessRecommendationEngine()
        self.resource_optimizer = resource_optimizer or AquaTrustResourceOptimizer()

    def evaluate_treatment_cycle(
        self,
        facility_id: str,
        period_start: str,
        period_end: str,
        readings: List[Union[CanonicalReadingInput, Dict[str, Any]]],
        inflow_rate_m3_day: float = 40000.0,
        reused_flow_rate_m3_day: float = 12000.0,
        current_blower_power_kw: Optional[float] = None,
        current_pac_dosing_l_hr: Optional[float] = None,
    ) -> CycleIntelligenceOutput:
        """
        Runs comprehensive end-to-end evaluation over an observation window.
        """
        # 1. Process Anomalies across all readings (Phase 2)
        anomaly_outputs: List[AnomalyInferenceOutput] = []
        inlet_readings: Dict[str, float] = {}
        effluent_readings: Dict[str, float] = {}

        for r in readings:
            anom = self.anomaly_engine.predict(r, update_cache=True)
            anomaly_outputs.append(anom)

            stage = getattr(anom, "measurement_stage", "final_effluent")
            param = getattr(anom, "parameter", "").lower()
            val = getattr(anom, "value", 0.0)

            if "inlet" in stage or "inflow" in stage:
                inlet_readings[param] = val
            else:
                effluent_readings[param] = val

        # Compute AI Anomaly Status
        anom_count = sum(1 for a in anomaly_outputs if a.anomaly_status == "anomalous")
        fault_count = sum(1 for a in anomaly_outputs if getattr(a, "is_sensor_fault", False))
        ai_status = "anomalous" if anom_count > 0 else "normal"

        anomaly_summary = {
            "total_readings_evaluated": len(anomaly_outputs),
            "anomalies_detected": anom_count,
            "sensor_faults": fault_count,
            "anomaly_types_detected": list(set(a.anomaly_type for a in anomaly_outputs if a.anomaly_type != "NORMAL")),
            "highest_anomaly_severity": max([a.severity for a in anomaly_outputs], default="NORMAL"),
        }

        # 2. Process Treatment Quality Prediction (Phase 3)
        inlet_bod = inlet_readings.get("bod", 185.0)
        inlet_cod = inlet_readings.get("cod", 360.0)
        inlet_tss = inlet_readings.get("tss", 195.0)
        inlet_ph = inlet_readings.get("ph", 7.4)

        pred_input = TreatmentPredictionInput(
            facility_id=facility_id,
            timestamp=period_end,
            inlet_bod=inlet_bod,
            inlet_cod=inlet_cod,
            inlet_tss=inlet_tss,
            inlet_ph=inlet_ph,
            flow_rate_q=inflow_rate_m3_day,
            lead_time_hours=6.0,
        )
        prediction_output = self.prediction_engine.predict(pred_input)

        # Map prediction risk to cycle prediction status
        if prediction_output.overall_risk_status == "HIGH_RISK":
            prediction_status = "BREACH_RISK"
        elif prediction_output.overall_risk_status == "MODERATE_RISK":
            prediction_status = "BORDERLINE"
        else:
            prediction_status = "COMPLIANT"

        # 3. Process Prescriptive Recommendations (Phase 4)
        rec_batch = self.recommendation_engine.generate_recommendations(
            facility_id=facility_id,
            timestamp=period_end,
            prediction_output=prediction_output,
            anomaly_outputs=anomaly_outputs,
        )

        # 4. Process Sustainability & Resource Optimization (Phase 5)
        opt_input = ResourceOptimizationInput(
            facility_id=facility_id,
            timestamp=period_end,
            inflow_rate_m3_day=inflow_rate_m3_day,
            inlet_bod=inlet_bod,
            inlet_cod=inlet_cod,
            inlet_tss=inlet_tss,
            effluent_bod=effluent_readings.get("bod", prediction_output.predicted_parameters.get("bod", {}).predicted_value),
            effluent_cod=effluent_readings.get("cod", prediction_output.predicted_parameters.get("cod", {}).predicted_value),
            effluent_tss=effluent_readings.get("tss", prediction_output.predicted_parameters.get("tss", {}).predicted_value),
            reused_flow_rate_m3_day=reused_flow_rate_m3_day,
            current_blower_power_kw=current_blower_power_kw,
            current_pac_dosing_l_hr=current_pac_dosing_l_hr,
        )
        opt_output = self.resource_optimizer.optimize(opt_input)

        # 5. Composite Risk Status Determination (Phase 6 requirement)
        # Combine anomaly score (30%) + prediction risk (50%) + recommendations (20%)
        anom_factor = min(1.0, anom_count * 0.35 + fault_count * 0.20)
        pred_factor = prediction_output.overall_risk_score
        rec_factor = min(1.0, rec_batch.critical_count * 0.50 + (0.30 if rec_batch.highest_severity == "HIGH" else 0.0))

        composite_risk_score = round(0.30 * anom_factor + 0.50 * pred_factor + 0.20 * rec_factor, 3)

        if prediction_status == "BORDERLINE":
            composite_risk_score = max(0.35, composite_risk_score)
        elif prediction_status == "BREACH_RISK":
            composite_risk_score = max(0.70, composite_risk_score)

        if composite_risk_score >= 0.65 or rec_batch.critical_count > 0 or prediction_status == "BREACH_RISK":
            risk_status = "HIGH_RISK"
            is_approved = False
        elif composite_risk_score >= 0.35 or prediction_status == "BORDERLINE" or anom_count > 0:
            risk_status = "MODERATE_RISK"
            is_approved = True
        else:
            risk_status = "LOW_RISK"
            is_approved = True

        return CycleIntelligenceOutput(
            facility_id=facility_id,
            period_start=period_start,
            period_end=period_end,
            ai_status=ai_status,
            prediction_status=prediction_status,
            risk_status=risk_status,
            risk_score=composite_risk_score,
            is_treatment_cycle_approved=is_approved,
            anomaly_summary=anomaly_summary,
            predictions=prediction_output.to_dict(),
            recommendations=[r.to_dict() for r in rec_batch.recommendations],
            sustainability=opt_output.to_dict(),
            metadata={
                "highest_recommendation_severity": rec_batch.highest_severity.value,
                "critical_recommendations_count": rec_batch.critical_count,
                "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            },
        )
