"""
AquaTrust AI — Phases 6 & 7 Integrated Cycle Intelligence Unit Tests
Tests multi-engine aggregation, composite risk status scoring,
and evidence snapshot fragment generation for DLT anchoring.
"""

import pytest
import os
import sys

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from ml.composite import (
    AquaTrustCycleIntelligencePipeline,
    CycleIntelligenceOutput,
)
from ml.inference.schemas import CanonicalReadingInput


@pytest.fixture
def cycle_pipeline():
    return AquaTrustCycleIntelligencePipeline()


def test_pipeline_initialization(cycle_pipeline):
    assert cycle_pipeline is not None
    assert cycle_pipeline.anomaly_engine is not None
    assert cycle_pipeline.prediction_engine is not None
    assert cycle_pipeline.recommendation_engine is not None
    assert cycle_pipeline.resource_optimizer is not None


def test_nominal_cycle_evaluation(cycle_pipeline):
    # Sequence of nominal observations
    readings = [
        CanonicalReadingInput("FAC_TEST_CYCLE", "2026-11-16T12:00:00Z", "ph", 7.4, "pH_units", "inlet"),
        CanonicalReadingInput("FAC_TEST_CYCLE", "2026-11-16T12:05:00Z", "ph", 7.5, "pH_units", "inlet"),
        CanonicalReadingInput("FAC_TEST_CYCLE", "2026-11-16T12:10:00Z", "ph", 7.45, "pH_units", "inlet"),
        CanonicalReadingInput("FAC_TEST_CYCLE", "2026-11-16T12:00:00Z", "bod", 180.0, "mg/L", "inlet"),
        CanonicalReadingInput("FAC_TEST_CYCLE", "2026-11-16T12:05:00Z", "bod", 185.0, "mg/L", "inlet"),
        CanonicalReadingInput("FAC_TEST_CYCLE", "2026-11-16T12:10:00Z", "bod", 182.0, "mg/L", "inlet"),
    ]

    res = cycle_pipeline.evaluate_treatment_cycle(
        facility_id="FAC_TEST_CYCLE",
        period_start="2026-11-16T00:00:00Z",
        period_end="2026-11-16T12:00:00Z",
        readings=readings,
        inflow_rate_m3_day=35000.0,
        reused_flow_rate_m3_day=10500.0,
    )

    assert isinstance(res, CycleIntelligenceOutput)
    assert res.facility_id == "FAC_TEST_CYCLE"
    assert res.ai_status in ["normal", "anomalous"]
    assert res.prediction_status in ["COMPLIANT", "BORDERLINE", "BREACH_RISK"]
    assert res.risk_status in ["LOW_RISK", "MODERATE_RISK", "HIGH_RISK"]
    assert 0.0 <= res.risk_score <= 1.0

    # Test Phase 7 Evidence Snapshot generation
    snapshot_frag = res.to_evidence_snapshot_fragment()
    assert isinstance(snapshot_frag, dict)
    assert "ai_status" in snapshot_frag
    assert "prediction_status" in snapshot_frag
    assert "risk_status" in snapshot_frag
    assert "risk_score" in snapshot_frag
    assert "sustainability_summary" in snapshot_frag
    assert snapshot_frag["sustainability_summary"]["freshwater_saved_kl"] == 10500.0
    assert snapshot_frag["sustainability_summary"]["water_circularity_pct"] == 30.0


def test_shock_cycle_risk_escalation(cycle_pipeline):
    # Simulated shock load with severe anomalies
    readings = [
        # Frozen pH sensor
        CanonicalReadingInput("FAC_SHOCK", "2026-11-16T14:00:00Z", "ph", 7.45, "pH_units"),
        CanonicalReadingInput("FAC_SHOCK", "2026-11-16T14:05:00Z", "ph", 7.45, "pH_units"),
        CanonicalReadingInput("FAC_SHOCK", "2026-11-16T14:10:00Z", "ph", 7.45, "pH_units"),
        CanonicalReadingInput("FAC_SHOCK", "2026-11-16T14:15:00Z", "ph", 7.45, "pH_units"),
        # Extreme organic spike
        CanonicalReadingInput("FAC_SHOCK", "2026-11-16T14:00:00Z", "cod", 1200.0, "mg/L", "inlet"),
        CanonicalReadingInput("FAC_SHOCK", "2026-11-16T14:05:00Z", "cod", 1400.0, "mg/L", "inlet"),
        CanonicalReadingInput("FAC_SHOCK", "2026-11-16T14:10:00Z", "cod", 1600.0, "mg/L", "inlet"),
    ]

    res = cycle_pipeline.evaluate_treatment_cycle(
        facility_id="FAC_SHOCK",
        period_start="2026-11-16T12:00:00Z",
        period_end="2026-11-16T16:00:00Z",
        readings=readings,
    )

    assert res.ai_status == "anomalous"
    assert res.risk_status in ["MODERATE_RISK", "HIGH_RISK"]
    assert res.risk_score >= 0.35
