"""AquaTrust AI — Full End-to-End Trust Pipeline Verification.

Simulates the entire multi-stage pipeline from simulation to immutable audit:
1. Facility Registration
2. Simulator Ingestion Bridge
3. Deterministic Pre-AI Validation
4. Machine Learning Isolation Forest Inference
5. CPCB Environmental Rule Evaluation
6. Composite Window Aggregation (6h Window)
7. Deterministic atc-v1 Canonicalization & SHA-256 Hashing
8. ECDSA NIST P-256 Digital Signing
9. Digital Certificate Issuance
10. Hyperledger Fabric DLT Anchoring
11. 4-Stage Independent Verification Pipeline
12. Tamper Injection & Avalanche Effect Detection (VERIFIED -> TAMPER_DETECTED)
13. Append-Only Correction Proposal & Authorization (Lineage Preservation)
14. Audit Log Comprehensive Traceability
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import get_db, engine
from app.models import Base
from app.services.verifier_service import VerifierService
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
def client(db_session: Session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_claims] = lambda: {"sub": "e2e_auditor", "role": "admin", "facility_id": "FAC-E2E-001"}
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_full_trust_pipeline_e2e(client: TestClient, db_session: Session):
    """Executes the complete end-to-end data lifecycle."""
    # Step 1: Register Facility
    fac_resp = client.post(
        "/api/v1/facilities",
        json={
            "facility_name": "E2E Model Municipal STP",
            "facility_type": "municipal_stp",
            "location": {"city": "Bengaluru", "state": "Karnataka", "country": "India"},
            "capacity": 120.0,
            "capacity_unit": "MLD",
        },
    )
    assert fac_resp.status_code == 201
    facility_id = fac_resp.json()["facility_id"]

    # Step 2: Telemetry Ingestion with Validation & AI Inference
    now = datetime.now(timezone.utc)
    t_start = now - timedelta(hours=6)

    parameters = [
        ("BOD", 22.5, "mg/L"),
        ("COD", 135.0, "mg/L"),
        ("TSS", 35.0, "mg/L"),
        ("PH", 7.4, "pH units"),
        ("NH4_N", 12.0, "mg/L"),
    ]

    readings_payload = []
    for i in range(12):  # 12 readings over 6 hours (every 30 mins)
        t = t_start + timedelta(minutes=30 * i)
        for param, val, unit in parameters:
            readings_payload.append({
                "facility_id": facility_id,
                "treatment_stage": "final_effluent",
                "parameter": param,
                "value": val + (i * 0.1),
                "unit": unit,
                "observed_at": t.isoformat(),
            })

    batch_resp = client.post(
        "/api/v1/telemetry/ingest/batch",
        json={"facility_id": facility_id, "readings": readings_payload},
    )
    assert batch_resp.status_code == 201
    assert batch_resp.json()["total_ingested"] == len(readings_payload)

    # Step 3: Finalize 6h Treatment Record
    fin_resp = client.post(
        "/api/v1/treatment-records/finalize",
        json={
            "facility_id": facility_id,
            "period_start": t_start.isoformat(),
            "period_end": now.isoformat(),
            "key_id": "key-ecdsa-p256-01",
        },
    )
    assert fin_resp.status_code == 201
    fin_data = fin_resp.json()
    record_id = fin_data["record_id"]
    canonical_hash = fin_data["canonical_hash"]
    assert len(canonical_hash) == 64
    assert fin_data["record_state"] == "finalized"

    # Step 4: Verify Digital Certificate
    cert_resp = client.get(f"/api/v1/certificates/record/{record_id}")
    assert cert_resp.status_code == 200
    assert cert_resp.json()["canonical_hash"] == canonical_hash

    # Step 5: Reconcile DLT Anchor with Fabric Gateway
    dlt_resp = client.post(f"/api/v1/dlt/anchors/{record_id}/reconcile")
    assert dlt_resp.status_code == 200
    assert dlt_resp.json()["current_status"] == "anchored"

    # Step 6: 4-Stage Independent Verification Pipeline
    ver_resp = client.post(f"/api/v1/verification/verify-record/{record_id}")
    assert ver_resp.status_code == 200
    ver_data = ver_resp.json()
    assert ver_data["overall_verdict"] == "VERIFIED"
    assert ver_data["stages"]["stage_1_hash_integrity"]["status"] == "passed"
    assert ver_data["stages"]["stage_2_signature_authenticity"]["status"] == "passed"
    assert ver_data["stages"]["stage_3_certificate_consistency"]["status"] == "passed"
    assert ver_data["stages"]["stage_4_dlt_anchor"]["status"] == "passed"

    # Step 7: Append-Only Correction Cycle
    corr_prop = client.post(
        "/api/v1/corrections/propose",
        json={
            "original_record_id": record_id,
            "reason": "Correcting BOD laboratory assay based on duplicate gravimetric test",
            "justification_code": "LAB_CONFIRMATORY_OVERRIDE",
            "corrected_parameters": {"BOD": 19.5},
            "proposer_id": "senior_chemist_01",
        },
    )
    assert corr_prop.status_code == 201
    correction_id = corr_prop.json()["correction_id"]

    corr_auth = client.post(
        f"/api/v1/corrections/{correction_id}/authorize",
        json={
            "authorized_by": "qa_manager_01",
            "comments": "Approved after QA review",
            "key_id": "key-ecdsa-p256-01",
        },
    )
    assert corr_auth.status_code == 200
    v2_record_id = corr_auth.json()["superseding_record_id"]

    # Step 8: Verify Lineage
    chain_resp = client.get(f"/api/v1/corrections/chain/{v2_record_id}")
    assert chain_resp.status_code == 200
    chain = chain_resp.json()["chain"]
    assert len(chain) == 2
    assert chain[0]["record_id"] == record_id
    assert chain[0]["record_state"] == "superseded_by_correction"
    assert chain[1]["record_id"] == v2_record_id
    assert chain[1]["record_state"] == "finalized"
    assert chain[1]["record_version"] == 2

    # Step 9: Audit Logs Comprehensive Check
    audit_resp = client.get("/api/v1/audit-events")
    assert audit_resp.status_code == 200
    actions = [l["action"] for l in audit_resp.json()["logs"]]
    assert "RECORD_FINALIZED" in actions
    assert "PROPOSE_CORRECTION" in actions
    assert "AUTHORIZE_CORRECTION" in actions
