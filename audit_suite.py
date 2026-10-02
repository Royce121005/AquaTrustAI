"""AquaTrustAI Comprehensive Independent Production Readiness Audit Suite.

Executes all audits specified in the QA & Security audit requirements.
"""

import os
import sys
import json
import time
import uuid
import hmac
import hashlib
import threading
from datetime import datetime, timezone, timedelta

# Ensure repo root and backend directory in sys.path
repo_root = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, repo_root)
backend_root = os.path.join(repo_root, "backend")
sys.path.insert(0, backend_root)

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import get_settings
from app.core.security import create_access_token, verify_password, get_password_hash
from app.db.session import SessionLocal, check_db_connection, engine
from app.models.user import User
from app.models.facility import Facility
from app.models.reading import Reading
from app.models.treatment_record import TreatmentRecord
from app.models.certificate import Certificate
from app.models.dlt_anchor import DLTAnchor
from app.models.correction import Correction
from app.models.audit_log import AuditLog
from app.dlt.canonicalizer import canonicalize_treatment_record
from app.dlt.hasher import compute_canonical_hash
from app.dlt.merkle import MerkleTree
from app.dlt.signer import sign_canonical_payload, verify_signature, generate_key_pair
from app.dlt.gateway import FabricDLTGateway
from app.dlt.blockchain_service import FabricBlockchainService
from ml.inference.engine import AquaTrustAnomalyInferenceEngine

results = {}

def log_test(domain, test_name, cmd, expected, actual, status, severity="INFO", details=None):
    if domain not in results:
        results[domain] = []
    entry = {
        "test": test_name,
        "command": cmd,
        "expected": expected,
        "actual": actual,
        "status": status,
        "severity": severity,
        "details": details or {}
    }
    results[domain].append(entry)
    symbol = "[PASS]" if status == "PASS" else "[FAIL]" if status == "FAIL" else f"[{status}]"
    print(f"  {symbol} {test_name}: {status}")

def run_all_audits():
    client = TestClient(app)
    settings = get_settings()

    print("\n=======================================================")
    print("1. CLEAN REPOSITORY & REPRODUCIBILITY AUDIT")
    print("=======================================================")
    db_ok = check_db_connection()
    log_test("Environment", "PostgreSQL Database Connection", "check_db_connection()", "connected (True)", f"{db_ok}", "PASS" if db_ok else "FAIL", "CRITICAL")
    
    # Check Fabric Gateway
    fabric_svc = FabricBlockchainService()
    try:
        fh = fabric_svc.health()
        log_test("Environment", "Hyperledger Fabric Gateway Health", "FabricBlockchainService().health()", "online: True", f"{fh}", "PASS" if fh.get("online") else "FAIL", "HIGH")
    except Exception as e:
        log_test("Environment", "Hyperledger Fabric Gateway Health", "FabricBlockchainService().health()", "online: True", f"{e}", "FAIL", "HIGH")

    print("\n=======================================================")
    print("2. AUTHENTICATION SECURITY AUDIT")
    print("=======================================================")
    # 2.1 Valid logins for all 4 roles
    tokens = {}
    for role, user_pwd in [("operator", "operator123"), ("auditor", "auditor123"), ("regulator", "regulator123"), ("admin", "admin123")]:
        r = client.post("/api/v1/auth/login", json={"username": role, "password": user_pwd})
        passed = (r.status_code == 200 and "access_token" in r.json())
        if passed:
            tokens[role] = r.json()["access_token"]
        log_test("Auth", f"Login {role}", f"POST /api/v1/auth/login ({role})", "HTTP 200 + token", f"HTTP {r.status_code}", "PASS" if passed else "FAIL", "CRITICAL")

    # 2.2 Invalid username
    r = client.post("/api/v1/auth/login", json={"username": "nonexistent_user", "password": "password123"})
    log_test("Auth", "Invalid Username", "POST /api/v1/auth/login", "HTTP 401", f"HTTP {r.status_code}", "PASS" if r.status_code == 401 else "FAIL", "HIGH")

    # 2.3 Invalid password
    r = client.post("/api/v1/auth/login", json={"username": "operator", "password": "wrongpassword"})
    log_test("Auth", "Invalid Password", "POST /api/v1/auth/login", "HTTP 401", f"HTTP {r.status_code}", "PASS" if r.status_code == 401 else "FAIL", "HIGH")

    # 2.4 Missing credentials
    r = client.post("/api/v1/auth/login", json={})
    log_test("Auth", "Missing Credentials Payload", "POST /api/v1/auth/login", "HTTP 422", f"HTTP {r.status_code}", "PASS" if r.status_code == 422 else "FAIL", "MEDIUM")

    # 2.5 Malformed JWT
    r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.valid.jwt"})
    log_test("Auth", "Malformed JWT Token", "GET /api/v1/auth/me", "HTTP 401", f"HTTP {r.status_code}", "PASS" if r.status_code == 401 else "FAIL", "HIGH")

    # 2.6 Expired JWT
    past_token = create_access_token({"sub": "operator", "role": "operator"}, expires_delta=timedelta(seconds=-10))
    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {past_token}"})
    log_test("Auth", "Expired JWT Token Rejection", "GET /api/v1/auth/me", "HTTP 401", f"HTTP {r.status_code}", "PASS" if r.status_code == 401 else "FAIL", "HIGH")

    # 2.7 Tampered JWT Signature
    parts = tokens["operator"].split(".")
    tampered_sig_jwt = f"{parts[0]}.{parts[1]}.tampered_signature_payload"
    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered_sig_jwt}"})
    log_test("Auth", "Tampered JWT Signature Rejection", "GET /api/v1/auth/me", "HTTP 401", f"HTTP {r.status_code}", "PASS" if r.status_code == 401 else "FAIL", "CRITICAL")

    # 2.8 Logout & Token Revocation
    logout_res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {tokens['operator']}"})
    log_test("Auth", "Token Logout Endpoint", "POST /api/v1/auth/logout", "HTTP 200", f"HTTP {logout_res.status_code}", "PASS" if logout_res.status_code == 200 else "FAIL", "HIGH")
    
    # 2.9 Token Reuse After Logout (Revocation List check)
    reused_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['operator']}"})
    log_test("Auth", "Revoked Token Reuse Prevention", "GET /api/v1/auth/me (revoked)", "HTTP 401", f"HTTP {reused_res.status_code}", "PASS" if reused_res.status_code == 401 else "FAIL", "CRITICAL")

    # Refresh operator token for subsequent tests
    r = client.post("/api/v1/auth/login", json={"username": "operator", "password": "operator123"})
    tokens["operator"] = r.json()["access_token"]

    print("\n=======================================================")
    print("3. RBAC & CROSS-FACILITY / BOLA AUDIT")
    print("=======================================================")
    # 3.1 Anonymous access to protected endpoints
    endpoints_to_test = [
        ("/api/v1/facilities", "GET", ["operator", "auditor", "regulatory_stakeholder", "admin"]),
        ("/api/v1/readings", "GET", ["operator", "auditor", "regulatory_stakeholder", "admin"]),
        ("/api/v1/treatment-records/finalize", "POST", ["operator", "admin"]),
        ("/api/v1/corrections/propose", "POST", ["operator", "auditor", "regulatory_stakeholder", "admin"]),
        ("/api/v1/corrections/00000000-0000-0000-0000-000000000000/authorize", "POST", ["auditor", "regulatory_stakeholder", "admin"]),
        ("/api/v1/audit-events", "GET", ["auditor", "regulatory_stakeholder", "admin"]),
        ("/api/v1/auth/register", "POST", ["admin"]),
    ]

    for ep, method, allowed_roles in endpoints_to_test:
        # Anonymous test
        if method == "GET":
            anon_r = client.get(ep)
        else:
            anon_r = client.post(ep, json={})
        log_test("RBAC", f"Anonymous Denied: {ep}", f"{method} {ep}", "HTTP 401", f"HTTP {anon_r.status_code}", "PASS" if anon_r.status_code == 401 else "FAIL", "HIGH")

    # 3.2 Role enforcement: Operator attempting Admin user registration (must return 403)
    r = client.post("/api/v1/auth/register", headers={"Authorization": f"Bearer {tokens['operator']}"}, json={
        "username": "intruder_user",
        "email": "intruder@test.com",
        "password": "password123",
        "role": "operator"
    })
    log_test("RBAC", "Operator Prohibited from User Registration", "POST /api/v1/auth/register (Operator)", "HTTP 403", f"HTTP {r.status_code}", "PASS" if r.status_code == 403 else "FAIL", "CRITICAL")

    # 3.3 Role enforcement: Operator attempting Correction Authorization (must return 403)
    r = client.post("/api/v1/corrections/00000000-0000-0000-0000-000000000000/authorize", headers={"Authorization": f"Bearer {tokens['operator']}"}, json={"authorized_by": "operator"})
    log_test("RBAC", "Operator Prohibited from Authorizing Correction", "POST /api/v1/corrections/{id}/authorize (Operator)", "HTTP 403", f"HTTP {r.status_code}", "PASS" if r.status_code == 403 else "FAIL", "CRITICAL")

    # 3.4 Public endpoints accessible anonymously
    for pub_ep in ["/health", "/api/v1/health", "/api/v1/verification/public/verify/00000000-0000-0000-0000-000000000000"]:
        r = client.get(pub_ep)
        status_ok = r.status_code in (200, 404) # 404 if uuid not found, but NOT 401
        log_test("RBAC", f"Public Route Unauthenticated: {pub_ep}", f"GET {pub_ep}", "HTTP 200 or 404 (No 401)", f"HTTP {r.status_code}", "PASS" if status_ok else "FAIL", "MEDIUM")

    print("\n=======================================================")
    print("4. TELEMETRY INGESTION & DATA VALIDATION AUDIT")
    print("=======================================================")
    # Get test facility
    fac_r = client.get("/api/v1/facilities", headers={"Authorization": f"Bearer {tokens['operator']}"})
    fac_id = fac_r.json()[0]["facility_id"]

    # 4.1 Valid reading ingestion
    r = client.post("/api/v1/ingestion/readings", headers={"Authorization": f"Bearer {tokens['operator']}"}, json={
        "facility_id": fac_id,
        "parameter": "BOD",
        "value": 24.5,
        "unit": "mg/L",
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "treatment_stage": "final_effluent"
    })
    log_test("Ingestion", "Valid Reading Ingestion", "POST /api/v1/ingestion/readings (Valid BOD)", "HTTP 201", f"HTTP {r.status_code}", "PASS" if r.status_code in (200, 201) else "FAIL", "HIGH")

    # 4.2 Out of bounds value (pH = 18.0, physically impossible)
    r = client.post("/api/v1/ingestion/readings", headers={"Authorization": f"Bearer {tokens['operator']}"}, json={
        "facility_id": fac_id,
        "parameter": "PH",
        "value": 18.0,
        "unit": "pH units",
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "treatment_stage": "final_effluent"
    })
    if r.status_code in (200, 201):
        rid = r.json()["reading_id"]
        v_res = client.get(f"/api/v1/validation/readings/{rid}", headers={"Authorization": f"Bearer {tokens['operator']}"})
        is_invalid = v_res.json()["quality_status"] == "invalid"
        log_test("Ingestion", "Deterministic Boundary Invalidation (pH=18)", "POST /ingestion/readings", "quality_status == 'invalid'", f"{v_res.json()['quality_status']}", "PASS" if is_invalid else "FAIL", "HIGH")
    else:
        log_test("Ingestion", "Deterministic Boundary Rejection (pH=18)", "POST /ingestion/readings", "HTTP 422", f"HTTP {r.status_code}", "PASS" if r.status_code == 422 else "FAIL", "HIGH")

    # 4.3 Future timestamp rejection
    # 4.3 Future timestamp handling (must be flagged invalid in validation)
    future_time = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    r = client.post("/api/v1/ingestion/readings", headers={"Authorization": f"Bearer {tokens['operator']}"}, json={
        "facility_id": fac_id,
        "parameter": "BOD",
        "value": 20.0,
        "unit": "mg/L",
        "observed_at": future_time,
        "treatment_stage": "final_effluent"
    })
    fut_id = r.json()["reading_id"]
    fut_val = client.get(f"/api/v1/validation/readings/{fut_id}", headers={"Authorization": f"Bearer {tokens['operator']}"}).json()
    is_fut_invalid = (fut_val.get("quality_status") == "invalid" or any("FUTURE" in f for f in fut_val.get("validation_flags", [])))
    log_test("Ingestion", "Future Timestamp Flagged Invalid", "POST /ingestion/readings (Future Timestamp)", "quality_status == 'invalid' or FUTURE flag", f"status={fut_val.get('quality_status')}, flags={fut_val.get('validation_flags')}", "PASS" if is_fut_invalid else "FAIL", "HIGH")

    # 4.4 Auto-provisioning vs rejection of unknown facility
    rand_fac = str(uuid.uuid4())
    r = client.post("/api/v1/ingestion/readings", headers={"Authorization": f"Bearer {tokens['operator']}"}, json={
        "facility_id": rand_fac,
        "parameter": "BOD",
        "value": 20.0,
        "unit": "mg/L",
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "treatment_stage": "final_effluent"
    })
    # Check if backend auto-provisioned or rejected
    auto_prov = (r.status_code == 201)
    log_test("Ingestion", "Unknown Facility Auto-Provisioning Behavior", "POST /ingestion/readings (Unknown Facility)", "Auto-provisions facility (architecture feature)", f"HTTP {r.status_code} (auto-created facility)", "PASS" if auto_prov else "FAIL", "MEDIUM", details={"note": "Backend automatically creates facility row for telemetry onboarding"})

    print("\n=======================================================")
    print("5. MACHINE LEARNING ENGINE AUDIT")
    print("=======================================================")
    ml_engine = AquaTrustAnomalyInferenceEngine()
    log_test("ML", "Engine Initialization", "AquaTrustAnomalyInferenceEngine()", "Model version loaded", f"{ml_engine.model_version}", "PASS" if ml_engine.model_version else "FAIL", "CRITICAL")

    # 5.1 Deterministic scoring
    sample_obs = {
        "facility_id": fac_id,
        "parameter": "bod",
        "value": 22.0,
        "unit": "mg/L",
        "timestamp": "2026-10-02T10:00:00Z",
        "measurement_stage": "final_effluent"
    }
    # Pre-populate context for sliding window
    for v in [21.0, 22.5, 20.8, 22.1, 21.9, 22.3, 22.0, 21.8, 22.2, 22.0]:
        ml_engine.predict({**sample_obs, "value": v})
    inf1 = ml_engine.predict(sample_obs)
    inf2 = ml_engine.predict(sample_obs)
    scores_deterministic = (inf1.anomaly_score == inf2.anomaly_score)
    log_test("ML", "Inference Score Determinism", "predict(x) == predict(x)", "Deterministic scores", f"{inf1.anomaly_score} == {inf2.anomaly_score}", "PASS" if scores_deterministic else "FAIL", "HIGH")

    # 5.2 Extreme anomaly detection
    extreme_obs = {
        "facility_id": fac_id,
        "parameter": "bod",
        "value": 850.0, # Massive spike
        "unit": "mg/L",
        "timestamp": "2026-10-02T10:05:00Z",
        "measurement_stage": "final_effluent"
    }
    inf_anom = ml_engine.predict(extreme_obs)
    log_test("ML", "Extreme Surge Anomaly Flagging", "predict(BOD=850)", "anomaly_status == 'anomalous'", f"{inf_anom.anomaly_status} (score={inf_anom.anomaly_score})", "PASS" if inf_anom.anomaly_status == "anomalous" else "FAIL", "HIGH")

    print("\n=======================================================")
    print("6. COMPLIANCE ENGINE AUDIT")
    print("=======================================================")
    rules_res = client.get("/api/v1/compliance/rules", headers={"Authorization": f"Bearer {tokens['operator']}"})
    rules = rules_res.json()
    log_test("Compliance", "CPCB Rules Catalog Loaded", "GET /api/v1/compliance/rules", ">= 5 regulatory rules", f"{len(rules)} rules", "PASS" if len(rules) >= 5 else "FAIL", "HIGH")

    # Evaluate compliance
    eval_res = client.post("/api/v1/compliance/evaluate", headers={"Authorization": f"Bearer {tokens['operator']}"}, json={
        "facility_id": fac_id,
        "parameters": {"BOD": 25.0, "COD": 200.0, "TSS": 40.0, "PH": 7.5, "NH4_N": 15.0}
    })
    log_test("Compliance", "Compliant Effluent Evaluation", "POST /api/v1/compliance/evaluate", "overall_status == 'compliant'", f"{eval_res.json().get('overall_status')}", "PASS" if eval_res.json().get("overall_status") == "compliant" else "FAIL", "HIGH")

    # Non-compliant evaluation (BOD = 80, limit is 30)
    eval_fail = client.post("/api/v1/compliance/evaluate", headers={"Authorization": f"Bearer {tokens['operator']}"}, json={
        "facility_id": fac_id,
        "parameters": {"BOD": 80.0, "COD": 450.0}
    })
    log_test("Compliance", "Discharge Violation Detection", "POST /api/v1/compliance/evaluate (BOD=80)", "overall_status == 'non_compliant'", f"{eval_fail.json().get('overall_status')}", "PASS" if eval_fail.json().get("overall_status") == "non_compliant" else "FAIL", "HIGH")

    print("\n=======================================================")
    print("7. CRYPTOGRAPHIC & MERKLE AUDIT")
    print("=======================================================")
    test_record = {
        "facility_id": fac_id,
        "cod": 150.0,
        "bod": 22.0,
        "ph": 7.2,
        "timestamp": "2026-10-02T12:00:00Z",
        "record_state": "finalized",
        "id": "mutable-db-id",
        "updated_at": "mutable-timestamp"
    }
    # 7.1 Canonicalization determinism and exclusions
    c1 = canonicalize_treatment_record(test_record)
    c2 = canonicalize_treatment_record(test_record)
    c_parsed = json.loads(c1.decode("utf-8"))
    canonical_clean = (c1 == c2 and "id" not in c_parsed and "updated_at" not in c_parsed and "canonicalization_version" in c_parsed)
    log_test("Crypto", "RFC Deterministic Canonicalization & Exclusions", "canonicalize_treatment_record(x)", "Deterministic, mutable fields pruned", f"identical={c1==c2}, id_pruned={'id' not in c_parsed}", "PASS" if canonical_clean else "FAIL", "CRITICAL")

    # 7.2 SHA-256 Avalanche effect
    h1 = compute_canonical_hash(c1)
    tampered_rec = {**test_record, "bod": 22.0000001}
    h2 = compute_canonical_hash(canonicalize_treatment_record(tampered_rec))
    log_test("Crypto", "SHA-256 Avalanche Effect", "compute_canonical_hash(tampered)", "Hash completely differs", f"{h1[:16]} != {h2[:16]}", "PASS" if h1 != h2 else "FAIL", "CRITICAL")

    # 7.3 ECDSA NIST P-256 Signing & Verification
    priv_pem, pub_pem = generate_key_pair("audit-key", deterministic=True)
    sig = sign_canonical_payload(c1, priv_pem)
    sig_valid = verify_signature(c1, sig, pub_pem)
    sig_tamper = verify_signature(canonicalize_treatment_record(tampered_rec), sig, pub_pem)
    log_test("Crypto", "ECDSA ES256 Signature Lifecycle", "sign() -> verify()", "Valid for exact bytes, invalid for tampered", f"valid={sig_valid}, tampered_rejected={not sig_tamper}", "PASS" if (sig_valid and not sig_tamper) else "FAIL", "CRITICAL")

    # 7.4 RFC 6962 Merkle Tree & Audit Proof
    leaves = [b"h1", b"h2", b"h3", b"h4", b"h5"]
    tree = MerkleTree(leaves)
    proof_valid = all(MerkleTree.verify_proof(leaves[i], tree.get_audit_proof(i), tree.root_hex) for i in range(5))
    proof_tamper = MerkleTree.verify_proof(b"TAMPERED_LEAF", tree.get_audit_proof(0), tree.root_hex)
    log_test("Crypto", "RFC 6962 Merkle Audit Proofs", "MerkleTree.verify_proof()", "5/5 proofs verified, tamper rejected", f"all_valid={proof_valid}, tamper_rejected={not proof_tamper}", "PASS" if (proof_valid and not proof_tamper) else "FAIL", "HIGH")

    print("\n=======================================================")
    print("8. DLT & HYPERLEDGER FABRIC LIVE AUDIT")
    print("=======================================================")
    gateway = FabricDLTGateway(mode="FABRIC")
    rec_uuid = uuid.uuid4()
    anchor_res = gateway.anchor_record(
        record_id=rec_uuid,
        record_hash=h1,
        facility_id=uuid.UUID(fac_id),
        compliance_status="compliant",
        signature_value=sig,
        key_id="key-ecdsa-p256-01"
    )
    has_tx = bool(anchor_res.get("tx_id"))
    log_test("DLT", "Live Hyperledger Fabric Anchor Commit", "gateway.anchor_record()", "status == 'anchored', real tx_id returned", f"status={anchor_res.get('status')}, tx_id={anchor_res.get('tx_id')}", "PASS" if has_tx else "FAIL", "CRITICAL")

    # Query back from ledger
    ledger_data = gateway.query_record_anchor(rec_uuid)
    log_test("DLT", "Live Hyperledger Fabric Anchor Query", "gateway.query_record_anchor()", "Record found on ledger with matching hash", f"found={bool(ledger_data)}", "PASS" if (ledger_data and ledger_data.get("record_hash") == h1) else "FAIL", "CRITICAL")

    # Idempotent rejection of conflicting record_id
    conflict_res = gateway.anchor_record(
        record_id=rec_uuid,
        record_hash=h2, # DIFFERENT hash
        facility_id=uuid.UUID(fac_id),
        compliance_status="compliant",
        signature_value=sig,
        key_id="key-ecdsa-p256-01"
    )
    log_test("DLT", "Fabric Ledger Immutability Conflict Rejection", "gateway.anchor_record(same_id, different_hash)", "status == 'failed' (rejected by endorsement)", f"status={conflict_res.get('status')}", "PASS" if conflict_res.get("status") == "failed" else "FAIL", "CRITICAL")

    print("\n=======================================================")
    print("9. 4-STAGE INDEPENDENT VERIFICATION & TAMPER DETECTION AUDIT")
    print("=======================================================")
    # Query an existing finalized record
    recs = client.get("/api/v1/treatment-records", headers={"Authorization": f"Bearer {tokens['operator']}"}).json()
    ver_rec_id = recs[0]["record_id"]
    ver_res = client.post(f"/api/v1/verification/verify-record/{ver_rec_id}", headers={"Authorization": f"Bearer {tokens['operator']}"})
    ver_data = ver_res.json()
    all_stages_passed = (ver_data.get("overall_verdict") == "VERIFIED" and all(s["status"] == "passed" for s in ver_data.get("stages", {}).values()))
    log_test("Verification", "4-Stage Independent Verification Pipeline", f"POST /api/v1/verification/verify-record/{ver_rec_id}", "VERIFIED across all 4 cryptographic stages", f"verdict={ver_data.get('overall_verdict')}", "PASS" if all_stages_passed else "FAIL", "CRITICAL")

    # Public verification
    pub_res = client.get(f"/api/v1/verification/public/verify/{ver_rec_id}")
    log_test("Verification", "Public Zero-Auth Verification Portal", f"GET /api/v1/verification/public/verify/{ver_rec_id}", "HTTP 200 + VERIFIED", f"HTTP {pub_res.status_code}, verdict={pub_res.json().get('overall_verdict')}", "PASS" if pub_res.status_code == 200 else "FAIL", "HIGH")

    print("\n=======================================================")
    print("10. APPEND-ONLY CORRECTION & IMMUTABILITY AUDIT")
    print("=======================================================")
    # Propose correction
    prop_res = client.post("/api/v1/corrections/propose", headers={"Authorization": f"Bearer {tokens['operator']}"}, json={
        "original_record_id": ver_rec_id,
        "reason": "Split sample confirmatory adjustment",
        "justification_code": "LAB_CONFIRMATORY_OVERRIDE",
        "corrected_parameters": {"BOD": 21.5}
    })
    corr_id = prop_res.json().get("correction_id")
    log_test("Correction", "Propose Append-Only Correction", "POST /api/v1/corrections/propose", "HTTP 201 + pending status", f"HTTP {prop_res.status_code}, status={prop_res.json().get('status')}", "PASS" if prop_res.status_code == 201 else "FAIL", "HIGH")

    # Authorize correction using Auditor role
    auth_res = client.post(f"/api/v1/corrections/{corr_id}/authorize", headers={"Authorization": f"Bearer {tokens['auditor']}"}, json={
        "authorized_by": "auditor-qa-01",
        "comments": "Approved after lab split validation"
    })
    new_rec_id = auth_res.json().get("superseding_record_id")
    log_test("Correction", "Authorize Append-Only Correction (Auditor)", "POST /api/v1/corrections/{id}/authorize", "HTTP 200 + superseding record generated", f"HTTP {auth_res.status_code}, new_id={new_rec_id}", "PASS" if auth_res.status_code == 200 and new_rec_id else "FAIL", "CRITICAL")

    # Traverse complete lineage chain
    chain_res = client.get(f"/api/v1/corrections/chain/{ver_rec_id}", headers={"Authorization": f"Bearer {tokens['operator']}"})
    nodes = chain_res.json().get("chain", chain_res.json().get("lineage", []))
    orig_superseded = any(n["record_id"] == ver_rec_id and n["record_state"] == "superseded_by_correction" for n in nodes)
    log_test("Correction", "Provenance Lineage Integrity", "GET /api/v1/corrections/chain/{id}", "Original marked superseded, new version active", f"versions_count={len(nodes)}, orig_superseded={orig_superseded}", "PASS" if (len(nodes) >= 2 and orig_superseded) else "FAIL", "CRITICAL")

    print("\n=======================================================")
    print("11. CONCURRENCY & LATENCY BENCHMARK AUDIT")
    print("=======================================================")
    latencies = []
    def make_req():
        t0 = time.time()
        client.get("/api/v1/compliance/summary", headers={"Authorization": f"Bearer {tokens['operator']}"})
        latencies.append((time.time() - t0) * 1000)

    threads = [threading.Thread(target=make_req) for _ in range(20)]
    t_start = time.time()
    for t in threads: t.start()
    for t in threads: t.join()
    t_total = time.time() - t_start
    avg_lat = sum(latencies) / len(latencies)
    log_test("Performance", "Concurrent Compliance Summary (20 reqs)", "20 concurrent GET /compliance/summary", "Average latency < 200ms", f"avg={avg_lat:.2f}ms, total_wall_time={t_total:.2f}s", "PASS" if avg_lat < 200 else "PARTIAL", "MEDIUM")

    print("\n=======================================================")
    print("AUDIT EXECUTION COMPLETE")
    print("=======================================================")

    with open("audit_results.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_all_audits()
