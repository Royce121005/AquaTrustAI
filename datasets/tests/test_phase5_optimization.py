"""
AquaTrust AI — Phase 5 Sustainability & Resource Optimization Unit & Integration Tests
Tests blower power reduction, coagulant dosing optimization, circular water accounting,
and Scope 2 carbon offset calculations.
"""

import pytest
import os
import sys

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from ml.optimization import (
    AquaTrustResourceOptimizer,
    ResourceOptimizationInput,
    ResourceOptimizationOutput,
)


@pytest.fixture
def optimizer():
    return AquaTrustResourceOptimizer()


def test_optimizer_initialization(optimizer):
    assert optimizer is not None


def test_nominal_resource_optimization(optimizer):
    inp = ResourceOptimizationInput(
        facility_id="FAC_BHARWARA_40MLD",
        timestamp="2026-11-16T12:00:00Z",
        inflow_rate_m3_day=40000.0,
        inlet_bod=190.0,
        inlet_cod=380.0,
        inlet_tss=200.0,
        reused_flow_rate_m3_day=12000.0,
    )
    res = optimizer.optimize(inp)

    assert isinstance(res, ResourceOptimizationOutput)
    assert res.facility_id == "FAC_BHARWARA_40MLD"

    # Aeration checks
    aer = res.aeration_optimization
    assert aer.optimized_power_kw < aer.current_power_kw
    assert aer.daily_energy_saved_kwh > 0.0
    assert aer.daily_cost_saved_inr > 0.0
    assert aer.energy_efficiency_score >= 70.0
    assert aer.optimal_do_setpoint_mg_l in [1.8, 2.0, 2.5]

    # Chemical checks
    chem = res.chemical_optimization
    assert chem.optimal_dosing_mg_l < chem.current_dosing_mg_l
    assert chem.optimal_dosing_l_hr < chem.current_dosing_l_hr
    assert chem.daily_chemical_saved_kg > 0.0
    assert chem.daily_cost_saved_inr > 0.0

    # Total savings check
    assert res.total_daily_savings_inr == round(aer.daily_cost_saved_inr + chem.daily_cost_saved_inr, 2)


def test_sustainability_kpi_accounting(optimizer):
    # 5 MLD plant with 2 MLD non-potable reuse (40% circularity)
    inp = ResourceOptimizationInput(
        facility_id="FAC_DINAPUR_5MLD",
        timestamp="2026-11-16T12:00:00Z",
        inflow_rate_m3_day=5000.0,
        inlet_bod=160.0,
        inlet_cod=320.0,
        inlet_tss=180.0,
        effluent_bod=15.0,
        effluent_cod=70.0,
        effluent_tss=18.0,
        reused_flow_rate_m3_day=2000.0,
    )
    res = optimizer.optimize(inp)
    kpis = res.sustainability_kpis

    # Water Stewardship
    assert kpis.water_treated_kl_day == 5000.0
    assert kpis.treated_water_reused_kl_day == 2000.0
    assert kpis.freshwater_saved_kl_day == 2000.0  # Exact 1:1 displacement
    assert kpis.water_circularity_ratio_pct == 40.0

    # Carbon & Energy
    assert kpis.carbon_emissions_avoided_kg_co2_day > 0.0
    assert 0.01 <= kpis.specific_energy_consumption_kwh_m3 <= 1.0

    # Pollution Abatement
    assert kpis.pollution_load_abated_bod_kg_day == (160.0 - 15.0) * 5000.0 * 1e-3
    assert kpis.pollution_load_abated_cod_kg_day == (320.0 - 70.0) * 5000.0 * 1e-3
    assert kpis.overall_sustainability_index >= 70.0


def test_custom_power_and_chemical_inputs(optimizer):
    # Explicitly specify actual blower kW and PAC dosing pump stroke
    inp = ResourceOptimizationInput(
        facility_id="FAC_JAJMAU",
        timestamp="2026-11-16T14:00:00Z",
        inflow_rate_m3_day=10000.0,
        inlet_bod=250.0,
        inlet_cod=500.0,
        inlet_tss=280.0,
        current_blower_power_kw=110.0,
        current_pac_dosing_l_hr=120.0,
    )
    res = optimizer.optimize(inp)

    assert res.aeration_optimization.current_power_kw == 110.0
    assert res.chemical_optimization.current_dosing_l_hr == 120.0
    assert res.aeration_optimization.optimized_power_kw < 110.0
    assert res.chemical_optimization.optimal_dosing_l_hr < 120.0


def test_contract_dict_serialization(optimizer):
    inp = {
        "facility_id": "FAC_SERIALIZE",
        "timestamp": "2026-11-16T16:00:00Z",
        "inflow_rate_m3_day": 8000.0,
        "inlet_bod": 170.0,
        "inlet_cod": 340.0,
        "inlet_tss": 190.0,
        "reused_flow_rate_m3_day": 2400.0,
    }
    res = optimizer.optimize(inp)
    d = res.to_dict()

    assert isinstance(d, dict)
    assert d["facility_id"] == "FAC_SERIALIZE"
    assert "aeration_optimization" in d
    assert "chemical_optimization" in d
    assert "sustainability_kpis" in d
    assert "total_daily_savings_inr" in d
    assert "esg_verifiable_claim" in d
    assert "freshwater_saved_kl_day" in d["sustainability_kpis"]
    assert d["sustainability_kpis"]["freshwater_saved_kl_day"] == 2400.0
