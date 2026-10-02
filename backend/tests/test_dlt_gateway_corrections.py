"""AquaTrust AI — Checkpoint 4 Test Suite.

Tests for:
- M2-16: Fabric DLT Gateway (Dual Mode, Anchoring, Reconciliation, Correction Links, Status Management)
- M2-17: Independent Cryptographic Verifier (4-Stage Verification & Tamper Detection with DLT Gateway check)
- M2-18: Verification API Endpoints (/verify-record, /verify-proof, /keys, /public/verify)
- M2-19: Append-Only Correction Service & Lineage (/corrections/propose, /authorize, /chain)
- M2-20: Audit Trail & DLT Anchor API Endpoints (/audit-events, /dlt/anchors)
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from uuid import uuid4, UUID
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import get_db, engine
from app.models import Base
from app.models.facility import Facility
from app.models.reading import Reading
from app.models.treatment_record import TreatmentRecord
from app.models.certificate import Certificate
from app.models.signing_key import SigningKey
from app.models.dlt_anchor import DLTAnchor
from app.models.audit_log import AuditLog
from app.models.correction import Correction
from app.models.cryptographic_artifact import CryptographicArtifact
from app.models.compliance_rule import ComplianceRule
from app.services.compliance_service import ComplianceService
from app.services.treatment_service import TreatmentService
from app.services.verifier_service import VerifierService
from app.services.correction_service import CorrectionService
from app.dlt.gateway import FabricDLTGateway, dlt_gateway
from app.core.security import get_current_user_claims


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
def test_facility(db_session: Session):
    fac_id = uuid4()
    fac = Facility(
        facility_id=fac_id,
        facility_name="Delhi Okhla Phase II STP",
        facility_type="municipal_stp",
        location={"city": "New Delhi", "state": "Delhi", "country": "India"},
        capacity=Decimal("100.0"),
        capacity_unit="MLD",
        status="active",
    )
    db_session.add(fac)

    rules = [
        ComplianceRule(
            rule_id=uuid4(),
            parameter="BOD",
            operator="lte",
            threshold=Decimal("30.0"),
            threshold_unit="mg/L",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            effective_from=datetime(2020, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            active=True,
        ),
        ComplianceRule(
            rule_id=uuid4(),
            parameter="COD",
            operator="lte",
            threshold=Decimal("250.0"),
            threshold_unit="mg/L",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            effective_from=datetime(2020, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            active=True,
        ),
        ComplianceRule(
            rule_id=uuid4(),
            parameter="TSS",
            operator="lte",
            threshold=Decimal("50.0"),
            threshold_unit="mg/L",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            effective_from=datetime(2020, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            active=True,
        ),
        ComplianceRule(
            rule_id=uuid4(),
            parameter="PH",
            operator="between",
            threshold_min=Decimal("5.5"),
            threshold_max=Decimal("9.0"),
            threshold_unit="pH units",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            effective_from=datetime(2020, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            active=True,
        ),
        ComplianceRule(
            rule_id=uuid4(),
            parameter="NH4_N",
            operator="lte",
            threshold=Decimal("50.0"),
            threshold_unit="mg/L",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            effective_from=datetime(2020, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            active=True,
        ),
    ]
    for r in rules:
        db_session.add(r)
    db_session.commit()
    return fac


@pytest.fixture
def finalized_record(db_session: Session, test_facility):
    """Seed a finalized treatment record with readings, certificate, signature, and anchor."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=6)
    window_end = now

    for p, val, unit in [("BOD", Decimal("20.0"), "mg/L"), ("COD", Decimal("120.0"), "mg/L"), ("TSS", Decimal("30.0"), "mg/L"), ("PH", Decimal("7.2"), "pH units"), ("NH4_N", Decimal("10.0"), "mg/L")]:
        r = Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=window_start + timedelta(hours=1),
            treatment_stage="final_effluent",
            parameter=p,
            value=val,
            unit=unit,
            quality_status="valid",
        )
        db_session.add(r)
    db_session.commit()

    record = TreatmentService.aggregate_window(
        db=db_session,
        facility_id=test_facility.facility_id,
        period_start=window_start,
        period_end=window_end,
    )
    record.compliance_status = "compliant"
    record.record_state = "eligible_for_finalization"
    db_session.flush()
    finalized = TreatmentService.finalize_record(
        db=db_session,
        record=record,
        key_id="key-ecdsa-p256-01",
    )
    db_session.commit()
    return finalized


@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_claims] = lambda: {"sub": "test_operator", "role": "admin", "facility_id": "FAC-CPCB-001"}
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def unauthenticated_client(db_session: Session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    # Do not override get_current_user_claims to ensure true unauthenticated requests
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_independent_verification_pipeline(db_session: Session, finalized_record):
    """Test 4-stage independent trust verification."""
    # 1. Verification of legitimate finalized record
    res = VerifierService.verify_treatment_record(db_session, finalized_record.record_id)
    assert res["overall_verdict"] == "VERIFIED"
    assert res["tamper_detected"] is False
    assert res["stages"]["stage_1_hash_integrity"]["status"] == "passed"
    assert res["stages"]["stage_2_signature_authenticity"]["status"] == "passed"
    assert res["stages"]["stage_3_certificate_consistency"]["status"] == "passed"
    assert res["stages"]["stage_4_dlt_anchor"]["status"] == "passed"

    # 2. Tamper Test: Mutate compliance status in place
    finalized_record.compliance_status = "tampered_non_compliant"
    db_session.commit()

    tamper_res = VerifierService.verify_treatment_record(db_session, finalized_record.record_id)
    assert tamper_res["overall_verdict"] == "TAMPER_DETECTED"
    assert tamper_res["tamper_detected"] is True
    assert tamper_res["stages"]["stage_1_hash_integrity"]["status"] == "failed"


def test_dlt_ledger_anchor_stage4_failure_modes(db_session: Session, finalized_record, monkeypatch):
    """Test Stage 4 fails if DLT ledger anchor is missing or contains mismatched hash."""
    rec_id = finalized_record.record_id

    # 1. Simulate anchor missing from DLT gateway
    monkeypatch.setattr(dlt_gateway, "query_record_anchor", lambda *a, **k: None)
    gateway_backup = None
    try:
        res = VerifierService.verify_treatment_record(db_session, rec_id)
        assert res["stages"]["stage_4_dlt_anchor"]["status"] == "failed"
        assert res["stages"]["stage_4_dlt_anchor"]["details"]["ledger_match"] is False
        assert "not found" in (res["stages"]["stage_4_dlt_anchor"]["details"]["error"] or "").lower()
        assert res["overall_verdict"] == "DLT_MISMATCH"

        # 2. Simulate anchor with mismatched hash on DLT gateway
        monkeypatch.setattr(dlt_gateway, "query_record_anchor", lambda *a, **k: {
            "tx_id": "tx_tampered",
            "block_number": 1050,
            "channel_id": "aquatrustchannel",
            "chaincode": "aquatrust-records",
            "record_id": str(rec_id),
            "record_hash": "0" * 64,  # Mismatched hash
            "status": "anchored",
        })
        res_mismatch = VerifierService.verify_treatment_record(db_session, rec_id)
        assert res_mismatch["stages"]["stage_4_dlt_anchor"]["status"] == "failed"
        assert res_mismatch["stages"]["stage_4_dlt_anchor"]["details"]["ledger_match"] is False
        assert "mismatch" in (res_mismatch["stages"]["stage_4_dlt_anchor"]["details"]["error"] or "").lower()
        assert res_mismatch["overall_verdict"] == "DLT_MISMATCH"
    finally:
        if gateway_backup:
            dlt_gateway._mock_ledger[str(rec_id)] = gateway_backup


def test_verification_api_endpoints(client: TestClient, db_session: Session, finalized_record):
    """Test Verification REST API endpoints."""
    # 1. Verify Record Endpoint
    resp = client.post(f"/api/v1/verification/verify-record/{finalized_record.record_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_verdict"] == "VERIFIED"
    assert "stage_1_hash_integrity" in data["stages"]

    # 2. Discover Public Key
    key_resp = client.get("/api/v1/verification/keys/key-ecdsa-p256-01")
    assert key_resp.status_code == 200
    key_data = key_resp.json()
    assert key_data["key_id"] == "key-ecdsa-p256-01"
    assert "BEGIN PUBLIC KEY" in key_data["public_key_pem"]

    # 3. Stateless Verify Proof Endpoint
    crypto_art = db_session.query(CryptographicArtifact).filter(
        CryptographicArtifact.record_id == finalized_record.record_id
    ).first()

    payload = {
        "record_id": str(finalized_record.record_id),
        "facility_id": str(finalized_record.facility_id),
        "period_start": finalized_record.period_start.isoformat(),
        "period_end": finalized_record.period_end.isoformat(),
        "record_version": finalized_record.record_version,
        "quality_status": finalized_record.quality_status,
        "anomaly_status": finalized_record.anomaly_status,
        "compliance_status": finalized_record.compliance_status,
        "compliance_summary": finalized_record.compliance_results[0].parameter_results if finalized_record.compliance_results else {},
        "provenance": finalized_record.provenance or {},
    }

    proof_resp = client.post(
        "/api/v1/verification/verify-proof",
        json={
            "canonical_payload": payload,
            "canonical_hash": finalized_record.canonical_hash,
            "signature": crypto_art.signature_value,
            "public_key_pem": key_data["public_key_pem"],
            "key_id": "key-ecdsa-p256-01",
        },
    )
    assert proof_resp.status_code == 200
    assert proof_resp.json()["verdict"] == "VALID"


def test_public_unauthenticated_verification_endpoint(unauthenticated_client: TestClient, finalized_record):
    """Test public unauthenticated verification endpoint without JWT token."""
    resp = unauthenticated_client.post(f"/api/v1/verification/public/verify/{finalized_record.record_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["record_id"] == str(finalized_record.record_id)
    assert data["overall_verdict"] == "VERIFIED"
    assert data["stages"]["stage_4_dlt_anchor"]["status"] == "passed"
    assert data["record_version"] == 1
    assert data["is_superseded"] is False
    assert data["certificate_id"] == str(finalized_record.certificate_id)

    # Test GET public certificate verification endpoint
    cert_resp = unauthenticated_client.get(f"/api/v1/verification/public/verify-certificate/{finalized_record.certificate_id}")
    assert cert_resp.status_code == 200
    cert_data = cert_resp.json()
    assert cert_data["record_id"] == str(finalized_record.record_id)
    assert cert_data["overall_verdict"] == "VERIFIED"
    assert cert_data["certificate_id"] == str(finalized_record.certificate_id)

    # Non-existent record / cert returns 404
    fake_id = uuid4()
    resp_404 = unauthenticated_client.post(f"/api/v1/verification/public/verify/{fake_id}")
    assert resp_404.status_code == 404

    fake_cert_404 = unauthenticated_client.get(f"/api/v1/verification/public/verify-certificate/{fake_id}")
    assert fake_cert_404.status_code == 404


def test_production_key_derivation_guard(monkeypatch):
    """Test that static seed deterministic key derivation is strictly blocked in production."""
    from app.dlt.signer import generate_key_pair
    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(ValueError, match="strictly forbidden in production"):
        generate_key_pair("prod-key-01", deterministic=True)


def test_dlt_gateway_correction_link_and_status():
    """Test FabricDLTGateway correction link recording and status management."""
    gateway = FabricDLTGateway(mode="simulation")
    assert gateway.is_connected is False

    status_info = gateway.get_status()
    assert status_info["mode"] == "SIMULATION"
    assert status_info["status"] == "simulation"
    assert status_info["simulation_only"] is True
    assert status_info["distributed_ledger"] is False
    assert status_info["channel"] == "aquatrust-channel"
    assert status_info["chaincode"] == "aquatrust-records"

    # Record correction link on DLT
    orig_id = uuid4()
    corr_id = uuid4()
    gateway.anchor_record(orig_id, "a" * 64, uuid4(), "compliant", "signature", "key-1")
    gateway.anchor_record(corr_id, "b" * 64, uuid4(), "compliant", "signature", "key-1")
    reason = "Optical sensor BOD calibration adjustment"
    link_res = gateway.record_correction_link(
        original_record_id=orig_id,
        corrected_record_id=corr_id,
        reason=reason,
    )

    assert link_res["docType"] == "correction_link"
    assert link_res["original_record_id"] == str(orig_id)
    assert link_res["corrected_record_id"] == str(corr_id)
    assert link_res["reason"] == reason
    assert link_res["status"] == "anchored"
    assert link_res["tx_id"] is None
    assert link_res["simulation_reference"].startswith("sim:")
    assert link_res["simulation_sequence"] > 0
    assert link_res["original_hash"] == "a" * 64
    assert link_res["correction_hash"] == "b" * 64

    # Query correction link
    queried = gateway.query_correction_link(orig_id, corr_id)
    assert queried is not None
    assert queried["simulation_reference"] == link_res["simulation_reference"]

    # Test status change
    gateway.set_status("degraded")
    assert gateway.is_connected is False
    assert gateway.get_status()["status"] == "degraded"


def test_fabric_mode_uses_committed_gateway_response_without_simulation_fallback(monkeypatch):
    gateway = FabricDLTGateway(mode="FABRIC")
    record_id, facility_id = uuid4(), uuid4()
    calls = []

    def invoke(operation, function, args):
        calls.append((operation, function, args))
        anchor = {
            "docType": "record_anchor", "recordId": str(record_id),
            "recordHash": "c" * 64, "transactionId": "fabric-real-tx-01",
            "organizationId": "FacilityMSP", "timestamp": "2026-10-01T00:00:00Z",
        }
        return {"result": anchor, "transactionId": "fabric-real-tx-01", "commitStatus": "VALID"}

    monkeypatch.setattr(gateway, "_fabric_request", invoke)
    result = gateway.anchor_record(record_id, "c" * 64, facility_id, "compliant", "signature", "key-01")
    assert result["mode"] == "FABRIC"
    assert result["distributed_ledger"] is True
    assert result["tx_id"] == "fabric-real-tx-01"
    assert result["record_hash"] == "c" * 64
    assert calls[0][1] == "CreateAnchor"
    assert gateway.query_record_anchor(record_id)["tx_id"] == "fabric-real-tx-01"
    assert str(record_id) not in gateway._mock_ledger


def test_fabric_unavailable_is_failed_and_never_silently_simulated(monkeypatch):
    gateway = FabricDLTGateway(mode="FABRIC")
    monkeypatch.setattr(gateway, "_fabric_request", lambda *args: (_ for _ in ()).throw(RuntimeError("peer unavailable")))
    result = gateway.anchor_record(uuid4(), "d" * 64, uuid4(), "compliant", "signature", "key-01")
    assert result["status"] == "failed"
    assert result["mode"] == "FABRIC"
    assert result["tx_id"] is None
    assert result["distributed_ledger"] is False
    assert all(value.get("record_id") != str(result["record_id"]) for value in gateway._mock_ledger.values() if isinstance(value, dict))


def test_append_only_correction_lifecycle(client: TestClient, db_session: Session, finalized_record):
    """Test full append-only correction proposal, authorization, and lineage verification."""
    # 1. Propose correction
    prop_resp = client.post(
        "/api/v1/corrections/propose",
        json={
            "original_record_id": str(finalized_record.record_id),
            "reason": "Sensor BOD recalibrated due to bio-fouling drift",
            "justification_code": "SENSOR_RECALIBRATION",
            "corrected_parameters": {"BOD": 18.0, "COD": 115.0},
            "proposer_id": "operator_delhi_02",
        },
    )
    assert prop_resp.status_code == 201
    prop_data = prop_resp.json()
    correction_id = prop_data["correction_id"]
    assert prop_data["status"] == "pending"

    # 2. Authorize correction
    auth_resp = client.post(
        f"/api/v1/corrections/{correction_id}/authorize",
        json={
            "authorized_by": "qa_auditor_cpcb_01",
            "comments": "Approved after reviewing laboratory duplicate assay",
            "key_id": "key-ecdsa-p256-01",
        },
    )
    assert auth_resp.status_code == 200
    auth_data = auth_resp.json()
    assert auth_data["status"] == "authorized"
    superseding_record_id = auth_data["superseding_record_id"]
    assert superseding_record_id is not None

    # Verify original record transitioned to superseded_by_correction
    db_session.refresh(finalized_record)
    assert finalized_record.record_state == "superseded_by_correction"

    # Verify new record is finalized with version 2 and points to original
    new_rec = client.get(f"/api/v1/treatment-records/{superseding_record_id}").json()
    assert new_rec["record_version"] == 2
    assert new_rec["record_state"] == "finalized"
    assert new_rec["supersedes_record_id"] == str(finalized_record.record_id)
    assert new_rec["canonical_hash"] != finalized_record.canonical_hash

    # Verify correction entity has new_dlt_anchor_id
    corr = db_session.query(Correction).filter(Correction.correction_id == UUID(correction_id)).first()
    assert corr.new_dlt_anchor_id is not None

    # Verify raw historical readings were NOT mutated in place; new append-only reading was created
    old_bod = db_session.query(Reading).filter(
        Reading.facility_id == finalized_record.facility_id,
        Reading.parameter == "BOD",
        Reading.quality_status == "suspect",
    ).first()
    assert old_bod is not None
    assert old_bod.value == Decimal("20.0")
    assert old_bod.provenance.get("superseded_by_correction_id") == correction_id

    new_bod = db_session.query(Reading).filter(
        Reading.facility_id == finalized_record.facility_id,
        Reading.parameter == "BOD",
        Reading.quality_status == "valid",
        Reading.source == "correction",
    ).first()
    assert new_bod is not None
    assert new_bod.value == Decimal("18.0")

    # Verify DLT gateway recorded the correction link
    link = dlt_gateway.query_correction_link(finalized_record.record_id, UUID(superseding_record_id))
    assert link is not None
    assert link["docType"] == "correction_link"
    assert link["original_record_id"] == str(finalized_record.record_id)
    assert link["corrected_record_id"] == superseding_record_id

    # 3. Query Lineage Provenance Chain
    chain_resp = client.get(f"/api/v1/corrections/chain/{superseding_record_id}")
    assert chain_resp.status_code == 200
    chain_data = chain_resp.json()
    assert chain_data["total_versions"] == 2
    assert chain_data["chain"][0]["record_id"] == str(finalized_record.record_id)
    assert chain_data["chain"][0]["record_state"] == "superseded_by_correction"
    assert chain_data["chain"][1]["record_id"] == superseding_record_id
    assert chain_data["chain"][1]["record_state"] == "finalized"

    # 4. Verify that verification endpoint exposes is_superseded flag and version
    v_orig = client.post(f"/api/v1/verification/public/verify/{finalized_record.record_id}").json()
    assert v_orig["is_superseded"] is True
    assert v_orig["superseding_record_id"] == superseding_record_id
    assert v_orig["record_version"] == 1
    assert v_orig["record_state"] == "superseded_by_correction"

    v_new = client.post(f"/api/v1/verification/public/verify/{superseding_record_id}").json()
    assert v_new["is_superseded"] is False
    assert v_new["superseding_record_id"] is None
    assert v_new["record_version"] == 2
    assert v_new["record_state"] == "finalized"


def test_dlt_anchor_and_reconciliation(client: TestClient, db_session: Session, finalized_record):
    """Test DLT anchor query and reconciliation endpoints."""
    # 1. List DLT Anchors
    anchors_resp = client.get("/api/v1/dlt/anchors")
    assert anchors_resp.status_code == 200
    anchors = anchors_resp.json()
    assert len(anchors) >= 1
    assert anchors[0]["record_id"] == str(finalized_record.record_id)

    # 2. Reconcile pending anchor
    rec_resp = client.post(f"/api/v1/dlt/anchors/{finalized_record.record_id}/reconcile")
    assert rec_resp.status_code == 200
    rec_data = rec_resp.json()
    assert rec_data["reconciled"] is True
    assert rec_data["current_status"] in ("simulated", "confirmed")
    assert (rec_data["transaction_id"] is None or isinstance(rec_data["transaction_id"], str))
    assert rec_data["ledger_mode"] in ("SIMULATION", "FABRIC")


def test_audit_logs_query(client: TestClient, db_session: Session, finalized_record):
    """Test immutable audit logs retrieval."""
    audit_resp = client.get("/api/v1/audit-events")
    assert audit_resp.status_code == 200
    data = audit_resp.json()
    assert data["total_count"] >= 1
    actions = [l["action"] for l in data["logs"]]
    assert "RECORD_FINALIZED" in actions
