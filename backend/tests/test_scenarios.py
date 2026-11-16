"""AquaTrust AI — What-If Scenario Engine Tests.

Verifies:
1. Isolated scenario execution from a frozen base state
2. Scenario isolation guarantee: no mutation of live state, readings, records, or certificates
3. Supported scenario types (shock load, sensor drift, stuck sensor, aeration deficit, storm dilution)
4. Deterministic reproducibility with random seed
5. Validation of scenario parameters and error handling
6. Comparative baseline vs scenario time-series output
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from uuid import uuid4
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models import Base
from app.models.facility import Facility
from app.models.reading import Reading
from app.models.treatment_record import TreatmentRecord
from app.models.certificate import Certificate
from app.models.dlt_anchor import DLTAnchor
from app.models.cryptographic_artifact import CryptographicArtifact
from app.models.digital_twin import TwinState, TwinScenario, TwinScenarioResult
from app.digital_twin.repository import TwinRepository
from app.digital_twin.state_updater import StateUpdater
from app.digital_twin.scenario_engine import ScenarioEngine


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    with Session(engine) as session:
        yield session


@pytest.fixture
def test_facility(db_session: Session) -> Facility:
    fac = Facility(
        facility_id=uuid4(),
        facility_name="Bharwara STP Scenario Test",
        facility_type="municipal_stp",
        location={"city": "Lucknow", "state": "UP"},
        capacity=Decimal("345.000000"),
        capacity_unit="MLD",
        status="active",
    )
    db_session.add(fac)
    db_session.commit()
    db_session.refresh(fac)
    return fac


def test_scenario_isolation_guarantee(db_session: Session, test_facility: Facility):
    """
    CRITICAL ISOLATION TEST:
    Running a what-if scenario must NOT modify:
    - Live TwinState or state_version
    - Reading table entries
    - Finalized TreatmentRecords or Certificates
    """
    updater = StateUpdater(db_session)
    repo = TwinRepository(db_session)
    engine_scen = ScenarioEngine(db_session)

    # 1. Establish initial live state
    t0 = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    r_init = Reading(
        reading_id=uuid4(),
        facility_id=test_facility.facility_id,
        observed_at=t0,
        treatment_stage="final_effluent",
        parameter="BOD",
        value=Decimal("18.0"),
        unit="mg/L",
        source="telemetry",
        quality_status="valid",
    )
    db_session.add(r_init)
    db_session.commit()

    live_state_before = updater.apply_observation(r_init)
    v_before = live_state_before.state_version
    reading_count_before = db_session.query(Reading).count()
    record_count_before = db_session.query(TreatmentRecord).count()
    cert_count_before = db_session.query(Certificate).count()
    dlt_count_before = db_session.query(DLTAnchor).count()
    crypto_count_before = db_session.query(CryptographicArtifact).count()

    # 2. Run an aggressive shock load scenario (BOD +100%)
    scenario = engine_scen.run_scenario(
        facility_id=test_facility.facility_id,
        scenario_type="influent_quality_change",
        parameters={"bod_change_percent": 100.0},
        base_state_version=v_before,
        duration_minutes=120,
        time_step_seconds=900,
        seed=42,
    )

    assert scenario.status == "completed"

    # 3. Verify Isolation
    live_state_after = repo.get_latest_state(test_facility.facility_id)
    assert live_state_after.state_version == v_before  # Live version unmodified!
    assert live_state_after.latest_observations["bod"]["value"] == 18.0  # Reading unmodified!

    assert db_session.query(Reading).count() == reading_count_before  # No new readings!
    assert db_session.query(TreatmentRecord).count() == record_count_before  # No treatment records created!
    assert db_session.query(Certificate).count() == cert_count_before  # No certificates created!
    assert db_session.query(DLTAnchor).count() == dlt_count_before  # No DLT anchors committed!
    assert db_session.query(CryptographicArtifact).count() == crypto_count_before  # No crypto artifacts generated!


def test_scenario_reproducibility_with_seed(db_session: Session, test_facility: Facility):
    """Verify that scenarios with identical random seeds produce identical outputs."""
    updater = StateUpdater(db_session)
    engine_scen = ScenarioEngine(db_session)
    repo = TwinRepository(db_session)

    updater.initialize_state(test_facility.facility_id)

    # Run 1 with seed=123
    scen1 = engine_scen.run_scenario(
        facility_id=test_facility.facility_id,
        scenario_type="influent_quality_change",
        parameters={"bod_change_percent": 40.0},
        seed=123,
    )
    res1 = repo.get_scenario_results(scen1.scenario_id)

    # Run 2 with same seed=123
    scen2 = engine_scen.run_scenario(
        facility_id=test_facility.facility_id,
        scenario_type="influent_quality_change",
        parameters={"bod_change_percent": 40.0},
        seed=123,
    )
    res2 = repo.get_scenario_results(scen2.scenario_id)

    # Run 3 with different seed=999
    scen3 = engine_scen.run_scenario(
        facility_id=test_facility.facility_id,
        scenario_type="influent_quality_change",
        parameters={"bod_change_percent": 40.0},
        seed=999,
    )
    res3 = repo.get_scenario_results(scen3.scenario_id)

    assert len(res1) == len(res2) == len(res3)
    # Identical seeds yield exact identical numeric results
    for r1, r2 in zip(res1, res2):
        assert r1.scenario_value == r2.scenario_value
        assert r1.baseline_value == r2.baseline_value

    # Different seeds yield distinct baseline stochastic fluctuations
    diffs = [r1.baseline_value != r3.baseline_value for r1, r3 in zip(res1, res3)]
    assert any(diffs)


def test_multiple_supported_scenario_types(db_session: Session, test_facility: Facility):
    """Verify execution across multiple supported scenario types."""
    updater = StateUpdater(db_session)
    engine_scen = ScenarioEngine(db_session)
    repo = TwinRepository(db_session)

    updater.initialize_state(test_facility.facility_id)

    scenario_types = [
        ("influent_quality_change", {"bod_change_percent": 30.0}),
        ("sensor_drift", {"parameter": "ph", "drift_rate_per_step": 0.1}),
        ("stuck_sensor", {"parameter": "bod", "freeze_value": 20.0}),
        ("process_aeration_change", {"target_do_mg_l": 0.4}),
        ("hydraulic_shock_load", {"flow_multiplier": 2.5}),
    ]

    for s_type, s_params in scenario_types:
        scen = engine_scen.run_scenario(
            facility_id=test_facility.facility_id,
            scenario_type=s_type,
            parameters=s_params,
            duration_minutes=60,
            time_step_seconds=900,
        )
        assert scen.status == "completed"
        results = repo.get_scenario_results(scen.scenario_id)
        assert len(results) > 0
        assert all(r.data_origin == "hypothetical" for r in results)


def test_unsupported_scenario_type_raises_error(db_session: Session, test_facility: Facility):
    """Verify that requesting an unregistered scenario type raises ValueError."""
    updater = StateUpdater(db_session)
    engine_scen = ScenarioEngine(db_session)

    updater.initialize_state(test_facility.facility_id)

    with pytest.raises(ValueError) as exc_info:
        engine_scen.run_scenario(
            facility_id=test_facility.facility_id,
            scenario_type="unknown_blackbox_scenario",
        )
    assert "Unsupported scenario type" in str(exc_info.value)


def test_frontend_scenario_aliases_and_kinetics(db_session: Session, test_facility: Facility):
    """Verify frontend scenario selector aliases execute successfully, change intended variables, and leave live state untouched."""
    updater = StateUpdater(db_session)
    engine_scen = ScenarioEngine(db_session)
    repo = TwinRepository(db_session)

    initial_state = updater.initialize_state(test_facility.facility_id)
    initial_version = initial_state.state_version

    frontend_scenarios = [
        ("aeration_failure", {"do_reduction_percent": 75.0}),
        ("hydraulic_surge", {"flow_multiplier": 2.0}),
        ("chemical_overdosing", {"coagulant_overdose_percent": 50.0}),
    ]

    for s_type, s_params in frontend_scenarios:
        scen = engine_scen.run_scenario(
            facility_id=test_facility.facility_id,
            scenario_type=s_type,
            parameters=s_params,
            duration_minutes=60,
            time_step_seconds=900,
        )
        assert scen.status == "completed"
        results = repo.get_scenario_results(scen.scenario_id)
        assert len(results) > 0
        assert all(r.data_origin == "hypothetical" for r in results)

        # 1. Independent physical behavior verification
        if s_type == "aeration_failure":
            bod_steps = [r for r in results if r.parameter == "bod" and r.treatment_stage == "final_effluent"]
            assert len(bod_steps) > 0
            # Reduced aeration MUST produce higher effluent BOD than baseline
            assert all(r.scenario_value > r.baseline_value for r in bod_steps)

        elif s_type == "chemical_overdosing":
            ph_steps = [r for r in results if r.parameter == "ph" and r.treatment_stage == "final_effluent"]
            assert len(ph_steps) > 0
            # Coagulant overdosing MUST depress effluent pH
            assert all(r.scenario_value < r.baseline_value for r in ph_steps)

        elif s_type == "hydraulic_surge":
            eff_steps = [r for r in results if r.treatment_stage == "final_effluent"]
            assert any(r.scenario_value != r.baseline_value for r in eff_steps)

    # 2. Invariant: live virtual state must remain completely unmutated
    live_state = repo.get_latest_state(test_facility.facility_id)
    assert live_state.state_version == initial_version
    assert live_state.data_quality == "valid"


def test_scenario_unsupported_parameters_rejected(db_session: Session, test_facility: Facility):
    """Verify that invalid/unsupported scenario parameters (negative duration, zero cadence, invalid version) are rejected."""
    engine_scen = ScenarioEngine(db_session)

    # 1. Negative duration
    with pytest.raises(ValueError) as exc1:
        engine_scen.run_scenario(
            facility_id=test_facility.facility_id,
            scenario_type="influent_quality_change",
            duration_minutes=-30,
        )
    assert "duration_minutes must be positive" in str(exc1.value)

    # 2. Zero cadence
    with pytest.raises(ValueError) as exc2:
        engine_scen.run_scenario(
            facility_id=test_facility.facility_id,
            scenario_type="influent_quality_change",
            time_step_seconds=0,
        )
    assert "time_step_seconds must be positive" in str(exc2.value)

    # 3. Nonexistent base state version
    with pytest.raises(ValueError) as exc3:
        engine_scen.run_scenario(
            facility_id=test_facility.facility_id,
            scenario_type="influent_quality_change",
            base_state_version=99999,
        )
    assert "Base state version 99999 not found" in str(exc3.value)
