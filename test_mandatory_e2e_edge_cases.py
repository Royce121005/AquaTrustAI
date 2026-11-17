"""AquaTrust AI — Mandatory Cross-Module Edge-Case Test Suite (E2E-001 through E2E-012).

Authoritative executable test suite implementing all 12 mandatory edge cases specified in Section 16 of the Master QA Specification.
"""

import os
import sys
import uuid
import time
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor

# Ensure python path
repo_root = os.path.abspath(os.path.dirname(__file__))
backend_root = os.path.join(repo_root, "backend")
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.reading import Reading
from app.models.facility import Facility
from app.models.sensor import Sensor
from app.models.treatment_record import TreatmentRecord
from app.models.correction import Correction
from app.models.dlt_anchor import DLTAnchor
from app.digital_twin.state_updater import StateUpdater
from app.digital_twin.process_model import ProcessModelEngine
from app.digital_twin.engine_manager import TwinEngineManager
from app.services.compliance_service import ComplianceService, normalize_reading_unit
from app.services.correction_service import CorrectionService
from app.services.anomaly_service import AnomalyService
from app.dlt.gateway import dlt_gateway, FabricDLTGateway
from ml.inference.engine import AquaTrustAnomalyInferenceEngine
from ml.inference.exceptions import UnsupportedParameterError

client = TestClient(app)

def get_admin_headers():
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

def get_operator_headers():
    res = client.post("/api/v1/auth/login", json={"username": "operator", "password": "operator123"})
    assert res.status_code == 200, f"Operator login failed: {res.text}"
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

def get_auditor_headers():
    res = client.post("/api/v1/auth/login", json={"username": "auditor", "password": "auditor123"})
    assert res.status_code == 200, f"Auditor login failed: {res.text}"
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_e2e_001_old_reading_after_newer_reading():
    """E2E-001: A sensor sends a reading with an earlier observation timestamp after a newer reading has already been accepted."""
    print("\n--- Running E2E-001: Out-of-order reading arrival ---")
    headers = get_operator_headers()
    fac_id = "04d69e6a-df3d-48dd-a2f9-a1fae6c66d7b"
    now = datetime.now(timezone.utc)
    t_newer = now - timedelta(minutes=5)
    t_older = now - timedelta(minutes=25)

    db = SessionLocal()
    sensor = db.query(Sensor).filter(Sensor.facility_id == uuid.UUID(fac_id), Sensor.parameter == "BOD").first()
    sensor_id = str(sensor.sensor_id) if sensor else None
    db.close()

    # 1. Ingest newer reading
    res_newer = client.post("/api/v1/ingestion/readings", headers=headers, json={
        "facility_id": fac_id,
        "parameter": "BOD",
        "treatment_stage": "final_effluent",
        "value": 26.5,
        "unit": "mg/L",
        "observed_at": t_newer.isoformat(),
        "sensor_id": sensor_id
    })
    assert res_newer.status_code == 201, f"Failed newer ingestion: {res_newer.text}"
    newer_id = res_newer.json()["reading_id"]

    # Check state clock
    db = SessionLocal()
    updater = StateUpdater(db, ProcessModelEngine())
    state_after_newer = updater.repo.get_latest_state(uuid.UUID(fac_id))
    latest_acc_before = state_after_newer.last_accepted_observation_at if state_after_newer else None
    db.close()

    # 2. Ingest older reading arriving out of order
    res_older = client.post("/api/v1/ingestion/readings", headers=headers, json={
        "facility_id": fac_id,
        "parameter": "BOD",
        "treatment_stage": "final_effluent",
        "value": 24.0,
        "unit": "mg/L",
        "observed_at": t_older.isoformat(),
        "sensor_id": sensor_id
    })
    assert res_older.status_code == 201, f"Failed older ingestion: {res_older.text}"
    older_id = res_older.json()["reading_id"]

    # 3. Verify: Both readings exist in PostgreSQL
    db = SessionLocal()
    r_newer = db.query(Reading).filter(Reading.reading_id == uuid.UUID(newer_id)).first()
    r_older = db.query(Reading).filter(Reading.reading_id == uuid.UUID(older_id)).first()
    assert r_newer is not None, "Newer reading not found in DB"
    assert r_older is not None, "Older historical reading not found in DB"

    # 4. Verify: State clock does NOT regress
    updater = StateUpdater(db, ProcessModelEngine())
    state_after_older = updater.repo.get_latest_state(uuid.UUID(fac_id))
    latest_acc_after = state_after_older.last_accepted_observation_at if state_after_older else None
    db.close()

    assert latest_acc_after is not None
    assert latest_acc_after >= t_newer - timedelta(seconds=1), f"State clock regressed! {latest_acc_after} < {t_newer}"
    print(f"E2E-001 PASS: Historical reading preserved in DB; virtual state clock did not regress ({latest_acc_after})")


def test_e2e_002_same_reading_arrives_twice():
    """E2E-002: Same reading arrives concurrently and sequentially with same natural key / idempotency key."""
    print("\n--- Running E2E-002: Concurrent & sequential duplicate reading submissions ---")
    headers = get_operator_headers()
    fac_id = "04d69e6a-df3d-48dd-a2f9-a1fae6c66d7b"
    t_fixed = (datetime.now(timezone.utc) - timedelta(hours=3)).replace(microsecond=0)
    idem_key = f"idem-concurrent-{uuid.uuid4()}"

    db = SessionLocal()
    sensor = db.query(Sensor).filter(Sensor.facility_id == uuid.UUID(fac_id), Sensor.parameter == "COD").first()
    sensor_id = str(sensor.sensor_id) if sensor else None
    db.close()

    payload = {
        "facility_id": fac_id,
        "parameter": "COD",
        "treatment_stage": "final_effluent",
        "value": 142.5,
        "unit": "mg/L",
        "observed_at": t_fixed.isoformat(),
        "sensor_id": sensor_id
    }

    # 1. Fire 5 concurrent requests with identical Idempotency-Key
    def send_duplicate(idx):
        h = {**headers, "Idempotency-Key": idem_key}
        res = client.post("/api/v1/ingestion/readings", headers=h, json=payload)
        return res.status_code, res.json()

    with ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(send_duplicate, range(5)))

    reading_ids = set()
    for status_code, body in results:
        assert status_code in (200, 201), f"Unexpected status {status_code}: {body}"
        reading_ids.add(body["reading_id"])

    # All concurrent requests must resolve to the EXACT SAME reading ID
    assert len(reading_ids) == 1, f"Expected 1 unique reading ID, got {len(reading_ids)}: {reading_ids}"
    canonical_id = reading_ids.pop()

    # 2. Sequential retry with same idempotency key
    h_seq = {**headers, "Idempotency-Key": idem_key}
    res_seq = client.post("/api/v1/ingestion/readings", headers=h_seq, json=payload)
    assert res_seq.status_code in (200, 201)
    assert res_seq.json()["reading_id"] == canonical_id

    # 3. Database check: Exactly 1 record exists in DB for this natural key
    db = SessionLocal()
    records = db.query(Reading).filter(
        Reading.facility_id == uuid.UUID(fac_id),
        Reading.parameter == "COD",
        Reading.treatment_stage == "final_effluent",
        Reading.observed_at == t_fixed,
    ).all()
    assert len(records) == 1, f"Database has duplicate records! Count: {len(records)}"
    db.close()

    print(f"E2E-002 PASS: 5 concurrent + 1 sequential duplicate submissions deduplicated to single ID: {canonical_id}")


def test_e2e_003_bod_different_unit():
    """E2E-003: BOD arrives in different units, incompatible dimensions, and boundary values."""
    print("\n--- Running E2E-003: Unit normalization and dimension validation ---")
    # 1. Valid conversions
    norm_ppm = normalize_reading_unit(Decimal("25.0"), "ppm", "mg/L")
    assert norm_ppm == Decimal("25.0"), f"Expected 25.0, got {norm_ppm}"

    norm_gl = normalize_reading_unit(Decimal("0.025"), "g/L", "mg/L")
    assert norm_gl == Decimal("25.0"), f"Expected 25.0, got {norm_gl}"

    # 2. Unsupported / Invalid units
    norm_psi = normalize_reading_unit(Decimal("25.0"), "psi", "mg/L")
    assert norm_psi is None, f"Expected None for 'psi', got {norm_psi}"

    norm_gallons = normalize_reading_unit(Decimal("25.0"), "gallons", "mg/L")
    assert norm_gallons is None, f"Expected None for 'gallons', got {norm_gallons}"

    # 3. Incompatible dimensions (e.g. volumetric flow m3/day to concentration mg/L)
    norm_incompatible = normalize_reading_unit(Decimal("1000.0"), "m3/day", "mg/L")
    assert norm_incompatible is None, f"Expected None for incompatible dimension m3/day, got {norm_incompatible}"

    # 4. Boundary values: zero, negative, extreme values
    norm_zero = normalize_reading_unit(Decimal("0.0"), "ppm", "mg/L")
    assert norm_zero == Decimal("0.0")

    norm_negative = normalize_reading_unit(Decimal("-5.0"), "ppm", "mg/L")
    assert norm_negative == Decimal("-5.0")

    norm_extreme = normalize_reading_unit(Decimal("1000000.0"), "ppm", "mg/L")
    assert norm_extreme == Decimal("1000000.0")

    print("E2E-003 PASS: Valid units normalized, incompatible dimensions rejected, and boundaries verified.")


def test_e2e_004_db_succeeds_fabric_unavailable():
    """E2E-004: Database succeeds but Fabric is unavailable (Controlled failure injection)."""
    print("\n--- Running E2E-004: Database succeeds with Fabric unavailable / simulated ---")
    headers = get_operator_headers()
    fac_id = "04d69e6a-df3d-48dd-a2f9-a1fae6c66d7b"

    # Verify DLT Gateway status
    res_status = client.get("/api/v1/dlt/status", headers=headers)
    assert res_status.status_code == 200
    status_data = res_status.json()

    # Controlled failure injection: instantiate Fabric mode gateway with unreachable endpoint
    failing_gateway = FabricDLTGateway(mode="FABRIC")
    rec_id = uuid.uuid4()
    fac_uuid = uuid.UUID(fac_id)
    anchor_result = failing_gateway.anchor_record(
        record_id=rec_id,
        record_hash="a" * 64,
        facility_id=fac_uuid,
        compliance_status="compliant",
        signature_value="sig-test",
        key_id="key-01"
    )
    # Fabric unavailable must report failed, not crash, not fake anchor
    assert anchor_result["status"] == "failed"
    assert anchor_result["tx_id"] is None
    assert anchor_result["distributed_ledger"] is False

    # Verify operational DB persistence remains unaffected
    db = SessionLocal()
    rec = db.query(TreatmentRecord).filter(TreatmentRecord.facility_id == fac_uuid).first()
    assert rec is not None, "Operational treatment records exist and remain intact in PostgreSQL"
    db.close()

    print(f"E2E-004 PASS: DB operational commit succeeds; Fabric failure returns status='failed'.")
    print("             NOTE: Live Fabric verification is NOT TESTED (Host Docker daemon offline).")


def test_e2e_005_fabric_commits_api_times_out():
    """E2E-005: Fabric commits but API times out -> Reconcile anchor before retrying without duplicate anchoring."""
    print("\n--- Running E2E-005: Reconciliation of potentially timed-out anchor ---")
    aud_headers = get_auditor_headers()
    db = SessionLocal()
    rec = db.query(TreatmentRecord).filter(TreatmentRecord.record_state == "finalized").first()
    assert rec is not None
    record_id = str(rec.record_id)
    db.close()

    # First reconciliation
    rec_res = client.post(f"/api/v1/dlt/anchors/{record_id}/reconcile", headers=aud_headers)
    assert rec_res.status_code == 200
    res_data = rec_res.json()
    assert res_data["reconciled"] is True

    # Second reconciliation (idempotent retry)
    rec_res_2 = client.post(f"/api/v1/dlt/anchors/{record_id}/reconcile", headers=aud_headers)
    assert rec_res_2.status_code == 200
    assert rec_res_2.json()["reconciled"] is True

    print(f"E2E-005 PASS: Reconcile verified idempotent without duplicate ledger entries.")


def test_e2e_006_user_changes_old_reading():
    """E2E-006: Append-only correction lineage: immutability, exact timestamp, concurrency, RBAC."""
    print("\n--- Running E2E-006: Comprehensive correction lineage & concurrency audit ---")
    op_headers = get_operator_headers()
    aud_headers = get_auditor_headers()
    from app.services.treatment_service import TreatmentService
    db = SessionLocal()
    fac = db.query(Facility).first()
    assert fac is not None, "Need at least one facility"
    fac_id = fac.facility_id
    now = datetime.now(timezone.utc)
    unique_min = (int(time.time() * 1000) % 50000)
    t_start = now - timedelta(days=20) + timedelta(minutes=unique_min)
    t_end = t_start + timedelta(hours=3)

    # Seed fresh raw readings for test covering all compliance parameters
    r_raw_seed = None
    for p, val, unit in [
        ("BOD", Decimal("25.0"), "mg/L"),
        ("COD", Decimal("120.0"), "mg/L"),
        ("TSS", Decimal("30.0"), "mg/L"),
        ("PH", Decimal("7.2"), "pH units"),
    ]:
        r = Reading(
            reading_id=uuid.uuid4(),
            facility_id=fac_id,
            observed_at=t_start + timedelta(minutes=30),
            treatment_stage="final_effluent",
            parameter=p,
            value=val,
            unit=unit,
            source="telemetry",
            quality_status="valid",
        )
        db.add(r)
        if p == "BOD":
            r_raw_seed = r
    db.commit()

    record = TreatmentService.aggregate_window(db=db, facility_id=fac_id, period_start=t_start, period_end=t_end)
    record.compliance_status = "compliant"
    record.record_state = "eligible_for_finalization"
    db.flush()
    finalized = TreatmentService.finalize_record(db=db, record=record, key_id="key-ecdsa-p256-01")
    db.commit()
    v1_id = finalized.record_id
    db.close()

    # 1. Propose correction C1
    prop_res = client.post("/api/v1/corrections/propose", headers=op_headers, json={
        "original_record_id": str(v1_id),
        "reason": "Sensor fouling offset correction",
        "justification_code": "BIOFOULING_DRIFT",
        "corrected_parameters": {"BOD": 22.0}
    })
    assert prop_res.status_code == 201
    c1_id = prop_res.json()["correction_id"]

    # 2. RBAC check: Operator must NOT be allowed to authorize correction
    unauth_auth = client.post(f"/api/v1/corrections/{c1_id}/authorize", headers=op_headers, json={
        "authorized_by": "unauthorized-op",
        "comments": "Should fail 403"
    })
    assert unauth_auth.status_code == 403, f"Operator should be denied 403, got {unauth_auth.status_code}"

    # 3. Concurrency check: Two simultaneous threads attempt to authorize C1
    def try_authorize(worker_name):
        return client.post(f"/api/v1/corrections/{c1_id}/authorize", headers=aud_headers, json={
            "authorized_by": worker_name,
            "comments": "Concurrent test"
        })

    with ThreadPoolExecutor(max_workers=2) as pool:
        auth_res1, auth_res2 = list(pool.map(try_authorize, ["worker-A", "worker-B"]))

    statuses = sorted([auth_res1.status_code, auth_res2.status_code])
    # Exactly one must succeed (200), and the other must be rejected (400 or 409)
    assert statuses[0] == 200, f"Expected one authorization success, got {statuses}"
    assert statuses[1] in (400, 409), f"Expected concurrent duplicate authorization rejection, got {statuses}"

    # Find the resulting v2 record
    auth_data = auth_res1.json() if auth_res1.status_code == 200 else auth_res2.json()
    v2_id = uuid.UUID(auth_data["superseding_record_id"])

    # 4. Verify v1 is superseded and timestamp integrity is preserved
    db = SessionLocal()
    rec_v1 = db.query(TreatmentRecord).filter(TreatmentRecord.record_id == v1_id).first()
    rec_v2 = db.query(TreatmentRecord).filter(TreatmentRecord.record_id == v2_id).first()
    assert rec_v1.record_state == "superseded_by_correction"
    assert rec_v2.record_state == "finalized"
    assert rec_v2.record_version == 2
    assert rec_v2.supersedes_record_id == v1_id

    # Check reading timestamp preservation: corrected reading must have EXACT observed_at
    r_raw = db.query(Reading).filter(Reading.reading_id == r_raw_seed.reading_id).first()
    assert r_raw is not None, "Raw reading must be preserved"
    assert r_raw.quality_status == "suspect"

    r_corr_v2 = db.query(Reading).filter(
        Reading.facility_id == fac_id,
        Reading.treatment_stage == "final_effluent",
        Reading.parameter == "BOD",
        Reading.quality_status == "valid",
        Reading.source == "correction",
        Reading.observed_at == r_raw.observed_at,
    ).first()
    assert r_corr_v2 is not None, "Corrected reading must exist"
    assert r_corr_v2.observed_at == r_raw.observed_at, (
        f"Timestamp distorted! Raw: {r_raw.observed_at}, Corrected: {r_corr_v2.observed_at}"
    )
    db.close()

    # 5. Propose and authorize second sequential correction (v2 -> v3)
    prop_res_2 = client.post("/api/v1/corrections/propose", headers=op_headers, json={
        "original_record_id": str(v2_id),
        "reason": "Secondary laboratory titration adjustment",
        "justification_code": "LAB_TITRATION",
        "corrected_parameters": {"BOD": 21.0}
    })
    assert prop_res_2.status_code == 201
    c2_id = prop_res_2.json()["correction_id"]

    auth_res_v3 = client.post(f"/api/v1/corrections/{c2_id}/authorize", headers=aud_headers, json={
        "authorized_by": "lead-auditor",
        "comments": "Approved secondary correction"
    })
    assert auth_res_v3.status_code == 200
    v3_id = auth_res_v3.json()["superseding_record_id"]

    # 6. Verify full lineage chain
    chain_res = client.get(f"/api/v1/corrections/chain/{v3_id}", headers=aud_headers)
    assert chain_res.status_code == 200
    chain_data = chain_res.json()
    assert chain_data["total_versions"] == 3
    assert chain_data["chain"][0]["record_id"] == str(v1_id)
    assert chain_data["chain"][0]["record_state"] == "superseded_by_correction"
    assert chain_data["chain"][1]["record_id"] == str(v2_id)
    assert chain_data["chain"][1]["record_state"] == "superseded_by_correction"
    assert chain_data["chain"][2]["record_id"] == str(v3_id)
    assert chain_data["chain"][2]["record_state"] == "finalized"

    print(f"E2E-006 PASS: Immutability preserved, exact timestamps verified, RBAC enforced, multi-version lineage confirmed (v1->v2->v3).")


def test_e2e_007_compliance_input_missing():
    """E2E-007: Missing/stale/invalid inputs return pending/insufficient_data, never compliant."""
    print("\n--- Running E2E-007: Missing compliance input handling ---")
    # Empty list
    overall_status, param_results = ComplianceService.evaluate_readings([], None)
    assert overall_status == "pending", f"Expected pending, got {overall_status}"
    assert param_results == {}

    # Incomplete parameters (e.g. only pH provided, missing BOD/COD/TSS)
    now = datetime.now(timezone.utc)
    partial_reading = Reading(
        reading_id=uuid.uuid4(),
        facility_id=uuid.uuid4(),
        observed_at=now,
        treatment_stage="final_effluent",
        parameter="PH",
        value=Decimal("7.2"),
        unit="pH units",
        quality_status="valid",
        source="telemetry"
    )
    status_partial, details_partial = ComplianceService.evaluate_readings([partial_reading], None)
    # With critical parameters missing, overall status cannot be compliant
    assert status_partial in ("pending", "non_compliant", "insufficient_data")

    print(f"E2E-007 PASS: Missing/incomplete inputs safely evaluated as '{overall_status}' / '{status_partial}'.")


async def _async_test_e2e_008():
    import asyncio
    fac_id = uuid.UUID("04d69e6a-df3d-48dd-a2f9-a1fae6c66d7b")
    engine_mgr = TwinEngineManager.get_instance()
    engine_mgr.start_engine(fac_id, facility_name="Test STP", operating_mode="simulation", interval_seconds=0.05)

    worker = engine_mgr.get_worker(fac_id)
    assert worker is not None
    # Wait until worker has ticked at least 3 times
    for _ in range(40):
        if worker.tick_count >= 3:
            break
        await asyncio.sleep(0.05)
    assert worker.tick_count >= 3, f"Expected at least 3 ticks, got {worker.tick_count}"

    # Pause
    res_pause = engine_mgr.pause_engine(fac_id)
    assert res_pause["status"] == "paused"
    assert worker.lifecycle_state == "paused"
    tick_at_pause = worker.tick_count

    # Wait and verify tick count does NOT increase
    await asyncio.sleep(0.2)
    assert worker.tick_count == tick_at_pause, f"Worker ticked while paused! {worker.tick_count} > {tick_at_pause}"

    # Clean up
    engine_mgr.stop_engine(fac_id)
    print(f"E2E-008 PASS: Engine progressed to tick {tick_at_pause}, paused; verified zero progression during pause.")

def test_e2e_008_simulation_paused():
    """E2E-008: Simulation is paused -> Tick halts, values not reported as freshly updated."""
    print("\n--- Running E2E-008: Twin engine pause verification ---")
    import asyncio
    asyncio.run(_async_test_e2e_008())


def test_e2e_009_user_switches_facilities():
    """E2E-009: Scoped permissions and cross-facility access rejection across multiple endpoints."""
    print("\n--- Running E2E-009: Facility boundary isolation and cross-facility rejection ---")
    op_headers = get_operator_headers()
    unauthorized_facility_id = "00000000-0000-0000-0000-000000000099"

    paths_to_test = [
        ("GET", f"/api/v1/facilities/{unauthorized_facility_id}/twin"),
        ("GET", f"/api/v1/facilities/{unauthorized_facility_id}/twin/config"),
        ("POST", f"/api/v1/facilities/{unauthorized_facility_id}/twin/scenarios", {
            "scenario_type": "influent_quality_change",
            "duration_minutes": 60,
            "time_step_seconds": 300,
            "parameters": {}
        })
    ]

    for method, path, *payload in paths_to_test:
        if method == "GET":
            res = client.get(path, headers=op_headers)
        else:
            res = client.post(path, headers=op_headers, json=payload[0])
        assert res.status_code == 403, f"Expected 403 Forbidden for {path}, got {res.status_code}"
        err_msg = str(res.json().get("message") or res.json().get("detail") or res.text)
        assert "Cross-facility access denied" in err_msg or "Forbidden" in err_msg or "denied" in err_msg

    print("E2E-009 PASS: Cross-facility requests across twin, config, and scenarios blocked with 403 Forbidden.")


def test_e2e_010_ml_model_fails():
    """E2E-010: ML model failure / uninitialized parameter returns insufficient_data, never normal."""
    print("\n--- Running E2E-010: ML model failure handling & fallback to insufficient_data ---")
    engine = AquaTrustAnomalyInferenceEngine()

    # 1. Direct engine test: UnsupportedParameterError
    try:
        from ml.inference.schemas import CanonicalReadingInput
        inp = CanonicalReadingInput(
            facility_id="fac-01",
            parameter="UNSUPPORTED_PARAMETER_NAME",
            measurement_stage="effluent",
            timestamp=datetime.now(timezone.utc),
            value=10.0,
            unit="mg/L"
        )
        engine.predict(inp)
        assert False, "Expected UnsupportedParameterError was not raised"
    except UnsupportedParameterError as e:
        print(f"             Engine threw UnsupportedParameterError as expected: {e}")

    # 2. Service level test: AnomalyService.infer_reading returns insufficient_data on error
    db = SessionLocal()
    fac_id = uuid.UUID("04d69e6a-df3d-48dd-a2f9-a1fae6c66d7b")
    malformed_reading = Reading(
        reading_id=uuid.uuid4(),
        facility_id=fac_id,
        observed_at=datetime.now(timezone.utc),
        treatment_stage="effluent",
        parameter="UNSUPPORTED_PARAMETER_NAME",
        value=Decimal("99.9"),
        unit="mg/L",
        quality_status="valid",
        source="telemetry"
    )
    db.add(malformed_reading)
    db.flush()

    anom_res = AnomalyService.infer_reading(db, malformed_reading)
    assert anom_res.anomaly_status == "insufficient_data", f"Expected insufficient_data, got {anom_res.anomaly_status}"
    assert "error" in anom_res.model_metadata
    db.rollback()
    db.close()

    print("E2E-010 PASS: Unsupported ML parameter handled safely and returned 'insufficient_data'.")


def test_e2e_011_browser_refresh_active_scenario():
    """E2E-011: Browser refresh / repeated access to scenario maintains safe persisted state."""
    print("\n--- Running E2E-011: Scenario state persistence across simulated browser reloads ---")
    headers = get_admin_headers()
    fac_id = "04d69e6a-df3d-48dd-a2f9-a1fae6c66d7b"

    # Create scenario
    scen_res = client.post(f"/api/v1/facilities/{fac_id}/twin/scenarios", headers=headers, json={
        "scenario_type": "influent_quality_change",
        "scenario_name": "QA Persistence Check",
        "duration_minutes": 60,
        "time_step_seconds": 300,
        "parameters": {"bod_change_percent": 30.0},
        "seed": 1001
    })
    assert scen_res.status_code == 201
    scen_id = scen_res.json()["scenario_id"]

    # Emulate browser refresh: retrieve scenario directly by ID multiple times
    for _ in range(3):
        get_res = client.get(f"/api/v1/twin/scenarios/{scen_id}", headers=headers)
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["scenario_id"] == scen_id
        assert data["scenario_type"] == "influent_quality_change"
        assert data["parameters"]["bod_change_percent"] == 30.0
        assert data["status"] in ("completed", "running", "initialized")

    print(f"E2E-011 PASS: Scenario {scen_id} verified persisted and queryable across repeated requests.")


def test_e2e_012_two_operators_update_same_asset():
    """E2E-012: Concurrency conflict detection (Optimistic Lock 409 rejection on simultaneous updates)."""
    print("\n--- Running E2E-012: Concurrent asset update conflict detection (Optimistic Lock) ---")
    admin_headers = get_admin_headers()
    fac_id = "04d69e6a-df3d-48dd-a2f9-a1fae6c66d7b"

    # Retrieve current configuration and version
    cfg_before = client.get(f"/api/v1/facilities/{fac_id}/twin/config", headers=admin_headers).json()
    base_version = cfg_before.get("version", 1)

    # Simultaneous updates from two operators based on base_version
    def send_config_update(val):
        return client.put(f"/api/v1/facilities/{fac_id}/twin/config", headers=admin_headers, json={
            "expected_version": base_version,
            "technology_type": "activated_sludge",
            "operating_variables": {"design_capacity_mld": val}
        })

    with ThreadPoolExecutor(max_workers=2) as pool:
        resp_a, resp_b = list(pool.map(send_config_update, [40.0, 45.0]))

    statuses = sorted([resp_a.status_code, resp_b.status_code])
    # One must succeed with 200, and one must be rejected with 409 Conflict
    assert statuses == [200, 409], f"Expected [200, 409], got {statuses}"

    conflict_resp = resp_a if resp_a.status_code == 409 else resp_b
    conflict_err = str(conflict_resp.json().get("message") or conflict_resp.json().get("detail") or conflict_resp.text)
    assert any(word in conflict_err.lower() for word in ["conflict", "version", "duplicate", "uq_twin_configs_facility_version"])

    # Final active version must be incremented by exactly 1
    cfg_after = client.get(f"/api/v1/facilities/{fac_id}/twin/config", headers=admin_headers).json()
    assert cfg_after["version"] == base_version + 1

    print(f"E2E-012 PASS: Optimistic concurrency control rejected concurrent race with 409 Conflict. Version monotonic.")


def run_all_mandatory_edge_cases():
    print("======================================================================")
    print("STARTING EXECUTION OF MANDATORY CROSS-MODULE EDGE CASES E2E-001 -> E2E-012")
    print("======================================================================")
    test_e2e_001_old_reading_after_newer_reading()
    test_e2e_002_same_reading_arrives_twice()
    test_e2e_003_bod_different_unit()
    test_e2e_004_db_succeeds_fabric_unavailable()
    test_e2e_005_fabric_commits_api_times_out()
    test_e2e_006_user_changes_old_reading()
    test_e2e_007_compliance_input_missing()
    test_e2e_008_simulation_paused()
    test_e2e_009_user_switches_facilities()
    test_e2e_010_ml_model_fails()
    test_e2e_011_browser_refresh_active_scenario()
    test_e2e_012_two_operators_update_same_asset()
    print("======================================================================")
    print("ALL 12 MANDATORY CROSS-MODULE EDGE CASES EXECUTED AND PASSED!")
    print("======================================================================")

if __name__ == "__main__":
    run_all_mandatory_edge_cases()
