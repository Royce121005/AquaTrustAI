"""AquaTrust AI — Real-Time Digital Twin SCADA Execution Engine & WebSocket Test Suite.

Verifies:
1. Engine lifecycle state transitions (stopped -> starting -> running -> paused -> stopped).
2. Monotonic state versions across ticks and reading synchronization.
3. SCADA AlarmManager evaluation, deduplication, auto-resolution, and acknowledgment.
4. WebSocket authoritative snapshot and state delta schema contracts.
5. Server-side facility-level authorization and RBAC role boundaries.
"""

import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, Any
from uuid import uuid4, UUID
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import engine, get_db, SessionLocal
from app.models import Base
from app.models.facility import Facility
from app.models.reading import Reading
from app.models.user import UserRole
from app.core.security import create_access_token
from app.digital_twin.service import DigitalTwinService
from app.digital_twin.engine_manager import TwinEngineManager
from app.digital_twin.alarms import AlarmManager, TwinAlarmEvent


@pytest.fixture(autouse=True)
def setup_database_and_managers():
    """Setup clean database and reset singleton managers before and after each test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    TwinEngineManager.get_instance().clear()
    AlarmManager.get_instance().clear()
    yield
    TwinEngineManager.get_instance().clear()
    AlarmManager.get_instance().clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_facility_a(db_session: Session) -> Facility:
    fac = Facility(
        facility_id=uuid4(),
        facility_name="STP Plant Alpha - Delhi",
        facility_type="municipal_stp",
        location={"city": "Delhi", "state": "DL"},
        capacity=Decimal("100.000000"),
        capacity_unit="MLD",
        status="active",
    )
    db_session.add(fac)
    db_session.commit()
    return fac


@pytest.fixture
def test_facility_b(db_session: Session) -> Facility:
    fac = Facility(
        facility_id=uuid4(),
        facility_name="STP Plant Beta - Mumbai",
        facility_type="industrial_etp",
        location={"city": "Mumbai", "state": "MH"},
        capacity=Decimal("50.000000"),
        capacity_unit="MLD",
        status="active",
    )
    db_session.add(fac)
    db_session.commit()
    return fac


def get_auth_token(role: str, facility_id: Optional[UUID] = None, username: str = "testoperator") -> str:
    return create_access_token({
        "sub": username,
        "username": username,
        "role": role,
        "facility_id": str(facility_id) if facility_id else None,
    })


def get_auth_headers(role: str, facility_id: Optional[UUID] = None, username: str = "testoperator") -> dict:
    token = get_auth_token(role, facility_id, username)
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# 1. Engine Lifecycle Transitions
# =============================================================================

def test_engine_lifecycle_manager_direct(test_facility_a: Facility):
    """Verifies TwinEngineManager lifecycle state transitions directly."""
    fac_id = test_facility_a.facility_id
    mgr = TwinEngineManager.get_instance()

    # Initial status
    initial_status = mgr.get_status(fac_id)
    assert initial_status["lifecycle_state"] == "stopped"
    assert initial_status["tick_count"] == 0

    # Start engine
    start_res = mgr.start_engine(
        facility_id=fac_id,
        facility_name=test_facility_a.facility_name,
        operating_mode="simulation",
        interval_seconds=0.1,
    )
    assert start_res["status"] == "started"
    assert start_res["worker"]["lifecycle_state"] == "running"

    # Start again while running -> already_running
    start_dup = mgr.start_engine(facility_id=fac_id)
    assert start_dup["status"] == "already_running"

    # Pause engine
    pause_res = mgr.pause_engine(fac_id)
    assert pause_res["status"] == "paused"
    assert pause_res["worker"]["lifecycle_state"] == "paused"
    assert pause_res["worker"]["is_paused"] is True

    # Pause while already paused -> cannot_pause
    pause_dup = mgr.pause_engine(fac_id)
    assert pause_dup["status"] == "cannot_pause"

    # Resume engine
    resume_res = mgr.resume_engine(fac_id)
    assert resume_res["status"] == "resumed"
    assert resume_res["worker"]["lifecycle_state"] == "running"
    assert resume_res["worker"]["is_paused"] is False

    # Resume while running -> cannot_resume
    resume_dup = mgr.resume_engine(fac_id)
    assert resume_dup["status"] == "cannot_resume"

    # Stop engine
    stop_res = mgr.stop_engine(fac_id)
    assert stop_res["status"] == "stopped"
    assert stop_res["worker"]["lifecycle_state"] == "stopped"

    # Stop while stopped -> not_running
    stop_dup = mgr.stop_engine(fac_id)
    assert stop_dup["status"] == "not_running"


def test_engine_lifecycle_rest_endpoints(client: TestClient, test_facility_a: Facility):
    """Verifies engine lifecycle transitions over authenticated REST API."""
    fac_id = str(test_facility_a.facility_id)
    headers = get_auth_headers("operator", test_facility_a.facility_id)

    # Initial status
    resp = client.get(f"/api/v1/facilities/{fac_id}/twin/engine/status", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["lifecycle_state"] == "stopped"

    # Start
    resp = client.post(
        f"/api/v1/facilities/{fac_id}/twin/engine/start",
        json={"interval_seconds": 0.2, "operating_mode": "simulation"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] in ("started", "already_running")
    assert resp.json()["worker"]["lifecycle_state"] == "running"

    # Verify status reflects running
    resp = client.get(f"/api/v1/facilities/{fac_id}/twin/engine/status", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["lifecycle_state"] == "running"

    # Pause
    resp = client.post(f"/api/v1/facilities/{fac_id}/twin/engine/pause", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "paused"
    assert resp.json()["worker"]["lifecycle_state"] == "paused"

    # Resume
    resp = client.post(f"/api/v1/facilities/{fac_id}/twin/engine/resume", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "resumed"
    assert resp.json()["worker"]["lifecycle_state"] == "running"

    # Stop
    resp = client.post(f"/api/v1/facilities/{fac_id}/twin/engine/stop", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "stopped"
    assert resp.json()["worker"]["lifecycle_state"] == "stopped"


# =============================================================================
# 2. Monotonic State Versions Across Ticks
# =============================================================================

def test_monotonic_state_versions_across_ticks(db_session: Session, test_facility_a: Facility):
    """Verifies that DigitalTwin state version advances strictly monotonically across sequential observations."""
    fac_id = test_facility_a.facility_id
    service = DigitalTwinService(db_session)

    # 1. Cold-start initialization produces state version 1
    state_v1 = service.get_facility_state(fac_id)
    assert state_v1.state_version == 1

    # 2. Ingest first valid observation -> advances to version 2
    r1 = Reading(
        reading_id=uuid4(),
        facility_id=fac_id,
        observed_at=datetime.now(timezone.utc),
        treatment_stage="final_effluent",
        parameter="BOD",
        value=Decimal("18.5"),
        unit="mg/L",
        source="telemetry",
        quality_status="valid",
    )
    db_session.add(r1)
    db_session.commit()
    state_v2 = service.synchronize_reading(r1)
    db_session.commit()
    assert state_v2.state_version == 2
    assert state_v2.state_version > state_v1.state_version

    # 3. Ingest second valid observation -> advances to version 3
    r2 = Reading(
        reading_id=uuid4(),
        facility_id=fac_id,
        observed_at=datetime.now(timezone.utc),
        treatment_stage="final_effluent",
        parameter="COD",
        value=Decimal("85.0"),
        unit="mg/L",
        source="telemetry",
        quality_status="valid",
    )
    db_session.add(r2)
    db_session.commit()
    state_v3 = service.synchronize_reading(r2)
    db_session.commit()
    assert state_v3.state_version == 3
    assert state_v3.state_version > state_v2.state_version

    # 4. Ingest third valid observation -> advances to version 4
    r3 = Reading(
        reading_id=uuid4(),
        facility_id=fac_id,
        observed_at=datetime.now(timezone.utc),
        treatment_stage="final_effluent",
        parameter="TSS",
        value=Decimal("22.0"),
        unit="mg/L",
        source="telemetry",
        quality_status="valid",
    )
    db_session.add(r3)
    db_session.commit()
    state_v4 = service.synchronize_reading(r3)
    db_session.commit()
    assert state_v4.state_version == 4
    assert state_v4.state_version > state_v3.state_version

    # 5. Idempotent re-submission of identical reading does NOT increment version
    state_v4_idempotent = service.synchronize_reading(r3)
    assert state_v4_idempotent.state_version == 4

    # 6. Suspect or invalid observation does not overwrite nominal virtual state values
    r_invalid = Reading(
        reading_id=uuid4(),
        facility_id=fac_id,
        observed_at=datetime.now(timezone.utc),
        treatment_stage="final_effluent",
        parameter="BOD",
        value=Decimal("9999.0"),
        unit="mg/L",
        source="telemetry",
        quality_status="invalid",
    )
    db_session.add(r_invalid)
    db_session.commit()
    state_after_invalid = service.synchronize_reading(r_invalid)
    db_session.commit()
    # Preserved latest valid observation (18.5) rather than overwriting with 9999.0
    latest_bod = state_after_invalid.latest_observations.get("bod", {}).get("value")
    assert latest_bod == 18.5


# =============================================================================
# 3. AlarmManager Evaluation, Deduplication & Acknowledgment
# =============================================================================

def test_alarm_manager_cpcb_and_kinetic_evaluations(test_facility_a: Facility):
    """Verifies that AlarmManager correctly evaluates CPCB norms and biological aeration kinetics."""
    fac_id = test_facility_a.facility_id
    alarm_mgr = AlarmManager.get_instance()

    # 1. Nominal conditions -> 0 alarms
    nominal_stage_states = {
        "final_effluent": {
            "parameters": {
                "bod": {"value": 15.0, "unit": "mg/L"},
                "cod": {"value": 80.0, "unit": "mg/L"},
                "tss": {"value": 20.0, "unit": "mg/L"},
                "nh4_n": {"value": 5.0, "unit": "mg/L"},
                "ph": {"value": 7.4, "unit": "pH units"},
            }
        },
        "biological_aeration": {
            "operating_variables": {"do_mg_l": 2.2}
        }
    }
    alarms = alarm_mgr.evaluate_state_alarms(
        facility_id=fac_id,
        stage_states=nominal_stage_states,
        data_quality="valid",
        state_freshness="fresh",
    )
    assert len(alarms) == 0

    # 2. Critical BOD violation (CPCB limit 30 mg/L)
    bod_viol_states = {
        "final_effluent": {
            "parameters": {
                "bod": {"value": 45.0, "unit": "mg/L"},
                "cod": {"value": 80.0, "unit": "mg/L"},
                "tss": {"value": 20.0, "unit": "mg/L"},
                "nh4_n": {"value": 5.0, "unit": "mg/L"},
                "ph": {"value": 7.4, "unit": "pH units"},
            }
        },
        "biological_aeration": {"operating_variables": {"do_mg_l": 2.2}}
    }
    alarms = alarm_mgr.evaluate_state_alarms(
        facility_id=fac_id,
        stage_states=bod_viol_states,
        data_quality="valid",
        state_freshness="fresh",
    )
    assert len(alarms) == 1
    assert alarms[0].parameter == "bod"
    assert alarms[0].severity == "critical"
    assert alarms[0].observed_value == 45.0
    assert alarms[0].threshold_value == 30.0

    # 3. Critical COD violation (CPCB limit 250 mg/L)
    cod_viol_states = {
        "final_effluent": {
            "parameters": {
                "bod": {"value": 15.0, "unit": "mg/L"},
                "cod": {"value": 310.0, "unit": "mg/L"},
                "tss": {"value": 20.0, "unit": "mg/L"},
                "nh4_n": {"value": 5.0, "unit": "mg/L"},
                "ph": {"value": 7.4, "unit": "pH units"},
            }
        },
        "biological_aeration": {"operating_variables": {"do_mg_l": 2.2}}
    }
    alarms = alarm_mgr.evaluate_state_alarms(
        facility_id=fac_id,
        stage_states=cod_viol_states,
        data_quality="valid",
        state_freshness="fresh",
    )
    assert any(a.parameter == "cod" and a.severity == "critical" for a in alarms)

    # 4. Critical Aeration DO crash (< 1.0 mg/L septic risk)
    do_crash_states = {
        "final_effluent": nominal_stage_states["final_effluent"],
        "biological_aeration": {"operating_variables": {"do_mg_l": 0.45}}
    }
    alarms = alarm_mgr.evaluate_state_alarms(
        facility_id=fac_id,
        stage_states=do_crash_states,
        data_quality="valid",
        state_freshness="fresh",
    )
    assert any(a.parameter == "do" and a.severity == "critical" for a in alarms)

    # 5. Warning Aeration DO (< 2.0 mg/L nitrification impairment)
    do_warn_states = {
        "final_effluent": nominal_stage_states["final_effluent"],
        "biological_aeration": {"operating_variables": {"do_mg_l": 1.5}}
    }
    alarms = alarm_mgr.evaluate_state_alarms(
        facility_id=fac_id,
        stage_states=do_warn_states,
        data_quality="valid",
        state_freshness="fresh",
    )
    assert any(a.parameter == "do" and a.severity == "warning" for a in alarms)

    # 6. Data quality invalid and telemetry freshness expired
    comm_alarms = alarm_mgr.evaluate_state_alarms(
        facility_id=fac_id,
        stage_states=nominal_stage_states,
        data_quality="invalid",
        state_freshness="expired",
    )
    assert any(a.alarm_type == "data_quality" for a in comm_alarms)
    assert any(a.alarm_type == "communication" for a in comm_alarms)


def test_alarm_deduplication_lifecycle_and_acknowledgment(test_facility_a: Facility):
    """Verifies that persistent violations update existing alarm rather than duplicating, and operator ack persists."""
    fac_id = test_facility_a.facility_id
    alarm_mgr = AlarmManager.get_instance()

    viol_states = {
        "final_effluent": {
            "parameters": {
                "bod": {"value": 42.0, "unit": "mg/L"},
            }
        },
        "biological_aeration": {"operating_variables": {"do_mg_l": 2.5}}
    }

    # Tick 1: Alarm raised
    alarms_tick1 = alarm_mgr.evaluate_state_alarms(fac_id, viol_states, "valid", "fresh")
    assert len(alarms_tick1) == 1
    alarm_id = alarms_tick1[0].alarm_id
    assert alarms_tick1[0].acknowledged is False
    assert alarms_tick1[0].status == "active"
    assert len(alarm_mgr.get_alarm_history(fac_id)) == 1

    # Tick 2: Same violation continues with higher value (48.0 mg/L)
    viol_states["final_effluent"]["parameters"]["bod"]["value"] = 48.0
    alarms_tick2 = alarm_mgr.evaluate_state_alarms(fac_id, viol_states, "valid", "fresh")
    # Strict deduplication: exact same alarm record updated, not duplicated
    assert len(alarms_tick2) == 1
    assert alarms_tick2[0].alarm_id == alarm_id
    assert alarms_tick2[0].observed_value == 48.0
    assert len(alarm_mgr.get_alarm_history(fac_id)) == 1

    # Operator acknowledges alarm
    ack_res = alarm_mgr.acknowledge_alarm(fac_id, alarm_id)
    assert ack_res is not None
    assert ack_res.acknowledged is True
    assert ack_res.status == "acknowledged"

    # Tick 3: Evaluated again while violation persists -> remains acknowledged
    alarms_tick3 = alarm_mgr.evaluate_state_alarms(fac_id, viol_states, "valid", "fresh")
    assert len(alarms_tick3) == 1
    assert alarms_tick3[0].acknowledged is True
    assert alarms_tick3[0].status == "acknowledged"

    # Tick 4: Process normalizes (BOD = 18.0 <= 30.0) -> Auto-resolved
    normal_states = {
        "final_effluent": {
            "parameters": {
                "bod": {"value": 18.0, "unit": "mg/L"},
            }
        },
        "biological_aeration": {"operating_variables": {"do_mg_l": 2.5}}
    }
    active_tick4 = alarm_mgr.evaluate_state_alarms(fac_id, normal_states, "valid", "fresh")
    assert len(active_tick4) == 0

    # Resolved alarm remains in bounded history with status 'resolved'
    history = alarm_mgr.get_alarm_history(fac_id)
    assert len(history) == 1
    assert history[0].alarm_id == alarm_id
    assert history[0].status == "resolved"


def test_alarm_rest_endpoints(client: TestClient, test_facility_a: Facility):
    """Verifies alarm listing and acknowledgment via REST API."""
    fac_id = str(test_facility_a.facility_id)
    headers = get_auth_headers("operator", test_facility_a.facility_id)
    alarm_mgr = AlarmManager.get_instance()

    # Create an active alarm
    alarm_mgr.evaluate_state_alarms(
        facility_id=test_facility_a.facility_id,
        stage_states={
            "final_effluent": {"parameters": {"bod": {"value": 55.0, "unit": "mg/L"}}}
        },
        data_quality="valid",
        state_freshness="fresh",
    )

    # 1. List alarms
    resp = client.get(f"/api/v1/facilities/{fac_id}/twin/alarms", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "active_alarms" in data
    assert "alarm_history" in data
    assert len(data["active_alarms"]) == 1
    alarm_id = data["active_alarms"][0]["alarm_id"]
    assert data["active_alarms"][0]["acknowledged"] is False

    # 2. Acknowledge alarm
    ack_resp = client.post(f"/api/v1/facilities/{fac_id}/twin/alarms/{alarm_id}/ack", headers=headers)
    assert ack_resp.status_code == 200
    ack_data = ack_resp.json()
    assert ack_data["acknowledged"] is True
    assert ack_data["status"] == "acknowledged"

    # 3. Acknowledge non-existent alarm returns 404
    non_existent = str(uuid4())
    resp_404 = client.post(f"/api/v1/facilities/{fac_id}/twin/alarms/{non_existent}/ack", headers=headers)
    assert resp_404.status_code == 404


# =============================================================================
# 4. WebSocket Snapshot & Delta Contracts
# =============================================================================

def test_websocket_stream_snapshot_and_delta_contracts(client: TestClient, test_facility_a: Facility):
    """Verifies WebSocket initial TWIN_SNAPSHOT, RESYNC action, and ACK_ALARM bi-directional contracts."""
    fac_id = str(test_facility_a.facility_id)
    token = get_auth_token("operator", test_facility_a.facility_id)

    # Connect WebSocket
    with client.websocket_connect(f"/api/v1/facilities/{fac_id}/twin/stream?token={token}") as ws:
        # 1. Authoritative initial TWIN_SNAPSHOT contract
        snapshot = ws.receive_json()
        assert snapshot["type"] == "TWIN_SNAPSHOT"
        assert snapshot["facility_id"] == fac_id
        assert isinstance(snapshot["state_version"], int)
        assert snapshot["state_version"] >= 1
        assert "stage_states" in snapshot
        assert "latest_observations" in snapshot
        assert "active_alarms" in snapshot
        assert "engine_status" in snapshot
        assert "timestamp" in snapshot

        # 2. Client sends RESYNC action
        ws.send_json({"action": "RESYNC"})
        resync_msg = ws.receive_json()
        assert resync_msg["type"] == "TWIN_SNAPSHOT"
        assert resync_msg["facility_id"] == fac_id
        assert resync_msg["state_version"] >= 1

        # 3. Simulate an alarm and test client ACK_ALARM over websocket
        alarm_mgr = AlarmManager.get_instance()
        active = alarm_mgr.evaluate_state_alarms(
            facility_id=test_facility_a.facility_id,
            stage_states={
                "final_effluent": {"parameters": {"bod": {"value": 60.0, "unit": "mg/L"}}}
            },
            data_quality="valid",
            state_freshness="fresh",
        )
        assert len(active) > 0
        alarm_id = active[0].alarm_id

        ws.send_json({"action": "ACK_ALARM", "alarm_id": alarm_id})
        ack_broadcast = ws.receive_json()
        assert ack_broadcast["type"] == "ALARM_ACKNOWLEDGED"
        assert ack_broadcast["facility_id"] == fac_id
        assert ack_broadcast["alarm_id"] == alarm_id
        assert ack_broadcast["alarm"]["acknowledged"] is True


def test_websocket_broadcast_state_delta(client: TestClient, test_facility_a: Facility):
    """Verifies that TwinEngineManager broadcasts TWIN_STATE_DELTA payloads to active subscribers."""
    fac_id = str(test_facility_a.facility_id)
    token = get_auth_token("operator", test_facility_a.facility_id)

    with client.websocket_connect(f"/api/v1/facilities/{fac_id}/twin/stream?token={token}") as ws:
        # Discard initial snapshot
        _ = ws.receive_json()

        # Simulate engine broadcasting delta
        delta_payload = {
            "type": "TWIN_STATE_DELTA",
            "facility_id": fac_id,
            "state_version": 5,
            "observed_at": datetime.now(timezone.utc).isoformat(),
            "source_mode": "simulation",
            "data_quality": "valid",
            "state_freshness": "fresh",
            "stage_states": {"final_effluent": {"status": "nominal"}},
            "latest_observations": {"bod": {"value": 14.5, "unit": "mg/L"}},
            "operating_variables": {"do_mg_l": 2.0},
            "active_alarms": [],
            "engine_status": {"lifecycle_state": "running"},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        loop = asyncio.get_event_loop()
        loop.run_until_complete(
            TwinEngineManager.get_instance().broadcast_to_facility(test_facility_a.facility_id, delta_payload)
        )

        msg = ws.receive_json()
        assert msg["type"] == "TWIN_STATE_DELTA"
        assert msg["state_version"] == 5
        assert msg["latest_observations"]["bod"]["value"] == 14.5


# =============================================================================
# 5. Server-Side Facility-Level Authorization & RBAC
# =============================================================================

def test_websocket_authorization_and_facility_isolation(client: TestClient, test_facility_a: Facility, test_facility_b: Facility):
    """Verifies that WebSocket rejects unauthenticated, invalid tokens, and cross-facility operator connections."""
    fac_a_id = str(test_facility_a.facility_id)
    fac_b_id = str(test_facility_b.facility_id)

    # 1. Unauthenticated connection rejected
    with pytest.raises(Exception):
        with client.websocket_connect(f"/api/v1/facilities/{fac_a_id}/twin/stream"):
            pass

    # 2. Invalid token rejected
    with pytest.raises(Exception):
        with client.websocket_connect(f"/api/v1/facilities/{fac_a_id}/twin/stream?token=invalid.token.signature"):
            pass

    # 3. Cross-facility access denied: Operator scoped to Facility B attempting to connect to Facility A
    token_b = get_auth_token("operator", test_facility_b.facility_id, username="operator_b")
    with pytest.raises(Exception):
        with client.websocket_connect(f"/api/v1/facilities/{fac_a_id}/twin/stream?token={token_b}"):
            pass

    # 4. Same token allows access to their own facility B
    with client.websocket_connect(f"/api/v1/facilities/{fac_b_id}/twin/stream?token={token_b}") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "TWIN_SNAPSHOT"
        assert msg["facility_id"] == fac_b_id


def test_rest_rbac_role_boundaries_and_cross_facility_denial(
    client: TestClient,
    test_facility_a: Facility,
    test_facility_b: Facility,
):
    """Verifies RBAC enforcement and cross-facility isolation on REST engine & alarm routes."""
    fac_a_id = str(test_facility_a.facility_id)
    fac_b_id = str(test_facility_b.facility_id)

    op_a_headers = get_auth_headers("operator", test_facility_a.facility_id, "op_a")
    auditor_headers = get_auth_headers("auditor", None, "auditor_user")
    regulator_headers = get_auth_headers("regulatory_stakeholder", None, "regulator_user")
    admin_headers = get_auth_headers("admin", None, "admin_user")

    # 1. Cross-facility denial: Operator A cannot start/pause/stop/ack facility B
    resp_cross_start = client.post(f"/api/v1/facilities/{fac_b_id}/twin/engine/start", headers=op_a_headers)
    assert resp_cross_start.status_code == 403
    error_msg = resp_cross_start.json().get("message") or resp_cross_start.json().get("detail", "")
    assert "Cross-facility access denied" in error_msg

    resp_cross_ack = client.post(f"/api/v1/facilities/{fac_b_id}/twin/alarms/{uuid4()}/ack", headers=op_a_headers)
    assert resp_cross_ack.status_code == 403

    # 2. Role restriction: Auditor cannot mutate engine state (start/stop)
    resp_audit_start = client.post(f"/api/v1/facilities/{fac_a_id}/twin/engine/start", headers=auditor_headers)
    assert resp_audit_start.status_code == 403

    # 3. Role restriction: Regulatory stakeholder cannot mutate engine state
    resp_reg_start = client.post(f"/api/v1/facilities/{fac_a_id}/twin/engine/start", headers=regulator_headers)
    assert resp_reg_start.status_code == 403

    # 4. Auditor and Regulator HAVE read access to status and alarms
    resp_audit_status = client.get(f"/api/v1/facilities/{fac_a_id}/twin/engine/status", headers=auditor_headers)
    assert resp_audit_status.status_code == 200

    resp_reg_alarms = client.get(f"/api/v1/facilities/{fac_a_id}/twin/alarms", headers=regulator_headers)
    assert resp_reg_alarms.status_code == 200

    # 5. Admin has global access to all facilities
    resp_admin_start = client.post(f"/api/v1/facilities/{fac_a_id}/twin/engine/start", headers=admin_headers)
    assert resp_admin_start.status_code == 200
    assert resp_admin_start.json()["worker"]["lifecycle_state"] == "running"
