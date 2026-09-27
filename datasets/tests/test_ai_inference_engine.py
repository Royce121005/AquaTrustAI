"""
AquaTrust AI — AI Inference Engine Test Suite (Phase 15)
Verifies contract adherence, sliding window context caching, zero-imputation policy,
isolation forest predictions, unsupported parameter behavior, and status separation invariants.
"""

import os
import sys
import math

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, base_dir)

from ml.inference import (
    AquaTrustAnomalyInferenceEngine,
    CanonicalReadingInput,
    AnomalyInferenceOutput,
    StreamContextCache,
    UnsupportedParameterError,
    InvalidReadingError,
    canonicalize_parameter_name
)


def test_engine_initialization_and_metadata():
    """Verify engine loads packaged models, scalers, and metadata properly."""
    engine = AquaTrustAnomalyInferenceEngine()
    assert engine is not None
    assert engine.model_version == "iforest_v2.2.1"
    assert engine.feature_set_version == "v2.2.1"

    supported = engine.get_supported_parameters()
    assert set(supported) == {"bod", "cod", "tss", "ph", "nh4_n", "tkn"}

    unavailable = engine.get_unavailable_parameters()
    assert "tn" in unavailable
    assert "nox_n" in unavailable
    print("[TEST PASS] Engine initialization and metadata verified.")


def test_canonicalize_parameter_names():
    """Verify parameter aliases map to canonical lowercase slugs."""
    assert canonicalize_parameter_name("pH") == "ph"
    assert canonicalize_parameter_name("COD") == "cod"
    assert canonicalize_parameter_name("BOD5") == "bod"
    assert canonicalize_parameter_name("NH4-N") == "nh4_n"
    assert canonicalize_parameter_name("Ammonia") == "nh4_n"
    assert canonicalize_parameter_name("Total_Kjeldahl_Nitrogen") == "tkn"
    assert canonicalize_parameter_name("Total_Nitrogen") == "tn"
    print("[TEST PASS] Parameter canonicalization verified.")


def test_stream_context_cache_sliding_window():
    """Verify StreamContextCache window updates and feature computation."""
    cache = StreamContextCache(max_history_size=10, min_history_required=3)
    stream_key = "STP_TEST:final_effluent:ph"

    # Reading 1
    ready, feats = cache.update(stream_key, "2026-01-01T10:00:00Z", 7.2)
    assert not ready
    assert feats is None
    assert cache.get_history_length(stream_key) == 1

    # Reading 2
    ready, feats = cache.update(stream_key, "2026-01-01T10:05:00Z", 7.4)
    assert not ready
    assert feats is None
    assert cache.get_history_length(stream_key) == 2

    # Reading 3
    ready, feats = cache.update(stream_key, "2026-01-01T10:10:00Z", 7.6)
    assert ready
    assert feats is not None
    assert feats["value_t"] == 7.6
    assert abs(feats["delta_1"] - 0.2) < 1e-4
    assert abs(feats["rolling_mean_3"] - 7.4) < 1e-4
    assert abs(feats["rolling_std_3"] - 0.2) < 1e-4
    print("[TEST PASS] Stream context cache sliding window verified.")


def test_insufficient_data_protocol_zero_imputation():
    """Verify that readings 1 and 2 return insufficient_data with null scores."""
    engine = AquaTrustAnomalyInferenceEngine()
    stream_key = "STP_NEW_FACILITY:inlet:cod"
    engine.reset_stream_cache(stream_key)

    res1 = engine.predict({
        "facility_id": "STP_NEW_FACILITY",
        "timestamp": "2026-01-01T10:00:00Z",
        "parameter": "COD",
        "value": 250.0,
        "unit": "mg/L",
        "measurement_stage": "inlet"
    })
    assert res1.anomaly_status == "insufficient_data"
    assert res1.anomaly_score is None
    assert res1.features_used is None

    res2 = engine.predict({
        "facility_id": "STP_NEW_FACILITY",
        "timestamp": "2026-01-01T10:05:00Z",
        "parameter": "COD",
        "value": 255.0,
        "unit": "mg/L",
        "measurement_stage": "inlet"
    })
    assert res2.anomaly_status == "insufficient_data"
    assert res2.anomaly_score is None
    print("[TEST PASS] Insufficient data protocol (zero-imputation) verified.")


def test_normal_reading_inference():
    """Verify nominal readings are classified as normal with positive decision scores."""
    engine = AquaTrustAnomalyInferenceEngine()
    stream_key = "STP_NORMAL_01:final_effluent:ph"
    engine.reset_stream_cache(stream_key)

    readings = [
        {"facility_id": "STP_NORMAL_01", "timestamp": "2026-01-01T10:00:00Z", "parameter": "pH", "value": 7.7, "unit": "pH_units"},
        {"facility_id": "STP_NORMAL_01", "timestamp": "2026-01-01T10:05:00Z", "parameter": "pH", "value": 7.75, "unit": "pH_units"},
        {"facility_id": "STP_NORMAL_01", "timestamp": "2026-01-01T10:10:00Z", "parameter": "pH", "value": 7.72, "unit": "pH_units"},
    ]

    outputs = engine.predict_batch(readings)
    assert outputs[0].anomaly_status == "insufficient_data"
    assert outputs[1].anomaly_status == "insufficient_data"
    assert outputs[2].anomaly_status == "normal"
    assert outputs[2].anomaly_score is not None
    assert outputs[2].anomaly_score >= 0.0
    assert outputs[2].inference_latency_ms is not None
    assert outputs[2].inference_latency_ms > 0
    print("[TEST PASS] Normal reading inference verified.")


def test_anomalous_reading_inference_extreme_ph():
    """Verify extreme pH anomaly yields negative score and anomalous status."""
    engine = AquaTrustAnomalyInferenceEngine()
    stream_key = "STP_ANOM_01:final_effluent:ph"
    engine.reset_stream_cache(stream_key)

    readings = [
        {"facility_id": "STP_ANOM_01", "timestamp": "2026-01-01T10:00:00Z", "parameter": "pH", "value": 7.6, "unit": "pH_units"},
        {"facility_id": "STP_ANOM_01", "timestamp": "2026-01-01T10:05:00Z", "parameter": "pH", "value": 7.7, "unit": "pH_units"},
        {"facility_id": "STP_ANOM_01", "timestamp": "2026-01-01T10:10:00Z", "parameter": "pH", "value": 13.8, "unit": "pH_units"},
    ]

    outputs = engine.predict_batch(readings)
    anom_res = outputs[2]
    assert anom_res.anomaly_status == "anomalous"
    assert anom_res.anomaly_score is not None
    assert anom_res.anomaly_score < 0.0
    assert "Anomalous observation detected" in anom_res.explanation
    print("[TEST PASS] Extreme pH anomaly inference verified.")


def test_anomalous_reading_inference_sudden_surge():
    """Verify sudden surge in COD is detected as an anomaly."""
    engine = AquaTrustAnomalyInferenceEngine()
    stream_key = "STP_SURGE_01:final_effluent:cod"
    engine.reset_stream_cache(stream_key)

    readings = [
        {"facility_id": "STP_SURGE_01", "timestamp": "2026-01-01T10:00:00Z", "parameter": "COD", "value": 60.0, "unit": "mg/L"},
        {"facility_id": "STP_SURGE_01", "timestamp": "2026-01-01T10:05:00Z", "parameter": "COD", "value": 62.0, "unit": "mg/L"},
        {"facility_id": "STP_SURGE_01", "timestamp": "2026-01-01T10:10:00Z", "parameter": "COD", "value": 550.0, "unit": "mg/L"},
    ]

    outputs = engine.predict_batch(readings)
    surge_res = outputs[2]
    assert surge_res.anomaly_status == "anomalous"
    assert surge_res.anomaly_score < 0.0
    print("[TEST PASS] Sudden surge anomaly inference verified.")


def test_status_separation_invariant():
    """Verify quality_status and compliance_status are preserved untouched by the AI engine."""
    engine = AquaTrustAnomalyInferenceEngine()
    stream_key = "STP_STATUS_01:final_effluent:tss"
    engine.reset_stream_cache(stream_key)

    # Feed 2 warm-up readings
    engine.predict({"facility_id": "STP_STATUS_01", "timestamp": "2026-01-01T10:00:00Z", "parameter": "TSS", "value": 20.0, "unit": "mg/L"})
    engine.predict({"facility_id": "STP_STATUS_01", "timestamp": "2026-01-01T10:05:00Z", "parameter": "TSS", "value": 22.0, "unit": "mg/L"})

    # Reading with explicit upstream quality and compliance statuses
    res = engine.predict({
        "facility_id": "STP_STATUS_01",
        "timestamp": "2026-01-01T10:10:00Z",
        "parameter": "TSS",
        "value": 21.0,
        "unit": "mg/L",
        "quality_status": "valid",
        "compliance_status": "compliant"
    })

    assert res.quality_status == "valid"
    assert res.compliance_status == "compliant"
    assert res.anomaly_status == "normal"
    print("[TEST PASS] Status separation invariant verified.")


def test_unsupported_parameters_raise_error():
    """Verify requesting inference on unmodeled/unavailable parameters raises UnsupportedParameterError."""
    engine = AquaTrustAnomalyInferenceEngine()

    # Total Nitrogen (unavailable)
    try:
        engine.predict({
            "facility_id": "STP_001",
            "timestamp": "2026-01-01T10:00:00Z",
            "parameter": "TN",
            "value": 15.0,
            "unit": "mg/L"
        })
        assert False, "Expected UnsupportedParameterError for TN"
    except UnsupportedParameterError as e:
        assert e.parameter == "tn"

    # Nitrate/Nitrite (unavailable)
    try:
        engine.predict({
            "facility_id": "STP_001",
            "timestamp": "2026-01-01T10:00:00Z",
            "parameter": "NOX-N",
            "value": 10.0,
            "unit": "mg/L"
        })
        assert False, "Expected UnsupportedParameterError for NOX-N"
    except UnsupportedParameterError as e:
        assert e.parameter == "nox_n"

    # Unknown parameter
    try:
        engine.predict({
            "facility_id": "STP_001",
            "timestamp": "2026-01-01T10:00:00Z",
            "parameter": "UNKNOWN_POLLUTANT",
            "value": 99.0,
            "unit": "mg/L"
        })
        assert False, "Expected UnsupportedParameterError for UNKNOWN_POLLUTANT"
    except UnsupportedParameterError as e:
        assert e.parameter == "unknown_pollutant"

    print("[TEST PASS] Unsupported parameter handling verified.")


def test_invalid_input_payload():
    """Verify malformed input dictionaries raise InvalidReadingError."""
    engine = AquaTrustAnomalyInferenceEngine()
    try:
        engine.predict({
            "facility_id": "STP_001",
            "timestamp": "2026-01-01T10:00:00Z",
            "parameter": "COD",
            "value": "not_a_number",  # Invalid string value
            "unit": "mg/L"
        })
        assert False, "Expected InvalidReadingError for invalid value"
    except InvalidReadingError:
        pass

    print("[TEST PASS] Invalid input payload handling verified.")


if __name__ == "__main__":
    print("================================================================================")
    print("       AquaTrust AI — Phase 15: AI Inference Engine Test Suite Execution        ")
    print("================================================================================")
    test_engine_initialization_and_metadata()
    test_canonicalize_parameter_names()
    test_stream_context_cache_sliding_window()
    test_insufficient_data_protocol_zero_imputation()
    test_normal_reading_inference()
    test_anomalous_reading_inference_extreme_ph()
    test_anomalous_reading_inference_sudden_surge()
    test_status_separation_invariant()
    test_unsupported_parameters_raise_error()
    test_invalid_input_payload()
    print("================================================================================")
    print("       ALL PHASE 15 AI INFERENCE ENGINE TESTS PASSED (10/10) [100% OK]          ")
    print("================================================================================")
