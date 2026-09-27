"""
AquaTrust AI — End-to-End ML Pipeline Verification Test Suite (P0-01)
Verifies the complete flow from canonical wastewater reading through input validation,
feature calculation, standard scaling, Isolation Forest scoring, frozen threshold evaluation,
and version metadata propagation.
"""

import os
import sys
import math
from datetime import datetime, timezone
from decimal import Decimal

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, base_dir)

from datasets.canonical.models import (
    CanonicalReading,
    CanonicalParameter,
    MeasurementStage,
    DataOrigin,
    QualityStatus,
    ComplianceStatus
)
from ml.inference import (
    AquaTrustAnomalyInferenceEngine,
    CanonicalReadingInput,
    AnomalyInferenceOutput,
    StreamContextCache,
    UnsupportedParameterError,
    InvalidReadingError,
    canonicalize_parameter_name
)


def test_01_valid_canonical_reading_ingestion():
    """Verify ingestion of CanonicalReading Pydantic domain models."""
    engine = AquaTrustAnomalyInferenceEngine()
    stream_key = "FAC_UCI_URBAN_ETP_01:final_effluent:ph"
    engine.reset_stream_cache(stream_key)

    reading = CanonicalReading(
        dataset_id="DATASET_01_UCI_WATER_TREATMENT",
        source_record_id="REC_E2E_001",
        facility_id="FAC_UCI_URBAN_ETP_01",
        sensor_id="SENSOR_PH_01",
        timestamp=datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        measurement_stage=MeasurementStage.FINAL_EFFLUENT,
        parameter=CanonicalParameter.PH,
        value=Decimal("7.72"),
        unit="pH_units",
        data_origin=DataOrigin.OBSERVED,
        provenance_id="PROV_E2E_001",
        quality_status=QualityStatus.VALID,
        compliance_status=ComplianceStatus.COMPLIANT
    )

    output = engine.predict(reading)
    assert isinstance(output, AnomalyInferenceOutput)
    assert output.facility_id == "FAC_UCI_URBAN_ETP_01"
    assert output.parameter == "pH"
    assert output.value == 7.72
    assert output.anomaly_status == "insufficient_data"  # Reading 1 of 3
    assert output.quality_status == "valid"
    assert output.model_version == "iforest_v2.2.1"
    assert output.feature_set_version == "v2.2.1"
    print("[TEST PASS] 01: Valid canonical reading ingestion verified.")


def test_02_normal_reading_inference_flow():
    """Verify expected normal readings achieve 'normal' status with s >= 0.0."""
    engine = AquaTrustAnomalyInferenceEngine()
    stream_key = "FAC_UCI_URBAN_ETP_01:final_effluent:cod"
    engine.reset_stream_cache(stream_key)

    # 3 nominal observations in series (historical mean for UCI effluent COD ~ 80-90 mg/L)
    r1 = {"facility_id": "FAC_UCI_URBAN_ETP_01", "timestamp": "2026-01-01T10:00:00Z", "parameter": "COD", "value": 82.0, "unit": "mg/L"}
    r2 = {"facility_id": "FAC_UCI_URBAN_ETP_01", "timestamp": "2026-01-01T10:15:00Z", "parameter": "COD", "value": 85.0, "unit": "mg/L"}
    r3 = {"facility_id": "FAC_UCI_URBAN_ETP_01", "timestamp": "2026-01-01T10:30:00Z", "parameter": "COD", "value": 84.0, "unit": "mg/L"}

    out1 = engine.predict(r1)
    out2 = engine.predict(r2)
    out3 = engine.predict(r3)

    assert out1.anomaly_status == "insufficient_data"
    assert out2.anomaly_status == "insufficient_data"
    assert out3.anomaly_status == "normal"
    assert out3.anomaly_score is not None
    assert out3.anomaly_score >= 0.0
    assert out3.threshold == 0.0
    assert out3.features_used is not None
    assert "value_t" in out3.features_used
    assert "delta_1" in out3.features_used
    assert "rolling_mean_3" in out3.features_used
    assert "rolling_std_3" in out3.features_used
    print("[TEST PASS] 02: Normal reading inference flow verified.")


def test_03_anomalous_reading_inference_flow():
    """Verify known extreme anomaly achieves 'anomalous' status with s < 0.0."""
    engine = AquaTrustAnomalyInferenceEngine()
    stream_key = "FAC_UCI_URBAN_ETP_01:final_effluent:cod"
    engine.reset_stream_cache(stream_key)

    # Warm up with 2 normal readings, then inject 450 mg/L (extreme effluent spike)
    engine.predict({"facility_id": "FAC_UCI_URBAN_ETP_01", "timestamp": "2026-01-01T10:00:00Z", "parameter": "COD", "value": 80.0, "unit": "mg/L"})
    engine.predict({"facility_id": "FAC_UCI_URBAN_ETP_01", "timestamp": "2026-01-01T10:15:00Z", "parameter": "COD", "value": 82.0, "unit": "mg/L"})
    
    anom_out = engine.predict({"facility_id": "FAC_UCI_URBAN_ETP_01", "timestamp": "2026-01-01T10:30:00Z", "parameter": "COD", "value": 450.0, "unit": "mg/L"})

    assert anom_out.anomaly_status == "anomalous"
    assert anom_out.anomaly_score is not None
    assert anom_out.anomaly_score < 0.0
    assert "Anomalous observation detected" in anom_out.explanation
    print("[TEST PASS] 03: Anomalous reading inference flow verified.")


def test_04_correct_model_selection_all_parameters():
    """Verify all 6 supported parameters correctly map to their specific Isolation Forest model."""
    engine = AquaTrustAnomalyInferenceEngine()
    
    supported_params = ["bod", "cod", "tss", "ph", "nh4_n", "tkn"]
    for p in supported_params:
        assert p in engine.models
        model = engine.models[p]
        assert model.__class__.__name__ == "IsolationForest"
        assert model.n_estimators == 200
        assert model.contamination == 0.05
    print("[TEST PASS] 04: Correct model selection for all 6 parameters verified.")


def test_05_frozen_threshold_selection_and_no_recomputation():
    """Verify production inference uses frozen threshold (0.0) without recomputation."""
    engine = AquaTrustAnomalyInferenceEngine()
    stream_key = "STP_THRESH_01:final_effluent:ph"
    engine.reset_stream_cache(stream_key)

    # Run predictions and verify threshold is strictly constant 0.0
    engine.predict({"facility_id": "STP_THRESH_01", "timestamp": "2026-01-01T10:00:00Z", "parameter": "pH", "value": 7.5, "unit": "pH_units"})
    engine.predict({"facility_id": "STP_THRESH_01", "timestamp": "2026-01-01T10:05:00Z", "parameter": "pH", "value": 7.5, "unit": "pH_units"})
    res = engine.predict({"facility_id": "STP_THRESH_01", "timestamp": "2026-01-01T10:10:00Z", "parameter": "pH", "value": 7.5, "unit": "pH_units"})

    assert res.threshold == 0.0
    assert engine.metadata["thresholds"]["parameter_thresholds"]["ph"]["threshold"] == 0.0
    print("[TEST PASS] 05: Frozen threshold selection and zero recomputation verified.")


def test_06_model_and_feature_version_propagation():
    """Verify model_version and feature_set_version are propagated to output."""
    engine = AquaTrustAnomalyInferenceEngine()
    res = engine.predict({
        "facility_id": "STP_VER_01",
        "timestamp": "2026-01-01T10:00:00Z",
        "parameter": "BOD",
        "value": 25.0,
        "unit": "mg/L"
    })
    assert res.model_version == "iforest_v2.2.1"
    assert res.feature_set_version == "v2.2.1"
    print("[TEST PASS] 06: Model and feature version propagation verified.")


def test_07_malformed_input_rejection():
    """Verify malformed input (non-numeric, invalid type) raises InvalidReadingError."""
    engine = AquaTrustAnomalyInferenceEngine()

    # Case A: String for value
    try:
        engine.predict({
            "facility_id": "STP_001",
            "timestamp": "2026-01-01T10:00:00Z",
            "parameter": "COD",
            "value": "corrupted_sensor_text",
            "unit": "mg/L"
        })
        assert False, "Expected InvalidReadingError for string value"
    except InvalidReadingError:
        pass

    # Case B: Completely invalid non-dict, non-model type
    try:
        engine.predict(12345)
        assert False, "Expected InvalidReadingError for integer payload"
    except InvalidReadingError:
        pass

    print("[TEST PASS] 07: Malformed input rejection verified.")


def test_08_unsupported_parameter_handling():
    """Verify requesting inference on unmodeled parameters raises UnsupportedParameterError."""
    engine = AquaTrustAnomalyInferenceEngine()

    # Unavailable parameters (TN, NOX-N)
    for unavail_param in ["TN", "Total_Nitrogen", "NOX-N", "nitrate_nitrite"]:
        try:
            engine.predict({
                "facility_id": "STP_001",
                "timestamp": "2026-01-01T10:00:00Z",
                "parameter": unavail_param,
                "value": 15.0,
                "unit": "mg/L"
            })
            assert False, f"Expected UnsupportedParameterError for {unavail_param}"
        except UnsupportedParameterError as e:
            assert e.parameter in ["tn", "nox_n"]

    # Unknown parameter
    try:
        engine.predict({
            "facility_id": "STP_001",
            "timestamp": "2026-01-01T10:00:00Z",
            "parameter": "MICROPLASTICS",
            "value": 100.0,
            "unit": "particles/L"
        })
        assert False, "Expected UnsupportedParameterError for unknown parameter"
    except UnsupportedParameterError:
        pass

    print("[TEST PASS] 08: Unsupported parameter handling verified.")


def test_09_missing_required_field_rejection():
    """Verify payloads with missing required fields raise InvalidReadingError."""
    engine = AquaTrustAnomalyInferenceEngine()

    # Missing facility_id
    try:
        engine.predict({
            "timestamp": "2026-01-01T10:00:00Z",
            "parameter": "COD",
            "value": 50.0,
            "unit": "mg/L"
        })
        assert False, "Expected InvalidReadingError for missing facility_id"
    except InvalidReadingError:
        pass

    # Missing unit
    try:
        engine.predict({
            "facility_id": "STP_001",
            "timestamp": "2026-01-01T10:00:00Z",
            "parameter": "COD",
            "value": 50.0
        })
        assert False, "Expected InvalidReadingError for missing unit"
    except InvalidReadingError:
        pass

    # Missing value
    try:
        engine.predict({
            "facility_id": "STP_001",
            "timestamp": "2026-01-01T10:00:00Z",
            "parameter": "COD",
            "unit": "mg/L"
        })
        assert False, "Expected InvalidReadingError for missing value"
    except InvalidReadingError:
        pass

    print("[TEST PASS] 09: Missing required field rejection verified.")


def test_10_deterministic_feature_ordering():
    """Verify feature ordering in feature_config.yaml matches scaled vector order."""
    engine = AquaTrustAnomalyInferenceEngine()
    expected_order = [
        "value_t_scaled",
        "delta_1_scaled",
        "rolling_mean_3_scaled",
        "rolling_std_3_scaled"
    ]
    assert engine.feature_config["feature_ordering"] == expected_order
    print("[TEST PASS] 10: Deterministic feature ordering verified.")


def test_11_no_training_code_executed_during_inference():
    """Verify model instances remain in fitted state with zero refitting side effects."""
    engine = AquaTrustAnomalyInferenceEngine()
    
    # Check model object identity and estimator counts before and after inference
    model_cod_before = engine.models["cod"]
    n_estimators_before = len(model_cod_before.estimators_)
    
    # Run multiple inferences
    for v in [80.0, 82.0, 85.0, 450.0, 81.0]:
        engine.predict({"facility_id": "STP_TEST", "timestamp": "2026-01-01T10:00:00Z", "parameter": "COD", "value": v, "unit": "mg/L"})

    model_cod_after = engine.models["cod"]
    assert model_cod_before is model_cod_after
    assert len(model_cod_after.estimators_) == n_estimators_before == 200
    print("[TEST PASS] 11: Zero training execution verified.")


if __name__ == "__main__":
    print("================================================================================")
    print("   AquaTrust AI — P0-01: End-to-End ML Pipeline Verification Test Suite         ")
    print("================================================================================")
    test_01_valid_canonical_reading_ingestion()
    test_02_normal_reading_inference_flow()
    test_03_anomalous_reading_inference_flow()
    test_04_correct_model_selection_all_parameters()
    test_05_frozen_threshold_selection_and_no_recomputation()
    test_06_model_and_feature_version_propagation()
    test_07_malformed_input_rejection()
    test_08_unsupported_parameter_handling()
    test_09_missing_required_field_rejection()
    test_10_deterministic_feature_ordering()
    test_11_no_training_code_executed_during_inference()
    print("================================================================================")
    print("   ALL P0-01 END-TO-END ML PIPELINE TESTS PASSED (11/11) [100% OK]             ")
    print("================================================================================")
