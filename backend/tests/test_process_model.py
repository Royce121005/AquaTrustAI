"""AquaTrust AI — Treatment Process Model Unit Tests.

Verifies:
1. Multi-stage mass balances and removal kinetics
2. Stoichiometric coupling (COD >= 2 * BOD)
3. Dissolved oxygen (DO) inhibition and kinetic degradation
4. Temperature dependence of biological constants
5. Nitrification ammonia removal and pH buffering
6. Missing required inputs handling (insufficient_data)
7. Numerical stability, zero-division safeguards, and physical boundaries
8. Deterministic SHA-256 configuration hashing
"""

import pytest
import math
from app.digital_twin.process_model import ProcessModelEngine


def test_process_model_nominal_reference_case():
    """Verify nominal reference case across all 5 configured stages."""
    engine = ProcessModelEngine()

    influent = {
        "bod": 200.0,
        "cod": 450.0,
        "tss": 240.0,
        "ph": 7.5,
        "nh4_n": 35.0,
    }
    status, result = engine.evaluate_stages(influent)

    assert status == "ready"
    assert "stages" in result
    stages = result["stages"]
    assert "inlet" in stages
    assert "primary_clarifier" in stages
    assert "biological_aeration" in stages
    assert "secondary_clarifier" in stages
    assert "final_effluent" in stages

    # Check progression: BOD decreases through stages
    in_bod = stages["inlet"]["parameters"]["bod"]
    prim_bod = stages["primary_clarifier"]["parameters"]["bod"]
    bio_bod = stages["biological_aeration"]["parameters"]["bod"]
    eff_bod = stages["final_effluent"]["parameters"]["bod"]

    assert in_bod > prim_bod > bio_bod
    assert eff_bod < 30.0  # Effluent compliant with standard discharge

    # Check TSS removal
    in_tss = stages["inlet"]["parameters"]["tss"]
    prim_tss = stages["primary_clarifier"]["parameters"]["tss"]
    eff_tss = stages["final_effluent"]["parameters"]["tss"]

    assert prim_tss < in_tss
    assert eff_tss < 30.0


def test_stoichiometric_cod_bod_coupling():
    """Verify that modeled COD always obeys COD >= 2.0 * BOD refractory boundary."""
    engine = ProcessModelEngine()
    influent = {"bod": 150.0, "cod": 320.0, "tss": 180.0, "ph": 7.3, "nh4_n": 25.0}

    status, result = engine.evaluate_stages(influent)
    assert status == "ready"
    eff_params = result["final_effluent_estimates"]

    assert eff_params["cod"] >= eff_params["bod"] * 2.0


def test_dissolved_oxygen_inhibition_effect():
    """Verify that severe DO deficit (e.g. blower failure) impairs biological degradation and nitrification."""
    engine = ProcessModelEngine()
    influent = {"bod": 200.0, "cod": 450.0, "tss": 240.0, "ph": 7.5, "nh4_n": 35.0}

    # Nominal aeration: DO = 2.0 mg/L
    _, res_nominal = engine.evaluate_stages(influent, operating_variables={"do_mg_l": 2.0})
    eff_nom = res_nominal["final_effluent_estimates"]

    # Aeration deficit: DO = 0.2 mg/L
    _, res_low_do = engine.evaluate_stages(influent, operating_variables={"do_mg_l": 0.2})
    eff_low_do = res_low_do["final_effluent_estimates"]

    # Lower DO must produce higher effluent BOD (reduced removal efficiency)
    assert eff_low_do["bod"] > eff_nom["bod"]
    # Lower DO must severely inhibit nitrification (much higher effluent NH4-N)
    assert eff_low_do["nh4_n"] > eff_nom["nh4_n"]


def test_temperature_kinetics():
    """Verify that biological removal rates increase at warmer temperatures per Arrhenius kinetics."""
    engine = ProcessModelEngine()
    influent = {"bod": 200.0, "cod": 450.0, "tss": 240.0, "ph": 7.5, "nh4_n": 35.0}

    # Cold winter: 10°C
    _, res_cold = engine.evaluate_stages(influent, operating_variables={"temperature_c": 10.0})
    eff_cold = res_cold["final_effluent_estimates"]

    # Warm summer: 28°C
    _, res_warm = engine.evaluate_stages(influent, operating_variables={"temperature_c": 28.0})
    eff_warm = res_warm["final_effluent_estimates"]

    # Warmer temperature yields better kinetic degradation (lower effluent BOD)
    assert eff_warm["bod"] < eff_cold["bod"]


def test_missing_required_inputs_insufficient_data():
    """Verify that omitting mandatory influent parameters returns explicit 'insufficient_data' status."""
    engine = ProcessModelEngine()

    # Missing TSS
    partial_influent = {"bod": 180.0, "cod": 400.0, "ph": 7.4}
    status, result = engine.evaluate_stages(partial_influent)

    assert status == "insufficient_data"
    assert "missing_parameters" in result
    assert "tss" in result["missing_parameters"]


def test_numerical_stability_and_zero_division():
    """Verify model remains stable under extreme boundary cases (DO=0, HRT near zero, extreme pH)."""
    engine = ProcessModelEngine()

    extreme_influent = {
        "bod": 1000.0,
        "cod": 2500.0,
        "tss": 1500.0,
        "ph": 13.5,
        "nh4_n": 100.0,
    }
    status, result = engine.evaluate_stages(
        extreme_influent,
        operating_variables={"do_mg_l": 0.0, "hrt_hours": 0.5, "temperature_c": 5.0},
    )

    assert status == "ready"
    eff = result["final_effluent_estimates"]

    # All concentrations non-negative
    for p, val in eff.items():
        assert val is not None
        assert not math.isnan(val)
        assert not math.isinf(val)
        if p == "ph":
            assert 0.0 <= val <= 14.0
        else:
            assert val >= 0.0


def test_configuration_hash_provenance():
    """Verify that configuration hash is deterministic and changes upon parameter modification."""
    engine1 = ProcessModelEngine()
    hash1 = engine1.configuration_hash

    engine2 = ProcessModelEngine()
    hash2 = engine2.configuration_hash

    # Exact same parameters -> identical hash
    assert hash1 == hash2
    assert len(hash1) == 64  # Valid SHA-256 hex string

    # Mutated parameter -> distinct hash
    engine_custom = ProcessModelEngine(parameters={"k_bod_20": 0.50})
    assert engine_custom.configuration_hash != hash1
