"""
AquaTrust AI — Member 2 Runtime Simulator Test Suite (Phases 16–17)
Verifies profile loading, deterministic random seeds, parameter sampling, operating-range enforcement,
temporal/diurnal behavior, AR(1) autocorrelation, cross-parameter constraints, treatment-stage consistency,
the 8 anomaly injection scenarios, CanonicalReading validation, AI inference integration, minimum stream history,
unsupported parameters, missing readings, reproducibility, and ground-truth separation invariants.
"""

import os
import sys
import pytest
from datetime import datetime, timezone
from decimal import Decimal

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, base_dir)

from datasets.canonical.models import (
    CanonicalReading,
    QualityStatus,
    AnomalyStatus,
    ComplianceStatus,
    MeasurementStage,
    CanonicalParameter,
    DataOrigin
)
from ml.inference import AquaTrustAnomalyInferenceEngine
from backend.app.simulator import (
    AquaTrustRuntimeSimulator,
    FacilityStreamConfig,
    ProfileLoader,
    AnomalyInjector
)


def test_profile_loading():
    """Verify ProfileLoader successfully parses all 5 statistical artifacts."""
    loader = ProfileLoader()
    assert loader.distributions is not None
    assert loader.operating_ranges is not None
    assert loader.temporal_profiles is not None
    assert loader.correlation_profiles is not None
    assert loader.anomaly_scenarios is not None

    dist = loader.get_distribution("FAC_UCI_URBAN_ETP_01", "inlet", "bod")
    assert dist is not None
    assert dist["parameter"] == "bod"

    op = loader.get_operating_range("cod")
    assert op is not None
    assert "physical_boundaries" in op

    multipliers = loader.get_diurnal_hourly_multipliers()
    assert len(multipliers) == 24
    print("[TEST PASS] Profile loading verified.")


def test_deterministic_random_seeds():
    """Verify identical random seeds produce identical simulated outputs."""
    config1 = FacilityStreamConfig(random_seed=12345)
    sim1 = AquaTrustRuntimeSimulator(config=config1, enable_ai_inference=False)
    readings1 = sim1.step()

    config2 = FacilityStreamConfig(random_seed=12345)
    sim2 = AquaTrustRuntimeSimulator(config=config2, enable_ai_inference=False)
    readings2 = sim2.step()

    assert len(readings1) == len(readings2)
    for r1, r2 in zip(readings1, readings2):
        assert r1.parameter == r2.parameter
        assert r1.value == r2.value
        assert r1.provenance_id == r2.provenance_id
    print("[TEST PASS] Deterministic random seeds verified.")


def test_parameter_sampling_and_operating_range_enforcement():
    """Verify parameter sampling and non-negative operating range enforcement."""
    sim = AquaTrustRuntimeSimulator(enable_ai_inference=False)
    readings = sim.run_simulation_batch(num_steps=10)

    for r in readings:
        if r.value is not None:
            assert r.value >= Decimal("0.0")
            if r.parameter == CanonicalParameter.PH:
                assert Decimal("0.0") <= r.value <= Decimal("14.0")
    print("[TEST PASS] Parameter sampling & operating range enforcement verified.")


def test_temporal_diurnal_behavior():
    """Verify diurnal load curve affects baseline concentration across hours of day."""
    start_night = datetime(2026, 1, 1, 3, 0, 0, tzinfo=timezone.utc)  # Night minimum (03:00)
    start_peak = datetime(2026, 1, 1, 9, 0, 0, tzinfo=timezone.utc)   # Morning peak (09:00)

    sim_night = AquaTrustRuntimeSimulator(
        config=FacilityStreamConfig(random_seed=42, simulation_start_time=start_night),
        enable_ai_inference=False
    )
    r_night = sim_night.step(parameters=["cod"], stage="inlet")[0]

    sim_peak = AquaTrustRuntimeSimulator(
        config=FacilityStreamConfig(random_seed=42, simulation_start_time=start_peak),
        enable_ai_inference=False
    )
    r_peak = sim_peak.step(parameters=["cod"], stage="inlet")[0]

    assert r_peak.value > r_night.value
    print("[TEST PASS] Temporal diurnal behavior verified.")


def test_autocorrelation_ar1():
    """Verify sequential values exhibit mean-reverting AR(1) behavior."""
    sim = AquaTrustRuntimeSimulator(enable_ai_inference=False)
    readings = sim.run_simulation_batch(num_steps=20, parameters=["ph"])

    ph_vals = [float(r.value) for r in readings if r.parameter == CanonicalParameter.PH]
    deltas = [abs(ph_vals[i] - ph_vals[i - 1]) for i in range(1, len(ph_vals))]
    avg_delta = sum(deltas) / len(deltas)

    # Smooth mean-reverting pH changes should have small step deltas
    assert avg_delta < 0.5
    print("[TEST PASS] AR(1) autocorrelation verified.")


def test_cross_parameter_constraints():
    """Verify stoichiometric coupling (COD >= 1.6*BOD, TN >= TKN >= NH4-N)."""
    sim = AquaTrustRuntimeSimulator(enable_ai_inference=False)
    readings = sim.step(parameters=["bod", "cod", "nh4_n", "tkn", "tn"], stage="inlet")

    r_dict = {r.parameter: float(r.value) for r in readings if r.value is not None}
    assert r_dict[CanonicalParameter.COD] >= (1.59 * r_dict[CanonicalParameter.BOD])
    assert r_dict[CanonicalParameter.TN] >= r_dict[CanonicalParameter.TKN]
    assert r_dict[CanonicalParameter.TKN] >= r_dict[CanonicalParameter.NH4_N]
    print("[TEST PASS] Cross-parameter stoichiometric constraints verified.")


def test_treatment_stage_consistency():
    """Verify effluent concentrations are lower than influent concentrations."""
    sim_inlet = AquaTrustRuntimeSimulator(config=FacilityStreamConfig(random_seed=99), enable_ai_inference=False)
    readings_inlet = sim_inlet.step(parameters=["cod"], stage="inlet")[0]

    sim_effluent = AquaTrustRuntimeSimulator(config=FacilityStreamConfig(random_seed=99), enable_ai_inference=False)
    readings_effluent = sim_effluent.step(parameters=["cod"], stage="final_effluent")[0]

    assert float(readings_effluent.value) < float(readings_inlet.value)
    print("[TEST PASS] Treatment-stage consistency verified.")


def test_all_eight_anomaly_scenarios():
    """Verify all 8 standardized anomaly injection scenarios."""
    scenarios = [
        ("SCENARIO_01_SENSOR_SPIKE", "ph", QualityStatus.VALID, ComplianceStatus.NON_COMPLIANT),
        ("SCENARIO_02_SENSOR_DROP", "cod", QualityStatus.VALID, ComplianceStatus.COMPLIANT),
        ("SCENARIO_03_STUCK_SENSOR", "ph", QualityStatus.SUSPECT, ComplianceStatus.COMPLIANT),
        ("SCENARIO_04_SENSOR_DRIFT", "ph", QualityStatus.VALID, ComplianceStatus.COMPLIANT),
        ("SCENARIO_05_MISSING_READING", "bod", QualityStatus.INSUFFICIENT_DATA, ComplianceStatus.NOT_APPLICABLE),
        ("SCENARIO_06_DUPLICATE_READING", "cod", QualityStatus.INVALID, ComplianceStatus.COMPLIANT),
        ("SCENARIO_07_PARAMETER_INCONSISTENCY", "bod", QualityStatus.INVALID, ComplianceStatus.NON_COMPLIANT),
        ("SCENARIO_08_SUDDEN_PROCESS_CHANGE", "cod", QualityStatus.VALID, ComplianceStatus.NON_COMPLIANT),
    ]

    for scen_id, param, exp_qual, exp_comp in scenarios:
        sim = AquaTrustRuntimeSimulator(enable_ai_inference=False)
        sim.inject_anomaly_scenario(scen_id, stage="final_effluent", param=param)
        readings = sim.step(parameters=[param], stage="final_effluent")

        target_r = [r for r in readings if str(r.parameter).lower() == param.lower()][0]
        assert target_r.metadata["ground_truth"]["is_injected_anomaly"] is True
        assert target_r.metadata["ground_truth"]["scenario_id"] == scen_id
        assert target_r.quality_status == exp_qual
        assert target_r.compliance_status == exp_comp

        if scen_id == "SCENARIO_05_MISSING_READING":
            assert target_r.value is None
        elif scen_id == "SCENARIO_01_SENSOR_SPIKE" and param == "ph":
            assert target_r.value == Decimal("13.50")
        elif scen_id == "SCENARIO_02_SENSOR_DROP":
            assert target_r.value == Decimal("0.00")

    print("[TEST PASS] All 8 anomaly scenarios verified.")


def test_canonical_reading_generation():
    """Verify every emitted payload instantiates as a valid CanonicalReading Pydantic model."""
    sim = AquaTrustRuntimeSimulator(enable_ai_inference=False)
    readings = sim.step()

    for r in readings:
        assert isinstance(r, CanonicalReading)
        assert r.data_origin == DataOrigin.SIMULATED
        assert r.dataset_id == "SIMULATION_MULTI_STP_GRID"
        assert r.timestamp.tzinfo is not None
        assert r.provenance_id.startswith("sim_prov_")
    print("[TEST PASS] Canonical reading generation & Pydantic validation verified.")


def test_ai_inference_integration_and_sliding_window():
    """Verify AI inference integration and 3-step minimum sliding history requirement."""
    ai_engine = AquaTrustAnomalyInferenceEngine()
    sim = AquaTrustRuntimeSimulator(ai_engine=ai_engine, enable_ai_inference=True)

    # Step 1 -> insufficient_data
    r1 = sim.step(parameters=["ph"], stage="final_effluent")[0]
    assert r1.anomaly_status == AnomalyStatus.INSUFFICIENT_DATA
    assert "ai_inference" in r1.metadata
    assert r1.metadata["ai_inference"]["anomaly_score"] is None

    # Step 2 -> insufficient_data
    r2 = sim.step(parameters=["ph"], stage="final_effluent")[0]
    assert r2.anomaly_status == AnomalyStatus.INSUFFICIENT_DATA

    # Step 3 -> normal (sliding window context ready = 3)
    r3 = sim.step(parameters=["ph"], stage="final_effluent")[0]
    assert r3.anomaly_status in [AnomalyStatus.NORMAL, AnomalyStatus.ANOMALOUS]
    assert r3.metadata["ai_inference"]["anomaly_score"] is not None
    print("[TEST PASS] AI inference integration & sliding window verified.")


def test_unsupported_parameters_handling():
    """Verify parameters not supported by AI engine return INSUFFICIENT_DATA gracefully."""
    sim = AquaTrustRuntimeSimulator(enable_ai_inference=True)
    readings = sim.step(parameters=["tn"], stage="final_effluent")

    tn_r = readings[0]
    assert tn_r.parameter == CanonicalParameter.TN
    assert tn_r.anomaly_status == AnomalyStatus.INSUFFICIENT_DATA
    print("[TEST PASS] Unsupported parameters handling verified.")


def test_simulation_reproducibility():
    """Verify full multi-step simulation batch reproducibility."""
    sim1 = AquaTrustRuntimeSimulator(config=FacilityStreamConfig(random_seed=777), enable_ai_inference=False)
    batch1 = sim1.run_simulation_batch(num_steps=15)

    sim2 = AquaTrustRuntimeSimulator(config=FacilityStreamConfig(random_seed=777), enable_ai_inference=False)
    batch2 = sim2.run_simulation_batch(num_steps=15)

    assert len(batch1) == len(batch2)
    for r1, r2 in zip(batch1, batch2):
        assert r1.to_canonical_dict() == r2.to_canonical_dict()
    print("[TEST PASS] Full simulation reproducibility verified.")


def test_separation_ground_truth_from_ai():
    """Verify scenario ground truth is preserved separately from AI inference output."""
    ai_engine = AquaTrustAnomalyInferenceEngine()
    sim = AquaTrustRuntimeSimulator(ai_engine=ai_engine, enable_ai_inference=True)

    # Warm up sliding window with 2 nominal readings
    sim.step(parameters=["ph"], stage="final_effluent")
    sim.step(parameters=["ph"], stage="final_effluent")

    # Inject Extreme Spike
    sim.inject_anomaly_scenario("SCENARIO_01_SENSOR_SPIKE", stage="final_effluent", param="ph")
    r_spike = sim.step(parameters=["ph"], stage="final_effluent")[0]

    # Ground truth states injected anomaly
    gt = r_spike.metadata["ground_truth"]
    assert gt["is_injected_anomaly"] is True
    assert gt["scenario_id"] == "SCENARIO_01_SENSOR_SPIKE"

    # AI result independently scored
    assert r_spike.anomaly_status == AnomalyStatus.ANOMALOUS
    assert r_spike.metadata["ai_inference"]["anomaly_score"] is not None
    assert r_spike.metadata["ai_inference"]["anomaly_score"] < 0.0
    print("[TEST PASS] Ground truth separation from AI result verified.")


if __name__ == "__main__":
    print("================================================================================")
    print("    AquaTrust AI — Member 2 Runtime Simulator Test Suite Execution              ")
    print("================================================================================")
    test_profile_loading()
    test_deterministic_random_seeds()
    test_parameter_sampling_and_operating_range_enforcement()
    test_temporal_diurnal_behavior()
    test_autocorrelation_ar1()
    test_cross_parameter_constraints()
    test_treatment_stage_consistency()
    test_all_eight_anomaly_scenarios()
    test_canonical_reading_generation()
    test_ai_inference_integration_and_sliding_window()
    test_unsupported_parameters_handling()
    test_simulation_reproducibility()
    test_separation_ground_truth_from_ai()
    print("================================================================================")
    print("    ALL MEMBER 2 RUNTIME SIMULATOR TESTS PASSED (13/13) [100% OK]             ")
    print("================================================================================")
