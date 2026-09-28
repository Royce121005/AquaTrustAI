"""AquaTrust AI — Checkpoint 4 Test Suite.

Tests for:
- M2-16: Fabric DLT Gateway (Dual Mode, Anchoring, Reconciliation)
- M2-17: Independent Cryptographic Verifier (4-Stage Verification & Tamper Detection)
- M2-18: Verification API Endpoints (/verify-record, /verify-proof, /keys)
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
from app.services.compliance_service import ComplianceService
from app.services.treatment_service import TreatmentService
from app.services.verifier_service import VerifierService
from app.services.correction_service import CorrectionService
from app.dlt.gateway import dlt_gateway
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

    # 3. Query Lineage Provenance Chain
    chain_resp = client.get(f"/api/v1/corrections/chain/{superseding_record_id}")
    assert chain_resp.status_code == 200
    chain_data = chain_resp.json()
    assert chain_data["total_versions"] == 2
    assert chain_data["chain"][0]["record_id"] == str(finalized_record.record_id)
    assert chain_data["chain"][0]["record_state"] == "superseded_by_correction"
    assert chain_data["chain"][1]["record_id"] == superseding_record_id
    assert chain_data["chain"][1]["record_state"] == "finalized"


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
    assert rec_data["current_status"] == "anchored"
    assert rec_data["transaction_id"] is not None


def test_audit_logs_query(client: TestClient, db_session: Session, finalized_record):
    """Test immutable audit logs retrieval."""
    audit_resp = client.get("/api/v1/audit-events")
    assert audit_resp.status_code == 200
    data = audit_resp.json()
    assert data["total_count"] >= 1
    actions = [l["action"] for l in data["logs"]]
    assert "RECORD_FINALIZED" in actions
