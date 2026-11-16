"""
AquaTrust AI — Phase 2 Sensor Trust Unit & Integration Tests
Tests taxonomy classification for:
- STUCK_SENSOR
- SUDDEN_SPIKE
- SENSOR_DRIFT
- PARAMETER_INCONSISTENCY
- SENSOR_FAILURE
- MISSING_READING
- DUPLICATE_READING
- NORMAL
And tests end-to-end integration with AquaTrustAnomalyInferenceEngine.
"""

import pytest
import os
import sys

# Ensure repository root is on sys.path
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from ml.inference.sensor_trust import (
    SensorTrustClassifier,
    SensorTrustAnomalyType,
    SensorTrustSeverity,
    SensorTrustResult,
)
from ml.inference.engine import AquaTrustAnomalyInferenceEngine
from ml.inference.schemas import CanonicalReadingInput


@pytest.fixture
def classifier():
    return SensorTrustClassifier()


@pytest.fixture
def inference_engine():
    return AquaTrustAnomalyInferenceEngine()


def test_missing_reading_detection(classifier):
    res = classifier.evaluate(
        current_value=None,
        parameter="ph",
        unit="pH_units",
        timestamp="2026-11-16T12:00:00Z",
        sliding_history=[7.4, 7.5],
    )
    assert res.anomaly_type == SensorTrustAnomalyType.MISSING_READING
    assert res.severity == SensorTrustSeverity.MEDIUM
    assert res.is_sensor_fault is True
    assert res.severity_score == 0.50


def test_sensor_boundary_failure(classifier):
    # pH outside physical 0-14 boundary
    res = classifier.evaluate(
        current_value=16.8,
        parameter="ph",
        unit="pH_units",
        timestamp="2026-11-16T12:05:00Z",
        sliding_history=[7.4, 7.5, 7.6],
    )
    assert res.anomaly_type == SensorTrustAnomalyType.SENSOR_FAILURE
    assert res.severity == SensorTrustSeverity.CRITICAL
    assert res.severity_score >= 0.90
    assert res.is_sensor_fault is True


def test_stuck_sensor_detection(classifier):
    # Frozen constant readings
    res = classifier.evaluate(
        current_value=8.2,
        parameter="ph",
        unit="pH_units",
        timestamp="2026-11-16T12:10:00Z",
        sliding_history=[8.2, 8.2],
    )
    assert res.anomaly_type == SensorTrustAnomalyType.STUCK_SENSOR
    assert res.severity == SensorTrustSeverity.HIGH
    assert res.is_sensor_fault is True
    assert "frozen" in res.reason.lower() or "stuck" in res.reason.lower()


def test_sudden_spike_detection(classifier):
    # Baseline history mean ~ 20.0, std ~ 0.5; sudden jump to 50.0
    history = [19.8, 20.1, 20.2, 19.9, 20.0]
    res = classifier.evaluate(
        current_value=50.0,
        parameter="bod",
        unit="mg/L",
        timestamp="2026-11-16T12:15:00Z",
        sliding_history=history,
    )
    assert res.anomaly_type == SensorTrustAnomalyType.SUDDEN_SPIKE
    assert res.severity in [SensorTrustSeverity.MEDIUM, SensorTrustSeverity.HIGH]
    assert res.severity_score >= 0.40


def test_sensor_drift_detection(classifier):
    # Monotonic steady drift
    history = [10.0, 10.8, 11.6, 12.4]
    res = classifier.evaluate(
        current_value=13.2,
        parameter="bod",
        unit="mg/L",
        timestamp="2026-11-16T12:20:00Z",
        sliding_history=history,
    )
    assert res.anomaly_type == SensorTrustAnomalyType.SENSOR_DRIFT
    assert res.severity == SensorTrustSeverity.MEDIUM
    assert res.is_sensor_fault is True


def test_parameter_inconsistency_cod_less_than_bod(classifier):
    # Chemical impossibility: COD < BOD
    res = classifier.evaluate(
        current_value=40.0,
        parameter="cod",
        unit="mg/L",
        timestamp="2026-11-16T12:25:00Z",
        sliding_history=[40.0, 42.0],
        contemporaneous_readings={"bod": 160.0},
    )
    assert res.anomaly_type == SensorTrustAnomalyType.PARAMETER_INCONSISTENCY
    assert res.severity == SensorTrustSeverity.CRITICAL
    assert res.is_sensor_fault is True
    assert "COD >= BOD" in res.metadata.get("rule", "")


def test_parameter_inconsistency_tkn_less_than_nh4(classifier):
    # Nitrogen balance impossibility: TKN < NH4-N
    res = classifier.evaluate(
        current_value=5.0,
        parameter="tkn",
        unit="mg/L",
        timestamp="2026-11-16T12:30:00Z",
        sliding_history=[5.0, 6.0],
        contemporaneous_readings={"nh4_n": 25.0},
    )
    assert res.anomaly_type == SensorTrustAnomalyType.PARAMETER_INCONSISTENCY
    assert res.severity == SensorTrustSeverity.HIGH
    assert res.is_sensor_fault is True


def test_duplicate_reading_detection(classifier):
    res = classifier.evaluate(
        current_value=7.4,
        parameter="ph",
        unit="pH_units",
        timestamp="2026-11-16T12:35:00Z",
        sliding_history=[7.4],
        is_duplicate=True,
    )
    assert res.anomaly_type == SensorTrustAnomalyType.DUPLICATE_READING
    assert res.severity == SensorTrustSeverity.LOW


def test_normal_reading_evaluation(classifier):
    history = [7.38, 7.42, 7.40, 7.45]
    res = classifier.evaluate(
        current_value=7.41,
        parameter="ph",
        unit="pH_units",
        timestamp="2026-11-16T12:40:00Z",
        sliding_history=history,
    )
    assert res.anomaly_type == SensorTrustAnomalyType.NORMAL
    assert res.severity == SensorTrustSeverity.NORMAL
    assert res.severity_score == 0.0


def test_engine_integration_sensor_trust(inference_engine):
    # Clear stream cache to ensure deterministic state
    stream_key = "FAC_TEST_TRUST:final_effluent:ph"
    inference_engine.reset_stream_cache(stream_key)

    # Ingest 3 nominal readings
    t1 = inference_engine.predict(CanonicalReadingInput(
        facility_id="FAC_TEST_TRUST", timestamp="2026-11-16T01:00:00Z", parameter="ph", value=7.4, unit="pH_units"
    ))
    assert t1.anomaly_status == "insufficient_data"
    assert t1.anomaly_type == "NORMAL"

    t2 = inference_engine.predict(CanonicalReadingInput(
        facility_id="FAC_TEST_TRUST", timestamp="2026-11-16T01:05:00Z", parameter="ph", value=7.5, unit="pH_units"
    ))
    t3 = inference_engine.predict(CanonicalReadingInput(
        facility_id="FAC_TEST_TRUST", timestamp="2026-11-16T01:10:00Z", parameter="ph", value=7.45, unit="pH_units"
    ))
    assert t3.anomaly_status == "normal"
    assert t3.anomaly_type == "NORMAL"
    assert t3.severity == "NORMAL"

    # Now ingest a stuck sensor sequence (same value repeatedly)
    t4 = inference_engine.predict(CanonicalReadingInput(
        facility_id="FAC_TEST_TRUST", timestamp="2026-11-16T01:15:00Z", parameter="ph", value=7.45, unit="pH_units"
    ))
    t5 = inference_engine.predict(CanonicalReadingInput(
        facility_id="FAC_TEST_TRUST", timestamp="2026-11-16T01:20:00Z", parameter="ph", value=7.45, unit="pH_units"
    ))
    assert t5.anomaly_type == "STUCK_SENSOR"
    assert t5.severity == "HIGH"
    assert t5.is_sensor_fault is True
    assert t5.sensor_trust is not None
