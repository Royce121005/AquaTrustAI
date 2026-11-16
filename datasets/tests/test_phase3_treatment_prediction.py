"""
AquaTrust AI — Phase 3 Treatment Quality Prediction Unit & Integration Tests
Tests predictive modeling, regulatory CPCB risk scoring, and contract generation.
"""

import pytest
import os
import sys

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from ml.prediction import (
    AquaTrustTreatmentPredictionEngine,
    TreatmentPredictionInput,
    PredictedParameter,
    TreatmentQualityPredictionOutput,
    CPCB_DISCHARGE_LIMITS,
)


@pytest.fixture
def prediction_engine():
    return AquaTrustTreatmentPredictionEngine()


def test_engine_initialization(prediction_engine):
    assert prediction_engine is not None
    assert "bod" in prediction_engine.models
    assert "cod" in prediction_engine.models
    assert "tss" in prediction_engine.models
    assert "ph" in prediction_engine.models
    assert prediction_engine.model_version == "treatment_predictor_v1.0.0"
    assert "dataset_sha256" in prediction_engine.metadata


def test_nominal_treatment_prediction(prediction_engine):
    inp = TreatmentPredictionInput(
        facility_id="FAC_BHARWARA_01",
        timestamp="2026-11-16T12:00:00Z",
        inlet_bod=185.0,
        inlet_cod=360.0,
        inlet_tss=195.0,
        inlet_ph=7.4,
        flow_rate_q=38000.0,
    )
    res = prediction_engine.predict(inp)

    assert isinstance(res, TreatmentQualityPredictionOutput)
    assert res.facility_id == "FAC_BHARWARA_01"
    assert res.lead_time_hours == 6.0
    assert len(res.predicted_parameters) == 4

    # Verify predicted values are within physically valid ranges
    bod_pred = res.predicted_parameters["bod"]
    assert 5.0 <= bod_pred.predicted_value <= 50.0
    assert bod_pred.confidence_upper > bod_pred.confidence_lower
    assert bod_pred.cpcb_discharge_limit == 30.0
    assert bod_pred.expected_removal_efficiency_pct > 50.0  # At least 50% removal efficiency

    cod_pred = res.predicted_parameters["cod"]
    assert 30.0 <= cod_pred.predicted_value <= 200.0
    assert cod_pred.cpcb_discharge_limit == 250.0

    tss_pred = res.predicted_parameters["tss"]
    assert 5.0 <= tss_pred.predicted_value <= 80.0
    assert tss_pred.cpcb_discharge_limit == 100.0

    ph_pred = res.predicted_parameters["ph"]
    assert 6.5 <= ph_pred.predicted_value <= 8.5


def test_shock_load_risk_escalation(prediction_engine):
    # Severe shock load: high inlet BOD and COD
    inp = TreatmentPredictionInput(
        facility_id="FAC_JAJMAU_01",
        timestamp="2026-11-16T14:00:00Z",
        inlet_bod=550.0,
        inlet_cod=1200.0,
        inlet_tss=600.0,
        inlet_ph=5.8,
        flow_rate_q=60000.0,
    )
    res = prediction_engine.predict(inp)

    assert res.overall_risk_status in ["MODERATE_RISK", "HIGH_RISK"]
    assert res.overall_risk_score >= 0.40
    assert res.recommendation_hint is not None


def test_dict_input_compatibility(prediction_engine):
    payload = {
        "facility_id": "FAC_DINAPUR_01",
        "timestamp": "2026-11-16T16:00:00Z",
        "inlet_bod": 170.0,
        "inlet_cod": 320.0,
        "inlet_tss": 180.0,
        "inlet_ph": 7.6,
    }
    res = prediction_engine.predict(payload)
    assert res.facility_id == "FAC_DINAPUR_01"
    d = res.to_dict()
    assert isinstance(d, dict)
    assert "predicted_parameters" in d
    assert "overall_risk_status" in d
    assert "inference_latency_ms" in d


def test_input_validation():
    with pytest.raises(ValueError):
        # Empty facility_id must fail
        TreatmentPredictionInput(
            facility_id="",
            timestamp="2026-11-16T12:00:00Z",
            inlet_bod=100.0,
            inlet_cod=200.0,
            inlet_tss=100.0,
            inlet_ph=7.0,
        )
