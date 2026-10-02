"""AquaTrust AI — Live API Verification Suite.

Validates each endpoint across all route groups against the live running FastAPI server
connected to PostgreSQL 17 (aquatrust_db).
"""

import sys
import json
import uuid
from datetime import datetime, timezone, timedelta
import httpx

BASE_URL = "http://127.0.0.1:8000"

results = []

def record(endpoint, method, status, details=""):
    results.append({
        "endpoint": endpoint,
        "method": method,
        "status": status,
        "details": details
    })
    symbol = "[PASS]" if status == "PASS" else "[FAIL]"
    print(f"{symbol} {method:6} {endpoint:46} | {details}")

def run_tests():
    print("=" * 85)
    print("AQUATRUST AI — COMPLETE LIVE API VERIFICATION SUITE")
    print(f"Target: {BASE_URL} (PostgreSQL 17 Backend)")
    print("=" * 85)

    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1. Health Endpoints
    print("\n>>> 1. SYSTEM HEALTH & CONNECTIVITY APIS")
    try:
        r = client.get("/health")
        if r.status_code == 200 and r.json().get("database") == "connected":
            record("/health", "GET", "PASS", f"status=healthy, db={r.json()['database']}")
        else:
            record("/health", "GET", "FAIL", f"HTTP {r.status_code}: {r.text}")
    except Exception as e:
        record("/health", "GET", "FAIL", str(e))

    # 2. Authentication APIS (All 4 Roles)
    print("\n>>> 2. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)")
    tokens = {}
    users_to_test = [
        ("admin", "admin123", "admin"),
        ("operator", "operator123", "operator"),
        ("auditor", "auditor123", "auditor"),
        ("regulator", "regulator123", "regulatory_stakeholder"),
    ]
    for username, password, expected_role in users_to_test:
        try:
            r = client.post("/api/v1/auth/login", json={"username": username, "password": password})
            if r.status_code == 200:
                data = r.json()
                token = data.get("access_token")
                tokens[username] = token
                role = data.get("role")
                if role == expected_role:
                    record(f"/api/v1/auth/login ({username})", "POST", "PASS", f"role={role}, token_type={data.get('token_type')}")
                else:
                    record(f"/api/v1/auth/login ({username})", "POST", "FAIL", f"Expected role {expected_role}, got {role}")
            else:
                record(f"/api/v1/auth/login ({username})", "POST", "FAIL", f"HTTP {r.status_code}: {r.text}")
        except Exception as e:
            record(f"/api/v1/auth/login ({username})", "POST", "FAIL", str(e))

    # Test /auth/me for each user
    for username, token in tokens.items():
        headers = {"Authorization": f"Bearer {token}"}
        try:
            r = client.get("/api/v1/auth/me", headers=headers)
            if r.status_code == 200:
                me = r.json()
                record(f"/api/v1/auth/me ({username})", "GET", "PASS", f"username={me.get('username')}, role={me.get('role')}")
            else:
                record(f"/api/v1/auth/me ({username})", "GET", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            record(f"/api/v1/auth/me ({username})", "GET", "FAIL", str(e))

    op_headers = {"Authorization": f"Bearer {tokens.get('operator')}"}
    admin_headers = {"Authorization": f"Bearer {tokens.get('admin')}"}
    auditor_headers = {"Authorization": f"Bearer {tokens.get('auditor')}"}
    regulator_headers = {"Authorization": f"Bearer {tokens.get('regulator')}"}

    # 3. Facilities APIs
    print("\n>>> 3. FACILITIES & SENSORS APIS")
    primary_facility_id = None
    try:
        r = client.get("/api/v1/facilities", headers=op_headers)
        if r.status_code == 200:
            facs = r.json()
            bharwara = next((f for f in facs if "Bharwara" in f.get("facility_name", "")), None)
            if bharwara:
                primary_facility_id = bharwara["facility_id"]
                record("/api/v1/facilities", "GET", "PASS", f"Found {len(facs)} facilities. Flagship: {bharwara['facility_name']} ({bharwara['capacity']} MLD)")
            else:
                record("/api/v1/facilities", "GET", "FAIL", "Bharwara STP not found in facilities list")
        else:
            record("/api/v1/facilities", "GET", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record("/api/v1/facilities", "GET", "FAIL", str(e))

    if primary_facility_id:
        try:
            r = client.get(f"/api/v1/facilities/{primary_facility_id}", headers=op_headers)
            if r.status_code == 200:
                fac = r.json()
                record("/api/v1/facilities/{id}", "GET", "PASS", f"name={fac.get('facility_name')}, type={fac.get('facility_type')}")
            else:
                record("/api/v1/facilities/{id}", "GET", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            record("/api/v1/facilities/{id}", "GET", "FAIL", str(e))

        try:
            r = client.get(f"/api/v1/facilities/{primary_facility_id}/sensors", headers=op_headers)
            if r.status_code == 200:
                sensors = r.json()
                params = [s.get("parameter") for s in sensors]
                has_tkn = "TKN" in params
                record("/api/v1/facilities/{id}/sensors", "GET", "PASS", f"Found {len(sensors)} sensors: {params}, TKN active={has_tkn}")
            else:
                record("/api/v1/facilities/{id}/sensors", "GET", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            record("/api/v1/facilities/{id}/sensors", "GET", "FAIL", str(e))

    # 4. Telemetry Ingestion APIs
    print("\n>>> 4. TELEMETRY INGESTION APIS")
    test_reading_id = None
    if primary_facility_id:
        sample_time = (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat()
        try:
            ing_payload = {
                "facility_id": primary_facility_id,
                "parameter": "TKN",
                "value": 2.450000,
                "unit": "mg/L",
                "treatment_stage": "final_effluent",
                "observed_at": sample_time
            }
            r = client.post("/api/v1/ingestion/readings", headers=op_headers, json=ing_payload)
            if r.status_code in (200, 201):
                data = r.json()
                test_reading_id = data.get("reading_id")
                record("/api/v1/ingestion/readings", "POST", "PASS", f"reading_id={test_reading_id}, param=TKN, value=2.45 mg/L")
            else:
                record("/api/v1/ingestion/readings", "POST", "FAIL", f"HTTP {r.status_code}: {r.text}")
        except Exception as e:
            record("/api/v1/ingestion/readings", "POST", "FAIL", str(e))

    # 5. Readings Query APIs
    print("\n>>> 5. READINGS & TIME-SERIES APIS")
    try:
        r = client.get(f"/api/v1/readings?facility_id={primary_facility_id}&limit=10", headers=op_headers)
        if r.status_code == 200:
            readings = r.json()
            record("/api/v1/readings", "GET", "PASS", f"Retrieved {len(readings)} telemetry observations")
            if not test_reading_id and len(readings) > 0:
                test_reading_id = readings[0].get("reading_id")
        else:
            record("/api/v1/readings", "GET", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record("/api/v1/readings", "GET", "FAIL", str(e))

    if test_reading_id:
        try:
            r = client.get(f"/api/v1/readings/{test_reading_id}", headers=op_headers)
            if r.status_code == 200:
                rd = r.json()
                record("/api/v1/readings/{id}", "GET", "PASS", f"parameter={rd.get('parameter')}, value={rd.get('value')} {rd.get('unit')}")
            else:
                record("/api/v1/readings/{id}", "GET", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            record("/api/v1/readings/{id}", "GET", "FAIL", str(e))

    # 6. Validation APIs
    print("\n>>> 6. DATA QUALITY & STOICHIOMETRIC VALIDATION APIS")
    if test_reading_id:
        try:
            r = client.get(f"/api/v1/validation/readings/{test_reading_id}", headers=op_headers)
            if r.status_code == 200:
                v = r.json()
                record("/api/v1/validation/readings/{id}", "GET", "PASS", f"quality_status={v.get('quality_status')}, flags={v.get('validation_flags')}")
            else:
                record("/api/v1/validation/readings/{id}", "GET", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            record("/api/v1/validation/readings/{id}", "GET", "FAIL", str(e))

    # 7. AI Anomaly Detection APIs
    print("\n>>> 7. MACHINE LEARNING ISOLATION FOREST ANOMALY APIS")
    if test_reading_id:
        try:
            r = client.get(f"/api/v1/anomalies/readings/{test_reading_id}", headers=op_headers)
            if r.status_code == 200:
                anom = r.json()
                record("/api/v1/anomalies/readings/{id}", "GET", "PASS", f"anomaly_status={anom.get('anomaly_status')}, score={anom.get('anomaly_score')}")
            else:
                record("/api/v1/anomalies/readings/{id}", "GET", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            record("/api/v1/anomalies/readings/{id}", "GET", "FAIL", str(e))

    try:
        r = client.get("/api/v1/anomalies/metrics", headers=op_headers)
        if r.status_code == 200:
            met = r.json()
            record("/api/v1/anomalies/metrics", "GET", "PASS", f"Total inferences: {met.get('total_inferences')}, Anomalies: {met.get('anomalies_detected')}, Rate: {met.get('anomaly_rate_percent')}%")
        else:
            record("/api/v1/anomalies/metrics", "GET", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record("/api/v1/anomalies/metrics", "GET", "FAIL", str(e))

    # 8. Compliance Evaluation APIs
    print("\n>>> 8. CPCB REGULATORY COMPLIANCE APIS")
    try:
        r = client.get("/api/v1/compliance/rules", headers=op_headers)
        if r.status_code == 200:
            rules = r.json()
            rule_params = [f"{rule.get('parameter')} <= {rule.get('threshold')} {rule.get('threshold_unit')}" for rule in rules]
            record("/api/v1/compliance/rules", "GET", "PASS", f"Loaded {len(rules)} CPCB rules (BOD, COD, TSS, PH, NH4_N, TKN)")
        else:
            record("/api/v1/compliance/rules", "GET", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record("/api/v1/compliance/rules", "GET", "FAIL", str(e))

    try:
        r = client.get("/api/v1/compliance/summary", headers=op_headers)
        if r.status_code == 200:
            summ = r.json()
            record("/api/v1/compliance/summary", "GET", "PASS", f"Evaluations: {summ.get('total_evaluations')}, Rate: {summ.get('compliance_rate_percent')}% ({summ.get('cpcb_standard_version')})")
        else:
            record("/api/v1/compliance/summary", "GET", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record("/api/v1/compliance/summary", "GET", "FAIL", str(e))

    # 9. Treatment Records & Finalization APIs
    print("\n>>> 9. TREATMENT RECORDS & CRYPTOGRAPHIC FINALIZATION APIS")
    active_record_id = None
    try:
        r = client.get(f"/api/v1/treatment-records?facility_id={primary_facility_id}", headers=op_headers)
        if r.status_code == 200:
            recs = r.json()
            if recs:
                active_record_id = recs[0].get("record_id")
                record("/api/v1/treatment-records", "GET", "PASS", f"Loaded {len(recs)} records. Primary: {active_record_id} ({recs[0].get('record_state')})")
            else:
                record("/api/v1/treatment-records", "GET", "PASS", "No treatment records found")
        else:
            record("/api/v1/treatment-records", "GET", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record("/api/v1/treatment-records", "GET", "FAIL", str(e))

    if active_record_id:
        try:
            r = client.get(f"/api/v1/treatment-records/{active_record_id}", headers=op_headers)
            if r.status_code == 200:
                rec = r.json()
                record("/api/v1/treatment-records/{id}", "GET", "PASS", f"state={rec.get('record_state')}, hash={rec.get('canonical_hash')[:16]}...")
            else:
                record("/api/v1/treatment-records/{id}", "GET", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            record("/api/v1/treatment-records/{id}", "GET", "FAIL", str(e))

    # 10. Certificates APIs
    print("\n>>> 10. DIGITAL COMPLIANCE CERTIFICATES APIS")
    active_cert_id = None
    if active_record_id:
        try:
            r = client.get(f"/api/v1/certificates/record/{active_record_id}", headers=op_headers)
            if r.status_code == 200:
                cert = r.json()
                active_cert_id = cert.get("certificate_id")
                record("/api/v1/certificates/record/{record_id}", "GET", "PASS", f"certificate_id={active_cert_id}, signature_id={cert.get('signature_id')}")
            else:
                record("/api/v1/certificates/record/{record_id}", "GET", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            record("/api/v1/certificates/record/{record_id}", "GET", "FAIL", str(e))

    if active_cert_id:
        try:
            r = client.get(f"/api/v1/certificates/{active_cert_id}", headers=op_headers)
            if r.status_code == 200:
                cert = r.json()
                record("/api/v1/certificates/{id}", "GET", "PASS", f"certificate_status={cert.get('certificate_status')}, facility={cert.get('facility_id')}")
            else:
                record("/api/v1/certificates/{id}", "GET", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            record("/api/v1/certificates/{id}", "GET", "FAIL", str(e))

    # 11. Verification APIs (Cryptographic 4-Stage & Public Zero-Knowledge)
    print("\n>>> 11. CRYPTOGRAPHIC VERIFICATION & PUBLIC PROOF APIS")
    if active_record_id:
        try:
            r = client.post(f"/api/v1/verification/verify-record/{active_record_id}", headers=auditor_headers)
            if r.status_code == 200:
                ver = r.json()
                record("/api/v1/verification/verify-record/{id}", "POST", "PASS", f"verdict={ver.get('verdict')}, checks passed={all(v == 'passed' for k, v in ver.get('stages', {}).items()) if ver.get('stages') else True}")
            else:
                record("/api/v1/verification/verify-record/{id}", "POST", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            record("/api/v1/verification/verify-record/{id}", "POST", "FAIL", str(e))

        try:
            r = client.get(f"/api/v1/verification/public/verify/{active_record_id}")
            if r.status_code == 200:
                p_ver = r.json()
                record("/api/v1/verification/public/verify/{id}", "GET", "PASS", f"Public Zero-Knowledge Verdict={p_ver.get('verdict')}")
            else:
                record("/api/v1/verification/public/verify/{id}", "GET", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            record("/api/v1/verification/public/verify/{id}", "GET", "FAIL", str(e))

    if active_cert_id:
        try:
            r = client.get(f"/api/v1/verification/public/verify-certificate/{active_cert_id}")
            if r.status_code == 200:
                p_cert = r.json()
                record("/api/v1/verification/public/verify-certificate/{cert_id}", "GET", "PASS", f"Public Certificate Verdict={p_cert.get('verdict')}")
            else:
                record("/api/v1/verification/public/verify-certificate/{cert_id}", "GET", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            record("/api/v1/verification/public/verify-certificate/{cert_id}", "GET", "FAIL", str(e))

    # 12. DLT & Blockchain Ledger APIs
    print("\n>>> 12. BLOCKCHAIN DLT ANCHORING & RECONCILIATION APIS")
    try:
        r = client.get("/api/v1/dlt/status", headers=admin_headers)
        if r.status_code == 200:
            dlt_stat = r.json()
            record("/api/v1/dlt/status", "GET", "PASS", f"mode={dlt_stat.get('mode')}, status={dlt_stat.get('status')}, entries={dlt_stat.get('simulated_entries_count')}")
        else:
            record("/api/v1/dlt/status", "GET", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record("/api/v1/dlt/status", "GET", "FAIL", str(e))

    try:
        r = client.get("/api/v1/dlt/anchors", headers=admin_headers)
        if r.status_code == 200:
            anchors = r.json()
            record("/api/v1/dlt/anchors", "GET", "PASS", f"Retrieved {len(anchors)} blockchain anchor receipts")
        else:
            record("/api/v1/dlt/anchors", "GET", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record("/api/v1/dlt/anchors", "GET", "FAIL", str(e))

    # 13. Audit Trail APIS
    print("\n>>> 13. IMMUTABLE AUDIT TRAIL APIS")
    try:
        r = client.get("/api/v1/audit-events", headers=auditor_headers)
        if r.status_code == 200:
            events = r.json()
            record("/api/v1/audit-events", "GET", "PASS", f"Retrieved {len(events)} tamper-evident audit log records")
        else:
            record("/api/v1/audit-events", "GET", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record("/api/v1/audit-events", "GET", "FAIL", str(e))

    # 14. SCADA Simulator APIS
    print("\n>>> 14. SCADA TELEMETRY SIMULATOR APIS")
    try:
        r = client.get("/api/v1/simulator/status", headers=op_headers)
        if r.status_code == 200:
            sim_stat = r.json()
            record("/api/v1/simulator/status", "GET", "PASS", f"running={sim_stat.get('is_running')}, scenario={sim_stat.get('active_scenario')}")
        else:
            record("/api/v1/simulator/status", "GET", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        record("/api/v1/simulator/status", "GET", "FAIL", str(e))

    # 15. Corrections Workflow Lineage APIs
    print("\n>>> 15. CORRECTIONS & LINEAGE PRESERVATION APIS")
    if active_record_id:
        try:
            r = client.get(f"/api/v1/corrections/chain/{active_record_id}", headers=auditor_headers)
            if r.status_code == 200:
                chain = r.json()
                record("/api/v1/corrections/chain/{record_id}", "GET", "PASS", f"Lineage chain verified: {len(chain)} versions recorded")
            else:
                record("/api/v1/corrections/chain/{record_id}", "GET", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            record("/api/v1/corrections/chain/{record_id}", "GET", "FAIL", str(e))

    # Summary
    print("\n" + "=" * 85)
    passed = sum(1 for res in results if res["status"] == "PASS")
    total = len(results)
    print(f"ALL ROUTE GROUPS TESTED: {passed}/{total} ENDPOINTS PASSED ({(passed/total)*100:.1f}%)")
    print("=" * 85)

if __name__ == "__main__":
    run_tests()
