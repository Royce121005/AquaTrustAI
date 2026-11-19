# AquaTrustAI — QA Execution Evidence (Phase 3 Audited)

**Document Version:** 3.0.0  
**Audit Date:** November 19, 2026  
**Auditor:** Principal QA Architect  
**Evidence Source:** Live Terminal Invocations on Active Codebase (`main` commit `d1265a935ce4def896740f2eaadfda466f059929`)  
**Target Database:** PostgreSQL 17 on `localhost:5432` (`aquatrust_db`) + In-Memory SQLite Test Fixtures

---

## 1. Environment & Database Migration 004 Verification Evidence

```powershell
# 1. PostgreSQL Connection Verification
Test-NetConnection -ComputerName localhost -Port 5432
ComputerName     : localhost
RemoteAddress    : ::1
RemotePort       : 5432
InterfaceAlias   : Loopback Pseudo-Interface 1
SourceAddress    : ::1
TcpTestSucceeded : True

# 2. Database Schema Migration Upgrade to Revision 004
cd backend
alembic upgrade head
# [INFO] Context impl PostgresqlImpl.
# [INFO] Will assume transactional DDL.
# [INFO] Running upgrade 003_member2_intelligence_schema -> 004_readings_natural_key_lineage
# [INFO] Migration 004 applied successfully: uq_readings_natural_key updated to 5 columns.
# Exit Code: 0

# 3. Alembic Offline Static SQL Generation Test
python -m alembic -c alembic.ini upgrade head --sql
# [INFO] Context impl PostgresqlImpl.
# [INFO] Generating static SQL
# [INFO] Running upgrade 003_member2_intelligence_schema -> 004_readings_natural_key_lineage
# ALTER TABLE readings DROP CONSTRAINT uq_readings_natural_key;
# ALTER TABLE readings ADD CONSTRAINT uq_readings_natural_key UNIQUE (facility_id, parameter, treatment_stage, observed_at, source);
# CREATE INDEX ix_readings_dedup_lookup ON readings (facility_id, parameter, treatment_stage, observed_at, source);
# Exit Code: 0

# 4. Fresh Database Installation & Pre-Migration Duplicate Check Test Suite
python -m pytest backend/tests/test_alembic_migration_004.py -v
# backend\tests\test_alembic_migration_004.py::test_fresh_database_installation_to_head PASSED [ 25%]
# backend\tests\test_alembic_migration_004.py::test_downgrade_and_upgrade_cycle PASSED [ 50%]
# backend\tests\test_alembic_migration_004.py::test_pre_migration_duplicate_detection PASSED [ 75%]
# backend\tests\test_alembic_migration_004.py::test_orm_model_consistency PASSED [100%]
# ======================== 4 passed, 4 warnings in 0.82s ========================
```

---

## 2. Compliance Rule Statutory Audit Evidence

```python
# Querying PostgreSQL compliance_rules table:
Found 6 default rules:
- BOD <= 30.0 mg/L | Statutory: EPA 1986 Sched VI GSR 422(E) | Verification: UNVERIFIED_CLAIMED_2021_DATE
- COD <= 250.0 mg/L | Statutory: EPA 1986 Sched VI GSR 422(E) | Verification: UNVERIFIED_CLAIMED_2021_DATE
- TSS <= 50.0 mg/L | Statutory: MoEFCC GSR 1265(E) (2017) | Verification: UNVERIFIED_CLAIMED_2021_DATE
- PH between 5.5 and 9.0 | Statutory: EPA 1986 Sched VI GSR 422(E) | Verification: UNVERIFIED_CLAIMED_2021_DATE
- NH4_N <= 50.0 mg/L | Statutory: EPA 1986 Sched VI GSR 422(E) | Verification: UNVERIFIED_CLAIMED_2021_DATE
- TKN <= 10.0 mg/L | Statutory: Conflated (Sched VI vs GSR 1265) | Verification: UNVERIFIED_CLAIMED_2021_DATE

# Running statutory provenance verification test suite:
python -m pytest backend/tests/test_compliance_rule_provenance.py -v
# backend\tests\test_compliance_rule_provenance.py::test_default_cpcb_rules_provenance_and_unverified_flag PASSED [ 33%]
# backend\tests\test_compliance_rule_provenance.py::test_compliance_evaluation_historical_and_current PASSED [ 66%]
# backend\tests\test_compliance_rule_provenance.py::test_api_compliance_rules_endpoint PASSED [100%]
# ======================== 3 passed, 4 warnings in 0.69s ========================
```

---

## 3. Mandatory Cross-Module Edge Cases Execution Log (`test_mandatory_e2e_edge_cases.py`)

```text
======================================================================
STARTING EXECUTION OF MANDATORY CROSS-MODULE EDGE CASES E2E-001 -> E2E-012
======================================================================

--- Running E2E-001: Out-of-order reading arrival ---
POST /api/v1/auth/login completed with status 200 in 614.17ms
POST /api/v1/ingestion/readings completed with status 201 in 702.09ms (Newer reading at t_newer)
POST /api/v1/ingestion/readings completed with status 201 in 43.74ms (Older reading arriving out of order)
E2E-001 PASS: Historical reading preserved in DB; virtual state clock did not regress (2026-11-19 18:12:38.948304+00:00)

--- Running E2E-002: Concurrent & sequential duplicate reading submissions ---
POST /api/v1/auth/login completed with status 200 in 326.99ms
[ThreadPoolExecutor - 5 Concurrent Submissions with identical natural key and Idempotency-Key]
POST /api/v1/ingestion/readings completed with status 201 in 134.79ms (Worker 1 - inserted record)
POST /api/v1/ingestion/readings completed with status 201 in 172.43ms (Worker 2 - deduplicated)
POST /api/v1/ingestion/readings completed with status 201 in 171.62ms (Worker 3 - deduplicated)
POST /api/v1/ingestion/readings completed with status 201 in 171.62ms (Worker 4 - deduplicated)
POST /api/v1/ingestion/readings completed with status 201 in 171.62ms (Worker 5 - deduplicated)
[Sequential Retry]
POST /api/v1/ingestion/readings completed with status 201 in 15.20ms
E2E-002 PASS: 5 concurrent + 1 sequential duplicate submissions deduplicated to single canonical reading_id (DB count: 1)

--- Running E2E-003: Unit normalization and dimension validation ---
E2E-003 PASS: Valid units normalized, incompatible dimensions rejected, and boundaries verified.
- norm_ppm (25.0 ppm -> mg/L): Decimal('25.0') [PASS]
- norm_gl (0.025 g/L -> mg/L): Decimal('25.0') [PASS]
- norm_psi (invalid unit): None [PASS]
- norm_m3day (incompatible dimension): None [PASS]
- norm_zero (0.0 ppm): Decimal('0.0') [PASS]
- norm_negative (-5.0 ppm): Decimal('-5.0') [PASS]
- norm_extreme (1000000.0 ppm): Decimal('1000000.0') [PASS]

--- Running E2E-004: Database succeeds with Fabric unavailable / simulated ---
POST /api/v1/auth/login completed with status 200 in 331.05ms
GET /api/v1/dlt/status completed with status 200 in 12.01ms
[Controlled Failure Injection: Fabric gateway invoked while peer endpoint is offline]
Fabric anchor invocation returned: status='failed', tx_id=None, distributed_ledger=False
Operational TreatmentRecord verified committed and intact in PostgreSQL: 04d69e6a-df3d-48dd-a2f9-a1fae6c66d7b
E2E-004 PASS: DB operational commit succeeds; Fabric failure returns status='failed'.
             NOTE: Live Fabric verification is NOT TESTED (Host Docker daemon offline).

--- Running E2E-005: Fabric commit followed by API timeout failure-injection double ---
[Controlled Failure Injection Double: Fabric gateway successfully commits tx_id='fabric_tx_e2e005_mock_commit', API client times out]
POST /api/v1/dlt/anchors/b010d754-7355-4b1a-a6ef-99604bf4aab7/reconcile completed with status 200 in 23.31ms (reconciled=True)
POST /api/v1/dlt/anchors/b010d754-7355-4b1a-a6ef-99604bf4aab7/reconcile completed with status 200 in 13.00ms (Idempotent retry)
E2E-005 PASS: Reconcile recovered existing committed tx_id='fabric_tx_e2e005_mock_commit' with ZERO duplicate transactions created.
             NOTE: Live Fabric verification is NOT TESTED (Simulation Test Double).

--- Running E2E-006: Comprehensive correction lineage & concurrent authorization audit ---
POST /api/v1/auth/login completed with status 200 in 324.50ms (Operator)
POST /api/v1/auth/login completed with status 200 in 338.10ms (Auditor)
POST /api/v1/corrections/propose completed with status 201 (Proposal Alpha for BOD=22.0)
POST /api/v1/corrections/propose completed with status 201 (Proposal Beta for BOD=24.0 on SAME original reading)
[Concurrent Authorization Race via ThreadPoolExecutor]
POST /api/v1/corrections/{winner_id}/authorize completed with status 200 OK (Authorized superseding v2)
POST /api/v1/corrections/{loser_id}/authorize completed with status 400 Bad Request (Conflict: original record already superseded)
[Lineage Verification]
Original Reading timestamp preserved: observed_at matches exactly (0us shift)
Raw telemetry reading (source='telemetry') preserved intact
Corrected reading (source='correction') appended cleanly under new natural key
TreatmentRecord v1 -> superseded_by_correction; v2 -> finalized (supersedes_record_id = v1_id)
Cryptographic evidence v1 canonical hash preserved; v2 cryptographic artifact generated & signed
POST /api/v1/corrections/propose completed with status 201 (Proposal Gamma for v2 -> v3)
POST /api/v1/corrections/{gamma_id}/authorize completed with status 200 OK
Chain verification: total_versions=3, chain=[v1 (superseded), v2 (superseded), v3 (finalized)]
E2E-006 PASS: Competing proposals tested -> Concurrent authorization rejected competing proposal -> Database rollback verified -> Lineage v1->v2->v3 & cryptographic evidence consistent.

--- Running E2E-007: Missing compliance input handling ---
Compliance evaluation on empty readings list returned overall_status='pending', parameter_results={}
Missing mandatory parameters returned overall_status='pending'
E2E-007 PASS: Missing/incomplete inputs return pending/insufficient_data, never compliant.

--- Running E2E-008: Simulation paused prevents false updates ---
POST /api/v1/twin/simulation/start completed with status 200
[Advanced 3 ticks: tick=3]
POST /api/v1/twin/simulation/pause completed with status 200
[Verified tick count halted at 3 across 0.5s pause window]
POST /api/v1/twin/simulation/start completed with status 200 (Resumed to tick 4)
E2E-008 PASS: Paused simulation halts state advancement; state clock freezes until resumed.

--- Running E2E-009: Facility isolation and cross-facility denial ---
POST /api/v1/auth/login completed with status 200 (Operator scoped to FAC-CPCB-001)
GET /api/v1/facilities/13000000-0000-0000-0000-000000000014/twin completed with status 403 Forbidden
GET /api/v1/facilities/13000000-0000-0000-0000-000000000014/twin/config completed with status 403 Forbidden
POST /api/v1/facilities/13000000-0000-0000-0000-000000000014/twin/scenarios completed with status 403 Forbidden
E2E-009 PASS: Cross-facility boundary enforced across /twin, /config, /scenarios. All rejected with 403.

--- Running E2E-010: AI Anomaly model failure and graceful fallback ---
[Anomaly inference invoked with invalid parameter 'UNSUPPORTED_PARAMETER_XYZ']
Engine raised UnsupportedParameterError
API returned status='insufficient_data', anomaly_flags=['UNSUPPORTED_PARAMETER']
E2E-010 PASS: Unsupported/failed ML inference returns insufficient_data with error metadata. Never silent normal.

--- Running E2E-011: Actual browser refresh and UI recovery ---
POST /api/v1/twin/scenarios completed with status 201 (Created scenario 6be008e3-e66a-4323-8558-6f1e80ee9cd5)
GET /api/v1/twin/scenarios/6be008e3-e66a-4323-8558-6f1e80ee9cd5 completed with status 200 OK (Parameters preserved)
Frontend Vitest UI test verified: scenario recovered via URL query params (?tab=scenarios&scenarioId=...)
Frontend Vitest UI test verified: running/incomplete scenario truthfully displays in-progress banner and suppresses compliance verdicts.
E2E-011 PASS: Scenario 6be008e3-e66a-4323-8558-6f1e80ee9cd5 verified persisted, recovered across reloads, and parameters preserved.
             Frontend Vitest UI lifecycle test verified in frontend/src/test/scenario_recovery.test.tsx.

--- Running E2E-012: Concurrent asset update conflict detection (Optimistic Lock) ---
POST /api/v1/auth/login completed with status 200
GET /api/v1/facilities/04d69e6a-df3d-48dd-a2f9-a1fae6c66d7b/twin/config completed with status 200 (Version 10)
[Concurrent PUT race on twin config version 10 via ThreadPoolExecutor]
PUT /api/v1/facilities/.../twin/config completed with status 200 OK (Thread A committed version 11)
PUT /api/v1/facilities/.../twin/config completed with status 409 Conflict (Thread B rejected)
GET /api/v1/facilities/.../twin/config completed with status 200 (Current version is monotonically 11)
E2E-012 PASS: Optimistic concurrency control rejected concurrent race with 409 Conflict. Version monotonic.

======================================================================
ALL 12 MANDATORY CROSS-MODULE EDGE CASES EXECUTED AND PASSED!
======================================================================
Exit Code: 0
```

---

## 4. Final Regression Test Suite Execution Logs

### Suite 1: ML & Dataset Validation Suite
- **Exact Command:** `python -m pytest datasets/tests/ -v > docs/qa/raw_suite_1_datasets_ml.txt 2>&1`
- **Actual Exit Code:** `0`
- **Number of Collected Tests:** `78`
- **Passed:** `78`
- **Failed:** `0`
- **Skipped:** `0`
- **Warnings:** `6` (Pydantic / pytest-asyncio deprecation notices)
- **Duration:** `65.90s` (0:01:05)
- **Raw Output Archive:** [`docs/qa/raw_suite_1_datasets_ml.txt`](file:///d:/AquaTrustAI/docs/qa/raw_suite_1_datasets_ml.txt)

### Suite 2: Backend Unit & Integration Suite
- **Exact Command:** `python -m pytest backend/tests/ -v > docs/qa/raw_suite_2_backend.txt 2>&1`
- **Actual Exit Code:** `0`
- **Number of Collected Tests:** `196`
- **Passed:** `196`
- **Failed:** `0`
- **Skipped:** `0`
- **Warnings:** `10`
- **Duration:** `121.87s` (0:02:01)
- **Raw Output Archive:** [`docs/qa/raw_suite_2_backend.txt`](file:///d:/AquaTrustAI/docs/qa/raw_suite_2_backend.txt)

### Suite 3: Mandatory Cross-Module Edge Cases Suite
- **Exact Command:** `python test_mandatory_e2e_edge_cases.py > docs/qa/raw_suite_3_edge_cases.txt 2>&1`
- **Actual Exit Code:** `0`
- **Number of Collected Tests:** `12`
- **Passed:** `12`
- **Failed:** `0`
- **Skipped:** `0`
- **Warnings:** `1` (Starlette testclient deprecation notice)
- **Duration:** `9.20s`
- **Raw Output Archive:** [`docs/qa/raw_suite_3_edge_cases.txt`](file:///d:/AquaTrustAI/docs/qa/raw_suite_3_edge_cases.txt)

### Suite 4: Frontend Unit & UI Recovery Suite
- **Exact Command:** `npm --prefix frontend test -- --run > docs/qa/raw_suite_4_frontend_vitest.txt 2>&1`
- **Actual Exit Code:** `0`
- **Number of Collected Test Files:** `2`
- **Number of Collected Tests:** `37`
- **Passed:** `37`
- **Failed:** `0`
- **Skipped:** `0`
- **Warnings:** `2` (React Router v7 future flag warnings)
- **Duration:** `9.06s`
- **Raw Output Archive:** [`docs/qa/raw_suite_4_frontend_vitest.txt`](file:///d:/AquaTrustAI/docs/qa/raw_suite_4_frontend_vitest.txt)

### Suite 5: Frontend Production Build Verification (Deployment Check)
- **Exact Command:** `npm --prefix frontend run build > docs/qa/raw_suite_5_frontend_build.txt 2>&1`
- **Actual Exit Code:** `0`
- **Modules Transformed:** `2,329`
- **Build Output:** `dist/index.html` (0.91 kB), `dist/assets/index--MSl3BZE.css` (68.34 kB), `dist/assets/index-DNA3yBfD.js` (1,085.09 kB)
- **Duration:** `11.20s`
- **Raw Output Archive:** [`docs/qa/raw_suite_5_frontend_build.txt`](file:///d:/AquaTrustAI/docs/qa/raw_suite_5_frontend_build.txt)
- **Note:** Counted as deployment build verification, not as a unit test case per QA specification.
