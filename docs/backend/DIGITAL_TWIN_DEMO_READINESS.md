# AquaTrustAI Digital Twin — Controlled Demonstration Readiness & Handoff Guide

**Document ID:** `HANDOFF-DEMO-2026-10-18`  
**Classification:** Operational Runbook, Demonstration Guide & Systems Architecture  
**Target Branch:** `royce` (HEAD Commit: `86010f7623dfba6839636251a0c4ec74a77989c3`)  
**Readiness Certification:** **`READY FOR CONTROLLED DEMONSTRATION`**  
**Date of Release:** October 18, 2026  

---

## 1. Verified Capabilities

The AquaTrustAI Digital Twin provides a fully integrated, stateful, virtual representation of decentralized Sewage Treatment Plants (STPs) with the following verified capabilities:

1. **Persistent Virtual Plant State:** Monotonically versioned state snapshots ($v=1, 2, 3\dots$) with immutable event sourcing (`twin_state_events`) and point-in-time state reconstruction.
2. **First-Principles Process Kinetics:** Five-stage mass-balance modeling (Inlet $\to$ Primary Clarifier $\to$ Aeration Basin $\to$ Secondary Clarifier $\to$ Final Effluent) featuring unified CSTR substrate removal and Monod DO-rate nitrification.
3. **Isolated What-If Scenario Sandbox:** Isolated simulation of operational perturbations (blower outages, hydraulic surges, coagulant overdosing, organic shock loads) from any frozen base state version, guaranteed never to mutate live state or compliance ledgers.
4. **Data Taxonomy & Provenance Tagging:** Strict separation of data origins (`observed`, `simulated`, `projected`, `hypothetical`) across all payloads and visualizations.
5. **Advisory Decision Support:** Kinetic rule-based recommendations with strict human-in-the-loop gating (`requires_human_approval = True`). Autonomous SCADA actuator actuation is strictly prohibited.
6. **Water Reuse & Sustainability Accounting:** Non-potable reuse gating against CPCB standards (BOD $\le 10$ mg/L, TSS $\le 10$ mg/L, pH 6.5–8.5) and annual municipal freshwater displacement accounting.
7. **Role-Based Access Control:** Strict server-side RBAC distinguishing operators, admins, auditors, and regulators with facility-level boundary scoping.
8. **Scalable Computational Performance:** Verified local throughput $> 300$ obs/s with p95 update latency $< 4$ ms across up to 500 virtual STPs.

---

## 2. Startup Prerequisites & Local Launch Runbook

### 2.1 Environment Prerequisites
- **Python:** 3.11+ (verified on 3.13.0) with active virtual environment in `backend/.venv`
- **Node.js:** v18+ (verified on v22.14.0, npm 10.9.2) in `frontend/`
- **Operating System:** Windows, Linux, or macOS

### 2.2 Backend Startup
From the repository root (`d:\AquaTrustAI`):

```powershell
# 1. Activate backend virtual environment
.\backend\.venv\Scripts\Activate.ps1

# 2. Launch FastAPI via Uvicorn (default port: 8000)
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

*Swagger / OpenAPI Documentation:* Available at `http://localhost:8000/docs`.

### 2.3 Frontend Startup
In a separate terminal:

```powershell
# Navigate to frontend and launch Vite dev server
cd d:\AquaTrustAI\frontend
npm run dev
```

*Dashboard URL:* Available at `http://localhost:5173`.

---

## 3. Demonstration Walkthrough Steps

### Step 1: Submit a Valid Telemetry Reading (Live Ingestion)

Submit a valid effluent telemetry reading via HTTP POST to trigger a virtual state update:

```bash
# Generate operator JWT token or use test auth header
POST /api/v1/ingestion/telemetry
Content-Type: application/json
Authorization: Bearer <OPERATOR_JWT_TOKEN>

{
  "facility_id": "bb1848df-b447-4dbe-90bf-ecd1c17fa92c",
  "sensor_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "parameter": "BOD",
  "treatment_stage": "final_effluent",
  "value": 18.5,
  "unit": "mg/L",
  "observed_at": "2026-10-18T10:00:00Z",
  "source": "telemetry"
}
```

*Expected Result:*
- The ingestion pipeline validates the reading (`ValidationResult: quality_status="valid"`).
- `StateUpdater` ingests the reading, increments `state_version` from $v \to v+1$, recalculates stage kinetics, and logs an `observation_applied` event.

---

### Step 2: Inspect Virtual Plant State & Kinetic Stages

Retrieve the current live virtual state snapshot:

```bash
GET /api/v1/facilities/bb1848df-b447-4dbe-90bf-ecd1c17fa92c/twin
Authorization: Bearer <OPERATOR_JWT_TOKEN>
```

*Key Fields to Inspect:*
- `state_version`: Monotonically incremented integer.
- `state_freshness`: `"fresh"` (if reading is within 2 hours).
- `stage_states`: Detailed parameter breakdown across all 5 stages (`inlet`, `primary_clarifier`, `biological_aeration`, `secondary_clarifier`, `final_effluent`).
- `latest_observations`: Dictionary containing only accepted valid observations tagged with `data_origin="observed"`.

---

### Step 3: Run an Isolated What-If Scenario

Simulate an operational disruption (e.g. aeration blower failure with 75% DO drop):

```bash
POST /api/v1/facilities/bb1848df-b447-4dbe-90bf-ecd1c17fa92c/twin/scenarios
Content-Type: application/json
Authorization: Bearer <OPERATOR_JWT_TOKEN>

{
  "scenario_type": "aeration_failure",
  "scenario_name": "Aeration Blower Outage (DO -75%)",
  "duration_minutes": 120,
  "time_step_seconds": 900,
  "parameters": {
    "do_reduction_percent": 75.0
  },
  "seed": 42
}
```

*Verification of Scenario Isolation:*
1. Returns HTTP 201 with `status: "completed"`.
2. Inspect `results`: Every step contains `baseline_value`, `scenario_value`, and `data_origin: "hypothetical"`.
3. In `DigitalTwinPage.tsx` under the **What-If Scenarios** tab, Recharts renders a green solid baseline curve alongside an amber dashed scenario curve, demonstrating elevated effluent BOD crossing regulatory thresholds.
4. Re-querying `GET /twin` confirms `state_version` is **unmodified**, proving complete isolation from live state.

---

### Step 4: Inspect Steady-State Effluent Projections & Safe Reuse Gating

1. **Effluent Projection:** Query `GET /twin/predictions` to inspect steady-state kinetic estimates with 95% empirical holdout uncertainty bounds ($\pm 1.96 \times \text{RMSE}$).
2. **Safe Reuse Gate:** Query `GET /twin/sustainability` to inspect non-potable reuse eligibility:
   - Returns `"safe_reuse_gate": "PASSED"` if effluent BOD $\le 10$ mg/L, TSS $\le 10$ mg/L, and data quality is valid.
   - Returns `"safe_reuse_gate": "HELD"` with specific explanatory failure reasons if any parameter exceeds safe limits.

---

## 4. Resilience & Edge-Case Behavior

| Test Condition | Input Telemetry | Expected System Behavior | Verified Audit Evidence |
| :--- | :--- | :--- | :--- |
| **Invalid Measurement** | BOD = -99 mg/L or out-of-bounds sensor reading (`quality_status="invalid"`) | Increments state version to record `observation_rejected` audit event; **never** overwrites accepted observation. State `data_quality` becomes `"invalid"`. | `test_invalid_measurement_non_overwrite_invariant` |
| **Missing Parameters** | Standalone pH reading without influent BOD/TSS | Ingests pH reading; preserves prior stage states without fabricating synthetic default concentrations. | `test_state_update_missing_mandatory_influent_parameters_retains_prior_stages` |
| **Duplicate Packet** | Re-submitting identical `reading_id` | Idempotent no-op; returns existing state snapshot with unchanged `state_version`. | `test_idempotency_duplicate_reading` |
| **Delayed Packet** | Telemetry timestamped $t_0 - 20$ min arriving after $t_0$ | Increments state version monotonically; `observed_at` clock remains at $\max(t_{latest}, t_{reading})$, preventing backward clock regression. | `test_out_of_order_and_delayed_observation` |
| **Unauthorized Facility** | Operator assigned to Facility A requesting Facility B | Returns HTTP 403 Forbidden with `Cross-facility access denied` error message. | `test_scenario_rejected_input_and_facility_isolation_workflow` |
| **Malformed Scenario** | Scenario duration < 15 minutes | Returns HTTP 422 Unprocessable Entity with Pydantic constraint validation details. | `test_scenario_rejected_input_and_facility_isolation_workflow` |

---

## 5. Explicit Data Taxonomy & Operational Boundaries

To protect data trust and legal compliance, AquaTrustAI strictly tags all data:

- **`[OBSERVED]`**: Physical measurements originating from validated sensor telemetry or certified laboratory analysis.
- **`[SIMULATED]`**: Cold-start initial conditions or process kinetics evaluated within the live virtual state machine.
- **`[PROJECTED]`**: Steady-state kinetic estimations derived from current influent telemetry with empirical holdout confidence intervals ($\pm 1.96 \text{ RMSE}$).
- **`[HYPOTHETICAL]`**: Isolated what-if scenario perturbation outputs. Strictly barred from becoming compliance evidence or blockchain anchors.

---

## 6. Infrastructure Status & Operating Disclaimers

1. **PostgreSQL Database Status:**
   - **Status:** **INACTIVE LOCALLY** (Port 5432 closed).
   - **Operating Mode:** Automated test suites and local demonstrations run against SQLite in-memory (`StaticPool`).
   - **Production Requirement:** A live PostgreSQL 15+ instance with connection pooling (e.g. PgBouncer) must be provisioned for multi-user pilot deployments.

2. **Hyperledger Fabric DLT Status:**
   - **Status:** **INACTIVE LOCALLY** (Docker daemon not running).
   - **Operating Mode:** The application employs [`MockFabricGateway`](file:///d:/AquaTrustAI/backend/app/services/dlt_service.py) with disk-backed state reloading. Cryptographic hashing and signing are active; live Raft orderer block commitment is bypassed.
   - **Production Requirement:** Deploy live Fabric 2.5+ test network with active channels and chaincode before pilot certification.

3. **Process Kinetics Scope:**
   - The five-stage process engine employs nominal mass-balance and CSTR kinetics suitable for demonstration, operational training, and qualitative perturbation analysis.
   - It is **not** an independently calibrated CFD or dynamic biological twin (e.g. ASM2d). Calibrating site-specific kinetic constants ($k_{bod}$, $\theta$, settling velocity) against physical facility tracer tests is required before closed-loop control or binding contractual performance guarantees.

---

## 7. Known Failure Modes & Recovery Instructions

| Failure Symptom | Probable Cause | Recovery Action |
| :--- | :--- | :--- |
| **Frontend displays "Telemetry Stale"** | No readings ingested in > 2 hours | Ingest a new telemetry reading via `/api/v1/ingestion/telemetry` or trigger the simulator. |
| **Prediction displays "Insufficient Data"** | Incomplete mandatory influent parameters (`BOD`, `COD`, `TSS`, `pH`) | Submit readings for all 4 mandatory parameters to ungate the kinetic projection engine. |
| **HTTP 403 on Scenario Execution** | Logged-in user has `auditor` or `regulatory_stakeholder` role | Authenticate as a user with `operator` or `admin` role. |
| **HTTP 403 on Facility Access** | Operator JWT token is scoped to a different `facility_id` | Switch selected facility in JWT token or use an unconstrained `admin` token. |
| **React Error on Dashboard Load** | Network disconnect or expired authentication token | Log out, refresh browser, and re-authenticate via the login screen. |
