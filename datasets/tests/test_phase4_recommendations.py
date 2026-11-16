"""
AquaTrust AI — Phase 4 Process Recommendations Unit & Integration Tests
Tests prescriptive operational advice generation, severity prioritization,
and contract serialization for Member 2 (Backend).
"""

import pytest
import os
import sys

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from ml.recommendations import (
    AquaTrustProcessRecommendationEngine,
    ProcessRecommendation,
    RecommendationCategory,
    RecommendationSeverity,
    RecommendationUrgency,
    RecommendationBatchOutput,
)
from ml.inference.schemas import AnomalyInferenceOutput
from ml.prediction.schemas import (
    TreatmentQualityPredictionOutput,
    PredictedParameter,
)


@pytest.fixture
def rec_engine():
    return AquaTrustProcessRecommendationEngine()


def test_nominal_state_no_critical_recommendations(rec_engine):
    # Nominal prediction output
    pred = TreatmentQualityPredictionOutput(
        facility_id="FAC_BHARWARA",
        timestamp="2026-11-16T12:00:00Z",
        lead_time_hours=6.0,
        predicted_parameters={
            "bod": PredictedParameter("bod", 18.0, "mg/L", 30.0, 10.0, 24.0, "COMPLIANT", 0.3, 85.0),
            "cod": PredictedParameter("cod", 85.0, "mg/L", 250.0, 60.0, 110.0, "COMPLIANT", 0.17, 72.0),
            "tss": PredictedParameter("tss", 18.0, "mg/L", 100.0, 8.0, 28.0, "COMPLIANT", 0.09, 88.0),
            "ph": PredictedParameter("ph", 7.5, "pH_units", 9.0, 7.3, 7.7, "COMPLIANT", 0.05, 0.0),
        },
        overall_risk_status="LOW_RISK",
        overall_risk_score=0.15,
        is_cpcb_compliant=True,
        model_version="treatment_predictor_v1.0.0",
        summary_explanation="Nominal conditions",
        inference_latency_ms=1.2,
    )
    batch = rec_engine.generate_recommendations("FAC_BHARWARA", prediction_output=pred)
    assert batch.critical_count == 0
    assert batch.highest_severity in [RecommendationSeverity.LOW, RecommendationSeverity.MEDIUM]


def test_predicted_bod_breach_generates_aeration_rec(rec_engine):
    pred = TreatmentQualityPredictionOutput(
        facility_id="FAC_JAJMAU",
        timestamp="2026-11-16T12:00:00Z",
        lead_time_hours=6.0,
        predicted_parameters={
            "bod": PredictedParameter("bod", 34.5, "mg/L", 30.0, 20.0, 48.0, "BREACH_RISK", 0.95, 75.0),
            "cod": PredictedParameter("cod", 120.0, "mg/L", 250.0, 90.0, 150.0, "COMPLIANT", 0.24, 65.0),
        },
        overall_risk_status="HIGH_RISK",
        overall_risk_score=0.85,
        is_cpcb_compliant=False,
        model_version="treatment_predictor_v1.0.0",
        summary_explanation="Breach predicted",
        inference_latency_ms=1.5,
    )
    batch = rec_engine.generate_recommendations("FAC_JAJMAU", prediction_output=pred)
    assert batch.active_count >= 1

    bod_rec = next((r for r in batch.recommendations if r.related_parameter == "bod"), None)
    assert bod_rec is not None
    assert bod_rec.category == RecommendationCategory.AERATION
    assert bod_rec.severity == RecommendationSeverity.HIGH
    assert bod_rec.parameter_target is not None
    assert bod_rec.parameter_target.parameter == "dissolved_oxygen"
    assert bod_rec.parameter_target.recommended_setpoint == 2.5


def test_stuck_sensor_generates_maintenance_rec(rec_engine):
    anom = AnomalyInferenceOutput(
        facility_id="FAC_DINAPUR",
        timestamp="2026-11-16T12:00:00Z",
        parameter="ph",
        value=7.4,
        unit="pH_units",
        measurement_stage="final_effluent",
        anomaly_status="anomalous",
        anomaly_score=-0.2,
        model_version="iforest_v2.2.1",
        feature_set_version="v2.2.1",
        threshold=0.0,
        anomaly_type="STUCK_SENSOR",
        severity="HIGH",
        severity_score=0.75,
        is_sensor_fault=True,
    )
    batch = rec_engine.generate_recommendations("FAC_DINAPUR", anomaly_outputs=[anom])
    assert batch.active_count == 1
    rec = batch.recommendations[0]
    assert rec.category == RecommendationCategory.MAINTENANCE
    assert rec.severity == RecommendationSeverity.HIGH
    assert "clean" in rec.title.lower() or "inspect" in rec.title.lower()
    assert rec.related_parameter == "ph"


def test_sensor_failure_generates_critical_rec(rec_engine):
    anom = AnomalyInferenceOutput(
        facility_id="FAC_DINAPUR",
        timestamp="2026-11-16T12:00:00Z",
        parameter="cod",
        value=-50.0,  # Impossible negative reading
        unit="mg/L",
        measurement_stage="inlet",
        anomaly_status="anomalous",
        anomaly_score=-0.5,
        model_version="iforest_v2.2.1",
        feature_set_version="v2.2.1",
        threshold=0.0,
        anomaly_type="SENSOR_FAILURE",
        severity="CRITICAL",
        severity_score=0.95,
        is_sensor_fault=True,
    )
    batch = rec_engine.generate_recommendations("FAC_DINAPUR", anomaly_outputs=[anom])
    rec = batch.recommendations[0]
    assert rec.severity == RecommendationSeverity.CRITICAL
    assert rec.urgency == RecommendationUrgency.IMMEDIATE
    assert "replace" in rec.title.lower() or "isolate" in rec.title.lower()


def test_energy_throttling_during_low_load(rec_engine):
    # Exceptionally clean water (BOD=10, COD=50) -> should trigger energy savings advice
    pred = TreatmentQualityPredictionOutput(
        facility_id="FAC_BHARWARA",
        timestamp="2026-11-16T03:00:00Z",
        lead_time_hours=6.0,
        predicted_parameters={
            "bod": PredictedParameter("bod", 10.5, "mg/L", 30.0, 6.0, 15.0, "COMPLIANT", 0.17, 92.0),
            "cod": PredictedParameter("cod", 55.0, "mg/L", 250.0, 35.0, 75.0, "COMPLIANT", 0.11, 80.0),
            "tss": PredictedParameter("tss", 12.0, "mg/L", 100.0, 5.0, 20.0, "COMPLIANT", 0.06, 91.0),
            "ph": PredictedParameter("ph", 7.6, "pH_units", 9.0, 7.4, 7.8, "COMPLIANT", 0.05, 0.0),
        },
        overall_risk_status="LOW_RISK",
        overall_risk_score=0.10,
        is_cpcb_compliant=True,
        model_version="treatment_predictor_v1.0.0",
        summary_explanation="Very low organic load",
        inference_latency_ms=1.1,
    )
    batch = rec_engine.generate_recommendations("FAC_BHARWARA", prediction_output=pred)
    opt_rec = next((r for r in batch.recommendations if r.category == RecommendationCategory.RESOURCE_SAVING), None)
    assert opt_rec is not None
    assert opt_rec.severity == RecommendationSeverity.LOW
    assert "throttle" in opt_rec.title.lower() or "energy" in opt_rec.title.lower()
    assert opt_rec.parameter_target.parameter == "blower_power"
    assert opt_rec.parameter_target.adjustment_delta < 0  # Power reduction


def test_batch_serialization_contract(rec_engine):
    batch = rec_engine.generate_recommendations("FAC_SERIALIZE_TEST")
    d = batch.to_dict()
    assert isinstance(d, dict)
    assert d["facility_id"] == "FAC_SERIALIZE_TEST"
    assert "active_count" in d
    assert "highest_severity" in d
    assert "recommendations" in d
    assert isinstance(d["recommendations"], list)
