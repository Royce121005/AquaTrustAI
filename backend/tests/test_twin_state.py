"""AquaTrust AI — Virtual Twin State Unit & Integration Tests.

Verifies:
1. Virtual state initialization & retrieval
2. Monotonic version increments
3. Idempotency against duplicate readings
4. Out-of-order observation handling
5. Non-overwrite invariant for invalid/suspect readings
6. State freshness decay & stale-data flagging
7. Missing parameter handling (insufficient_data)
8. State reconstruction from event logs (event-sourcing auditability)
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from uuid import uuid4
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import engine, get_db
from app.models import Base
from app.models.facility import Facility
from app.models.reading import Reading
from app.models.digital_twin import TwinState, TwinConfiguration, TwinStateEvent
from app.digital_twin.repository import TwinRepository
from app.digital_twin.state_updater import StateUpdater
from app.digital_twin.state import VirtualStateManager


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
        facility_name="Bharwara STP Test Facility",
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


def test_virtual_state_initialization(db_session: Session, test_facility: Facility):
    """Verify that virtual state initializes at version 1 with nominal baseline and config."""
    updater = StateUpdater(db_session)
    state = updater.initialize_state(test_facility.facility_id)

    assert state is not None
    assert state.state_version == 1
    assert state.facility_id == test_facility.facility_id
    assert state.data_quality == "valid"
    assert state.state_freshness == "fresh"
    assert "inlet" in state.stage_states
    assert "final_effluent" in state.stage_states
    assert len(state.latest_observations) >= 5

    # Check event log
    repo = TwinRepository(db_session)
    events = repo.get_events(test_facility.facility_id)
    assert len(events) == 1
    assert events[0].event_type == "state_initialized"
    assert events[0].new_state_version == 1


def test_monotonic_state_version_increments(db_session: Session, test_facility: Facility):
    """Verify that every accepted valid reading increments state_version monotonically."""
    updater = StateUpdater(db_session)
    t0 = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)

    # Initial state = version 1
    state1 = updater.initialize_state(test_facility.facility_id, observed_at=t0)
    assert state1.state_version == 1

    # Ingest valid BOD reading
    r_bod = Reading(
        reading_id=uuid4(),
        facility_id=test_facility.facility_id,
        observed_at=t0 + timedelta(minutes=15),
        treatment_stage="final_effluent",
        parameter="BOD",
        value=Decimal("18.5"),
        unit="mg/L",
        source="telemetry",
        quality_status="valid",
    )
    db_session.add(r_bod)
    db_session.commit()

    state2 = updater.apply_observation(r_bod)
    assert state2.state_version == 2
    assert state2.latest_observations["bod"]["value"] == 18.5
    assert state2.last_processed_reading_id == r_bod.reading_id

    # Ingest valid COD reading
    r_cod = Reading(
        reading_id=uuid4(),
        facility_id=test_facility.facility_id,
        observed_at=t0 + timedelta(minutes=15),
        treatment_stage="final_effluent",
        parameter="COD",
        value=Decimal("45.0"),
        unit="mg/L",
        source="telemetry",
        quality_status="valid",
    )
    db_session.add(r_cod)
    db_session.commit()

    state3 = updater.apply_observation(r_cod)
    assert state3.state_version == 3
    assert state3.latest_observations["cod"]["value"] == 45.0


def test_idempotency_duplicate_reading(db_session: Session, test_facility: Facility):
    """Verify that reprocessing the exact same reading does not double-apply or increment version."""
    updater = StateUpdater(db_session)
    t0 = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)

    r_bod = Reading(
        reading_id=uuid4(),
        facility_id=test_facility.facility_id,
        observed_at=t0,
        treatment_stage="final_effluent",
        parameter="BOD",
        value=Decimal("19.2"),
        unit="mg/L",
        source="telemetry",
        quality_status="valid",
    )
    db_session.add(r_bod)
    db_session.commit()

    state_first = updater.apply_observation(r_bod)
    v_first = state_first.state_version

    # Retry applying the exact same reading
    state_retry = updater.apply_observation(r_bod)
    assert state_retry.state_version == v_first
    assert state_retry.state_id == state_first.state_id


def test_invalid_observation_non_overwrite_invariant(db_session: Session, test_facility: Facility):
    """
    CRITICAL INVARIANT TEST:
    When a reading is flagged 'invalid' or 'suspect' by deterministic validation:
    1. Virtual physical state DOES NOT overwrite the latest accepted observation.
    2. Data quality status degrades to 'invalid' / 'suspect'.
    3. State version increments to record the rejection event.
    4. Sensor state records the rejected observation and flags.
    """
    updater = StateUpdater(db_session)
    t0 = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)

    # 1. Accept valid pH 7.2
    r_valid = Reading(
        reading_id=uuid4(),
        facility_id=test_facility.facility_id,
        observed_at=t0,
        treatment_stage="final_effluent",
        parameter="PH",
        value=Decimal("7.20"),
        unit="pH units",
        source="telemetry",
        quality_status="valid",
    )
    db_session.add(r_valid)
    db_session.commit()

    state_valid = updater.apply_observation(r_valid)
    assert state_valid.latest_observations["ph"]["value"] == 7.20
    assert state_valid.data_quality == "valid"

    # 2. Incoming reading has pH 18.5 (Out of physical bounds -> invalid)
    r_invalid = Reading(
        reading_id=uuid4(),
        facility_id=test_facility.facility_id,
        observed_at=t0 + timedelta(minutes=15),
        treatment_stage="final_effluent",
        parameter="PH",
        value=Decimal("18.50"),
        unit="pH units",
        source="telemetry",
        quality_status="invalid",
        provenance={"validation_flags": ["OUT_OF_BOUNDS_PH_18.5"]},
    )
    db_session.add(r_invalid)
    db_session.commit()

    state_after_invalid = updater.apply_observation(r_invalid)

    # Invariant 1: Value is retained at 7.20, NOT overwritten by 18.50
    assert state_after_invalid.latest_observations["ph"]["value"] == 7.20

    # Invariant 2: Data quality reflects the rejection
    assert state_after_invalid.data_quality == "invalid"

    # Invariant 3: Version incremented to record rejection event in audit history
    assert state_after_invalid.state_version > state_valid.state_version

    # Invariant 4: Sensor states track the rejected observation
    sensor_states = state_after_invalid.sensor_states
    assert any("18.5" in str(v) for v in sensor_states.values())

    # Invariant 5: Audit event recorded
    repo = TwinRepository(db_session)
    events = repo.get_events(test_facility.facility_id, from_version=state_after_invalid.state_version)
    assert len(events) >= 1
    assert events[-1].event_type == "observation_rejected"


def test_state_freshness_decay(db_session: Session, test_facility: Facility):
    """Verify that state freshness transitions from fresh to stale to expired."""
    t0 = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)

    # 30 minutes ago -> fresh
    assert VirtualStateManager.evaluate_freshness(t0, now=t0 + timedelta(minutes=30)) == "fresh"

    # 3 hours ago -> stale
    assert VirtualStateManager.evaluate_freshness(t0, now=t0 + timedelta(hours=3)) == "stale"

    # 8 hours ago -> expired
    assert VirtualStateManager.evaluate_freshness(t0, now=t0 + timedelta(hours=8)) == "expired"


def test_state_reconstruction_from_event_log(db_session: Session, test_facility: Facility):
    """Verify that state can be completely reconstructed from persisted event log."""
    updater = StateUpdater(db_session)
    repo = TwinRepository(db_session)
    t0 = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)

    # Ingest 3 successive observations
    readings = [
        Reading(reading_id=uuid4(), facility_id=test_facility.facility_id, observed_at=t0, treatment_stage="final_effluent", parameter="BOD", value=Decimal("15.0"), unit="mg/L", source="telemetry", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=test_facility.facility_id, observed_at=t0 + timedelta(minutes=15), treatment_stage="final_effluent", parameter="COD", value=Decimal("38.0"), unit="mg/L", source="telemetry", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=test_facility.facility_id, observed_at=t0 + timedelta(minutes=30), treatment_stage="final_effluent", parameter="TSS", value=Decimal("12.0"), unit="mg/L", source="telemetry", quality_status="valid"),
    ]
    for r in readings:
        db_session.add(r)
    db_session.commit()

    updater.apply_batch(readings)
    latest_state = repo.get_latest_state(test_facility.facility_id)

    # Reconstruct state at current latest version
    reconstructed = repo.reconstruct_state(test_facility.facility_id, target_version=latest_state.state_version)
    assert reconstructed is not None
    assert reconstructed.state_version == latest_state.state_version
    assert reconstructed.latest_observations["bod"]["value"] == 15.0
    assert reconstructed.latest_observations["cod"]["value"] == 38.0
    assert reconstructed.latest_observations["tss"]["value"] == 12.0


def test_state_update_missing_mandatory_influent_parameters_retains_prior_stages(db_session: Session, test_facility: Facility):
    """Verify that when mandatory parameters are absent, state updater does not fabricate arbitrary defaults."""
    updater = StateUpdater(db_session)
    repo = TwinRepository(db_session)
    t0 = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)

    # Initialize state
    state1 = updater.initialize_state(test_facility.facility_id, observed_at=t0)
    prior_stages = state1.stage_states

    # Artificially remove BOD from latest_observations to test missing mandatory parameter handling
    state1.latest_observations = {"cod": {"value": 40.0, "unit": "mg/L", "source": "telemetry"}}
    repo.save_state(state1)
    db_session.commit()

    # Ingest a standalone reading (e.g., pH)
    r_ph = Reading(
        reading_id=uuid4(),
        facility_id=test_facility.facility_id,
        observed_at=t0 + timedelta(minutes=10),
        treatment_stage="final_effluent",
        parameter="PH",
        value=Decimal("7.2"),
        unit="pH units",
        source="telemetry",
        quality_status="valid",
    )
    db_session.add(r_ph)
    db_session.commit()

    state2 = updater.apply_observation(r_ph)
    # Since BOD and TSS are missing from latest observations, prior stage states must be preserved
    assert state2.stage_states == prior_stages
    assert state2.latest_observations["ph"]["value"] == 7.2


def test_invalid_measurement_non_overwrite_invariant(db_session: Session, test_facility: Facility):
    """Verify that invalid/suspect readings never overwrite accepted observations in state."""
    updater = StateUpdater(db_session)
    repo = TwinRepository(db_session)
    t0 = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)

    # Initialize state with valid BOD = 180.0
    state1 = updater.initialize_state(test_facility.facility_id, observed_at=t0)
    accepted_bod = state1.latest_observations["bod"]["value"]

    # Ingest INVALID reading (e.g., negative or physically impossible reading)
    r_invalid = Reading(
        reading_id=uuid4(),
        facility_id=test_facility.facility_id,
        observed_at=t0 + timedelta(minutes=15),
        treatment_stage="final_effluent",
        parameter="BOD",
        value=Decimal("-99.0"),
        unit="mg/L",
        source="telemetry",
        quality_status="invalid",
    )
    db_session.add(r_invalid)
    db_session.commit()

    state2 = updater.apply_observation(r_invalid)
    # State version advances to track the rejection event
    assert state2.state_version == 2
    # Non-overwrite invariant: accepted observation MUST NOT be polluted by the invalid reading
    assert state2.latest_observations["bod"]["value"] == accepted_bod
    assert state2.data_quality == "invalid"
    # Provenance event check
    events = repo.get_events(test_facility.facility_id)
    assert any(e.event_type == "observation_rejected" for e in events)


def test_out_of_order_and_delayed_observation(db_session: Session, test_facility: Facility):
    """Verify that delayed/out-of-order readings increment version without regressing observed clock."""
    updater = StateUpdater(db_session)
    repo = TwinRepository(db_session)
    t0 = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)

    updater.initialize_state(test_facility.facility_id, observed_at=t0)

    # 1. Apply forward reading at t0 + 30 min
    t_forward = t0 + timedelta(minutes=30)
    r1 = Reading(
        reading_id=uuid4(),
        facility_id=test_facility.facility_id,
        observed_at=t_forward,
        treatment_stage="final_effluent",
        parameter="BOD",
        value=Decimal("16.0"),
        unit="mg/L",
        source="telemetry",
        quality_status="valid",
    )
    db_session.add(r1)
    db_session.commit()
    s1 = updater.apply_observation(r1)
    assert s1.observed_at == t_forward

    # 2. Apply delayed reading at t0 + 10 min (lagged packet)
    t_lagged = t0 + timedelta(minutes=10)
    r2 = Reading(
        reading_id=uuid4(),
        facility_id=test_facility.facility_id,
        observed_at=t_lagged,
        treatment_stage="final_effluent",
        parameter="COD",
        value=Decimal("42.0"),
        unit="mg/L",
        source="telemetry",
        quality_status="valid",
    )
    db_session.add(r2)
    db_session.commit()
    s2 = updater.apply_observation(r2)

    # State version advances monotonically
    assert s2.state_version == s1.state_version + 1
    # Observed clock must NOT regress backwards to t_lagged
    assert s2.observed_at >= t_forward
    # Both readings are now reflected in accepted observations
    assert s2.latest_observations["bod"]["value"] == 16.0
    assert s2.latest_observations["cod"]["value"] == 42.0
