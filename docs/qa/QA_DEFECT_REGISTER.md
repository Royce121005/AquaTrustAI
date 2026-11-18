# AquaTrustAI — QA Defect Register (Phase 2 Audited)

**Document Version:** 2.0.0  
**Audit Date:** November 16, 2026  
**Auditor:** Principal QA Architect & Systems Specialist  
**Repository Branch:** `main` (commit `d31f114`)  
**Target Environment:** Local PostgreSQL 17 + Python 3.10 + React Vite Frontend

---

## 1. Defect Summary Table

| Defect ID | Severity | Module / Component | Description | Root Cause | Status | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-001** | CRITICAL | Database / Migrations | Missing `twin_model_versions` table on fresh DB telemetry ingestion | Alembic migration `002_digital_twin_schema` not applied to PostgreSQL `aquatrust_db` | **RESOLVED & VERIFIED** | Tested live downgrade (`001`), upgrade (`head`), and idempotency; all 5 digital twin tables verified |
| **DEF-002** | HIGH | Compliance Engine | Historical compliance evaluation returned `pending` (0 rules active) | Default compliance rules had `effective_from` set to future timestamp (`18:45:35`) relative to test data (`12:45:35`) | **RESOLVED & VERIFIED** | Regulatory sourcing justified under CPCB EPA 1986 / 2021 Notification; rules anchored to `2021-01-01`; temporal evaluation tested |
| **DEF-003** | CRITICAL | Correction Lineage Service | Concurrency collision & timestamp distortion during correction authorization | Synthetic microsecond loop (`+1000us`) shifted observation times to evade `uq_readings_natural_key` | **RESOLVED & ARCHITECTED** | Schema updated with `source` in `uq_readings_natural_key`; microsecond loop removed; exact timestamp preserved; row-locking & multi-version lineage verified |
| **DEF-004** | MEDIUM | Test Infrastructure | Missing packages in test runtime (`psycopg2`, `fastapi`, `httpx`) | Test environment Python venv pointer broken to deleted Laragon path | **RESOLVED & VERIFIED** | System Python 3.10 configured and verified; all 177 backend and 49 ML tests execute cleanly |
| **DEF-005** | ARCHITECTURAL | DLT Gateway | Docker daemon offline; Hyperledger Fabric consensus unavailable | Host machine does not have Docker Desktop running | **DOCUMENTED** | DLT Gateway operates in RFC 6962 Merkle Tree Simulation Mode; live Fabric marked NOT TESTED |

---

## 2. Detailed Defect Reports and Remediation

### DEF-001: Unapplied Alembic Migration for Digital Twin Schema
- **Module:** `backend/app/digital_twin/` & `backend/alembic/`
- **Severity:** Critical
- **Symptoms:**
  During Phase 1/Phase 2 backend execution and ingestion of telemetry readings, the backend threw:
  ```
  psycopg2.errors.UndefinedTable: relation "twin_model_versions" does not exist
  ```
- **Root Cause Analysis:**
  While the Python code for Digital Twin (`app/digital_twin/`) and Alembic migration `002_digital_twin_schema.py` was authored in git, the PostgreSQL database `aquatrust_db` was initially only migrated to revision `001_initial_schema`.
- **Phase 2 Remediation & Idempotency Testing:**
  1. Tested full downgrade against live PostgreSQL 17:
     ```bash
     alembic downgrade 001_initial_schema
     ```
     *Result:* Exit code 0; digital twin tables successfully removed.
  2. Tested online upgrade:
     ```bash
     alembic upgrade head
     ```
     *Result:* Exit code 0; successfully created `twin_states`, `twin_configs`, `twin_scenarios`, `twin_model_versions`, `twin_recommendations`.
  3. Tested migration idempotency:
     ```bash
     alembic upgrade head
     ```
     *Result:* Exit code 0; no-op, schema untouched.
  4. Verified schema tables in PostgreSQL:
     ```sql
     SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'twin_%';
     ```
     *Result:* 5 tables confirmed present.
- **Safe Production Deployment Strategy:**
  - Automated CI migration gate: Run `alembic check` and dry-run upgrade against a staging PostgreSQL instance before container deployment.
  - Zero-downtime expand/contract pattern: Schema migrations are additive; columns are added as nullable/defaulted before application rollout.

---

### DEF-002: Compliance Rule Effective Date Invariant Discrepancy
- **Module:** `backend/app/services/compliance_service.py` & `compliance_rules` table
- **Severity:** High
- **Symptoms:**
  When evaluating compliance for historical records during treatment record finalization, the evaluation returned status `"pending"` with 0 evaluated rules, failing record finalization:
  ```
  Authorize correction failed: Finalization rejected: Compliance evaluation is 'pending'
  ```
- **Root Cause Analysis:**
  The `compliance_rules` table contains an invariant temporal filter:
  ```sql
  WHERE effective_from <= observation_timestamp AND (effective_to IS NULL OR effective_to >= observation_timestamp)
  ```
  In PostgreSQL, default regulatory rules had `effective_from = '2026-10-02 18:45:35'`, while sample readings had timestamps earlier in the day (`2026-10-02 12:45:35`), causing 0 rules to match.
- **Regulatory Sourcing & Legal Justification:**
  - Standard Source: Central Pollution Control Board (CPCB) General Standards for Discharge of Environmental Pollutants (Part A: Effluents), Schedule VI of the Environment (Protection) Rules, 1986 under the Environment (Protection) Act, 1986.
  - Amendment: CPCB 2021 Notification for Sewage Treatment Plants establishing stringent standards:
    - BOD $\le 30.0\text{ mg/L}$ (inland surface water) / $\le 10.0\text{ mg/L}$ (stringent metro STPs)
    - COD $\le 250.0\text{ mg/L}$
    - TSS $\le 100.0\text{ mg/L}$ (general) / $\le 50.0\text{ mg/L}$ (treated effluent)
    - pH between $5.5\text{ and }9.0$
    - NH4-N $\le 50.0\text{ mg/L}$
  - Legal Effective Date: `2021-01-01 00:00:00+00:00` represents the gazetted operationalization date of the revised norms across Indian Municipal Corporations.
- **Evaluation Semantics & Reproducibility:**
  - If observation timestamp falls within rule interval: Evaluated against that specific rule version.
  - If observation timestamp falls outside any active rule interval: System returns `status="pending"`, `insufficient_data`—never false compliance.
  - Historical records finalized under older rules maintain immutable hash integrity and cannot be silently re-evaluated against newer rules.

---

### DEF-003: Artificial Microsecond Timestamp Shift in Correction Lineage
- **Module:** `backend/app/services/correction_service.py`, `backend/app/models/reading.py`
- **Severity:** Critical
- **Symptoms:**
  The original implementation introduced an artificial timestamp distortion:
  ```python
  target_obs_at = existing.observed_at + timedelta(microseconds=1000)
  while db.query(Reading).filter(...):
      target_obs_at += timedelta(microseconds=1000)
  ```
  This artificially corrupted the physical observation timestamp of corrected water quality telemetry merely to avoid PostgreSQL uniqueness collisions on `uq_readings_natural_key`. Under concurrency, this loop was prone to race conditions.
- **Root Cause Analysis:**
  The PostgreSQL natural key constraint was originally defined as:
  `UNIQUE (facility_id, parameter, treatment_stage, observed_at)`
  Because `source` was missing from the constraint, a raw telemetry reading (`source="telemetry"`) and an append-only correction (`source="correction"`) could not share the exact same physical `observed_at` timestamp.
- **Phase 2 Remediation & Proper Correction Model:**
  1. Altered PostgreSQL Schema:
     ```sql
     ALTER TABLE readings DROP CONSTRAINT IF EXISTS uq_readings_natural_key;
     ALTER TABLE readings ADD CONSTRAINT uq_readings_natural_key UNIQUE (facility_id, parameter, treatment_stage, observed_at, source);
     ```
  2. Updated ORM Model in `backend/app/models/reading.py`:
     ```python
     UniqueConstraint("facility_id", "parameter", "treatment_stage", "observed_at", "source", name="uq_readings_natural_key")
     ```
  3. Eliminated Microsecond Loop in `backend/app/services/correction_service.py`:
     - Original raw observation timestamp is preserved 100% unaltered (`target_obs_at = existing.observed_at`).
     - Raw telemetry record is immutable: marked `quality_status = "suspect"`, original numeric value intact.
     - New append-only record tagged with `source = "correction"` (or `source = f"correction_v{ver}"`).
     - Added row-level pessimistic locking (`with_for_update()`) on `Correction` and `TreatmentRecord` to protect against concurrent duplicate authorization races.
     - Enforces state transition gates: `original_record.record_state = "superseded_by_correction"`, `new_record.record_version = original_record.record_version + 1`, `new_record.supersedes_record_id = original_record.record_id`.
- **Verification Evidence:**
  - Rebuilt `test_mandatory_e2e_edge_cases.py` (E2E-006):
    - Multi-version lineage verified across 3 generations ($v1 \to v2 \to v3$).
    - Exact timestamp equality asserted: `assert r_corr_v2.observed_at == r_raw.observed_at` passed.
    - Concurrency test: Two simultaneous threads attempted authorization $\to$ exactly one succeeded (200 OK), the other was rejected (400 Bad Request / "already authorized").
    - Role-based security: Unauthorized operator attempt rejected with HTTP 403 Forbidden.
  - `pytest backend/tests/test_dlt_gateway_corrections.py -v`: 11/11 tests passed.

---

### DEF-004: Python Test Environment Runtime Package Discrepancy
- **Module:** Infrastructure / Test Automation
- **Severity:** Medium
- **Status:** Resolved & Verified
- **Verification:** All 177 backend unit tests, 49 ML tests, and 12 E2E edge cases run with zero missing module errors on Python 3.10.

---

### DEF-005: Hyperledger Fabric Gateway Mode Distinction & Consensus Reality
- **Module:** `backend/app/services/dlt_service.py` & DLT Gateway
- **Severity:** Architectural Boundary
- **Description:**
  Docker is currently not running on the host machine. The DLT Gateway operates in RFC 6962 Merkle Tree Simulation Mode (`mode=SIMULATION`, `distributed_ledger=False`).
- **Consensus Clarification (CFT vs BFT):**
  - Production Hyperledger Fabric deployments using the Raft consensus library are **Crash Fault Tolerant (CFT)**, *not* Byzantine Fault Tolerant (BFT).
  - Raft tolerates node crashes and network partitions ($N \ge 2F + 1$), but does not tolerate arbitrary malicious or Byzantine node behavior without BFT-smart ordering plugins.
  - Previous claims in documentation stating "BFT consensus" have been corrected to accurately specify **Raft CFT consensus**.
- **Status & Recommendation:**
  - Live Hyperledger Fabric verification is marked **NOT TESTED** in accordance with non-negotiable QA rule #13.
  - Local simulation mode produces cryptographically valid RFC 6962 audit paths and digital certificates sufficient for Academic Demonstration and Controlled Pilots.
