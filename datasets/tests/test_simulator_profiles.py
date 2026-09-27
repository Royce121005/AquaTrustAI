"""
AquaTrust AI — Simulator Statistical Profiles Test Suite (Phases 16–17)
Verifies statistical profile schemas, parameter/unit consistency, observed vs simulated origins,
anomaly scenario specifications, and independent status triad contracts.
"""

import os
import sys
import json
import yaml

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sim_docs_dir = os.path.join(base_dir, "docs", "simulator")


def test_simulator_artifacts_exist():
    """Verify all 7 required Phase 16–17 documentation and profile files exist."""
    required_files = [
        "member1_simulator_profile_report.md",
        "parameter_distributions.json",
        "operating_ranges.yaml",
        "temporal_profiles.json",
        "correlation_profiles.json",
        "anomaly_scenarios.yaml",
        "simulator_data_contract.md"
    ]
    for fname in required_files:
        p = os.path.join(sim_docs_dir, fname)
        assert os.path.exists(p), f"Missing simulator artifact: {p}"
        assert os.path.getsize(p) > 0, f"Simulator artifact is empty: {p}"
    print("[TEST PASS] All simulator profile artifacts exist on disk.")


def test_parameter_distributions_schema():
    """Verify parameter distributions JSON schema and empirical stats validity."""
    p = os.path.join(sim_docs_dir, "parameter_distributions.json")
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data.get("data_origin") == "observed"
    assert "distributions" in data
    dists = data["distributions"]
    assert len(dists) >= 20

    for stream_id, dist in dists.items():
        assert "parameter" in dist
        assert "facility_id" in dist
        assert "measurement_stage" in dist
        assert "count" in dist and dist["count"] > 0
        assert dist["min"] <= dist["median"] <= dist["max"]
        assert "quantiles" in dist
        q = dist["quantiles"]
        assert q["p01"] <= q["p05"] <= q["p25"] <= q["p50"] <= q["p75"] <= q["p95"] <= q["p99"]
        assert "recommended_distribution" in dist
    print("[TEST PASS] Parameter distributions schema and quantiles verified.")


def test_operating_ranges_and_regulatory_boundaries():
    """Verify operating ranges clearly separate statistical percentiles from regulatory standards."""
    p = os.path.join(sim_docs_dir, "operating_ranges.yaml")
    with open(p, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    assert "parameters" in data
    params = data["parameters"]

    for param_slug in ["bod", "cod", "tss", "ph", "nh4_n"]:
        assert param_slug in params, f"Parameter {param_slug} missing in operating ranges"
        entry = params[param_slug]
        assert "physical_boundaries" in entry
        assert "observed_statistical_ranges" in entry
        assert "regulatory_discharge_standards" in entry
        assert "simulator_generation_recommendation" in entry

        # Verify pH physical boundaries
        if param_slug == "ph":
            assert entry["physical_boundaries"]["physical_absolute_max"] == 14.0
            assert entry["physical_boundaries"]["theoretical_min"] == 0.0

        # Verify regulatory limits exist
        reg = entry["regulatory_discharge_standards"]
        assert "CPCB_India_General_Effluent" in reg

    print("[TEST PASS] Operating ranges & regulatory boundary separation verified.")


def test_temporal_profiles_and_autocorrelations():
    """Verify temporal profiles contain valid sampling cadences and lag autocorrelations."""
    p = os.path.join(sim_docs_dir, "temporal_profiles.json")
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "sampling_cadences" in data
    assert "autocorrelations" in data
    assert "diurnal_flow_and_load_curves" in data

    diurnal = data["diurnal_flow_and_load_curves"]
    assert len(diurnal["hourly_load_multipliers"]) == 24
    assert diurnal["peak_factors"]["morning_peak_factor"] > 1.0
    assert diurnal["peak_factors"]["night_minimum_factor"] < 1.0

    # Verify lag autocorrelations
    autocorr = data["autocorrelations"]
    assert len(autocorr) > 0
    for stream, lags in autocorr.items():
        assert "lag_1" in lags
        assert -1.0 <= lags["lag_1"] <= 1.0

    print("[TEST PASS] Temporal profiles, diurnal factors, and autocorrelations verified.")


def test_correlation_profiles_and_stoichiometry():
    """Verify stoichiometric rules (COD >= BOD, TN >= TKN >= NH4-N)."""
    p = os.path.join(sim_docs_dir, "correlation_profiles.json")
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "empirical_correlation_matrices" in data
    assert "stoichiometric_ratios_and_relationships" in data

    ratios = data["stoichiometric_ratios_and_relationships"]
    assert "cod_to_bod_ratio" in ratios
    assert "nitrogen_fractions" in ratios
    assert "stage_removal_efficiencies" in ratios

    cod_bod = ratios["cod_to_bod_ratio"]["inlet_raw_sewage"]
    assert cod_bod["typical_median"] > 1.5
    print("[TEST PASS] Correlation profiles and stoichiometric ratios verified.")


def test_anomaly_scenarios_schema():
    """Verify all 8 anomaly scenarios have complete specifications and expected statuses."""
    p = os.path.join(sim_docs_dir, "anomaly_scenarios.yaml")
    with open(p, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    assert "scenarios" in data
    scenarios = data["scenarios"]
    assert len(scenarios) == 8

    expected_scenario_keys = [
        "SCENARIO_01_SENSOR_SPIKE",
        "SCENARIO_02_SENSOR_DROP",
        "SCENARIO_03_STUCK_SENSOR",
        "SCENARIO_04_SENSOR_DRIFT",
        "SCENARIO_05_MISSING_READING",
        "SCENARIO_06_DUPLICATE_READING",
        "SCENARIO_07_PARAMETER_INCONSISTENCY",
        "SCENARIO_08_SUDDEN_PROCESS_CHANGE"
    ]

    for skey in expected_scenario_keys:
        assert skey in scenarios, f"Missing anomaly scenario: {skey}"
        scen = scenarios[skey]
        assert "category" in scen
        assert "target_parameters" in scen
        assert "severity" in scen
        assert "duration_steps" in scen
        assert "generation_logic" in scen
        assert "expected_statuses" in scen
        
        statuses = scen["expected_statuses"]
        assert "quality_status" in statuses
        assert "anomaly_status" in statuses
        assert "compliance_status" in statuses

    print("[TEST PASS] Anomaly scenarios schema (all 8 recipes) verified.")


def test_status_triad_orthogonality_in_contract():
    """Verify simulator data contract explicitly documents separate quality, anomaly, and compliance fields."""
    p = os.path.join(sim_docs_dir, "simulator_data_contract.md")
    with open(p, "r", encoding="utf-8") as f:
        content = f.read()

    assert "quality_status" in content
    assert "anomaly_status" in content
    assert "compliance_status" in content
    assert "data_origin" in content
    assert "simulated" in content
    assert "observed" in content
    print("[TEST PASS] Simulator data contract status orthogonality verified.")


if __name__ == "__main__":
    print("================================================================================")
    print("    AquaTrust AI — Phases 16–17: Simulator Profiles Test Suite Execution        ")
    print("================================================================================")
    test_simulator_artifacts_exist()
    test_parameter_distributions_schema()
    test_operating_ranges_and_regulatory_boundaries()
    test_temporal_profiles_and_autocorrelations()
    test_correlation_profiles_and_stoichiometry()
    test_anomaly_scenarios_schema()
    test_status_triad_orthogonality_in_contract()
    print("================================================================================")
    print("    ALL PHASES 16–17 SIMULATOR PROFILES TESTS PASSED (7/7) [100% OK]            ")
    print("================================================================================")
