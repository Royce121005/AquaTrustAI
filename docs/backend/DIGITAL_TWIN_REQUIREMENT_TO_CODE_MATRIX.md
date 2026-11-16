# AquaTrust AI — Digital Twin Requirement-to-Code Matrix & Implementation Plan

**Author:** Royce (Senior Backend Engineer & Digital Twin Implementation Owner, Member 2)  
**Date:** 2026-10-17  
**Branch:** `royce`  
**Starting Commit:** `86010f7 fix(dlt): auto-reload ledger state from disk on query_batch and verify_batch_leaf`  

---

## 1. Phase 0: Requirement-to-Code Audit Matrix

Classifications:
- **COMPLETE**: Implemented, verified by automated tests, compliant with specifications.
- **PARTIAL**: Implemented in part or requires extension for digital twin requirements.
- **MISSING**: Not present in existing codebase.
- **INCORRECT**: Implementation violates specification or fails contract.
- **INCONSISTENT**: Contradiction between tests, schemas, or service layers.
- **BLOCKED**: Implementation blocked on external evidence, datasets, or dependencies.
- **NOT_REQUIRED**: Out of scope per frozen project specifications.

| Requirement ID | Requirement Description | Status | Evidence / File Path | Implementation Plan Action |
|---|---|---|---|---|
| **REQ-SIM-01** | Multi-STP synthetic telemetry generation with diurnal cycles & AR(1) | **COMPLETE** | `backend/app/simulator/engine.py`, `profile_loader.py` | **KEEP**: Reused directly for scenario input & simulation mode. |
| **REQ-VAL-01** | Deterministic pre-AI data validation (bounds, units, rate of change, timestamps) | **COMPLETE** | `backend/app/services/validation_service.py`, `models/validation_result.py` | **KEEP**: Reused as gating check before updating virtual twin state. |
| **REQ-AI-01** | Isolation Forest statistical anomaly detection across 6 canonical parameters | **COMPLETE** | `backend/app/services/anomaly_service.py`, `ml/inference/engine.py` | **KEEP**: Reused directly; anomaly score/status persisted with twin state. |
| **REQ-CMP-01** | CPCB discharge standard compliance evaluation | **COMPLETE** | `backend/app/services/compliance_service.py`, `models/compliance_rule.py` | **MODIFY**: Scoped mandatory parameters (`BOD, COD, TSS, PH, NH4_N`) vs optional active rules (`TKN`) to prevent pending deadlocks. |
| **REQ-REC-01** | Treatment record window aggregation & finalization gate | **COMPLETE** | `backend/app/services/treatment_service.py`, `models/treatment_record.py` | **KEEP**: Immutable finalized evidence protected from twin scenario mutation. |
| **REQ-CRY-01** | SHA-256 canonicalization, ECDSA P-256 signing, independent verification | **COMPLETE** | `backend/app/services/verifier_service.py`, `models/signing_key.py` | **KEEP**: Reused for anchoring formal twin state snapshots. |
| **REQ-DLT-01** | Hyperledger Fabric anchoring with local simulation fallback | **COMPLETE** | `backend/app/models/dlt_anchor.py`, `dlt/` | **KEEP**: Reused; twin scenarios explicitly prohibited from creating ledger anchors. |
| **REQ-SEC-01** | Authentication, JWT, and Server-Side RBAC (Operator, Admin, Auditor, Regulator) | **COMPLETE** | `backend/app/core/security.py`, `rate_limit.py`, `models/user.py` | **MODIFY**: Added `RateLimiter` class wrapper; restricted `/compliance/evaluate` to Auditor/Regulator/Admin. |
| **REQ-ST-01** | Persistent virtual STP state per facility with monotonic state versioning | **MISSING** | None (`backend/app/digital_twin/state.py` to be created) | **ADD**: Implement `TwinState`, `TwinStateEvent`, `TwinConfiguration` ORM models and repository. |
| **REQ-ST-02** | Observation-to-state synchronisation with idempotency and row-level locking | **MISSING** | `backend/app/api/v1/ingestion.py` lacks twin trigger | **ADD**: Implement `StateUpdater` service called from ingestion & simulator bridge. |
| **REQ-ST-03** | Explicit handling of invalid, duplicate, stale, and out-of-order observations | **MISSING** | None | **ADD**: Non-overwrite invariant: retain accepted values, flag data quality, record rejection events. |
| **REQ-ST-04** | State reconstruction from persisted event history or verified snapshot | **MISSING** | None | **ADD**: Implement event-replay state reconstruction in `StateRepository`. |
| **REQ-DAT-01** | Data origin taxonomy: observed vs. simulated vs. predicted vs. hypothetical | **PARTIAL** | `Reading.source` has "telemetry"/"simulated", but no "predicted" or "hypothetical" | **ADD**: Canonical provenance and source labeling across all twin schemas and results. |
| **REQ-MOD-01** | Treatment-process model across configured stages (Inlet -> Primary -> Bio -> Sec -> Effluent) | **MISSING** | None (`backend/app/digital_twin/process_model.py` to be created) | **ADD**: Implement documented mass-balance, Monod/CSTR kinetics, clarifier separation, and pH buffering. |
| **REQ-MOD-02** | Model configuration hashing, versioning, parameter boundaries, numerical stability | **MISSING** | None | **ADD**: SHA-256 model config hashing, strict positive clipping, zero-division safeguards. |
| **REQ-MOD-03** | Missing-input handling returning explicit `insufficient_data` status | **MISSING** | None | **ADD**: Return `insufficient_data` status when required influent parameters are unavailable. |
| **REQ-SCN-01** | Isolated what-if scenario execution from versioned base state | **MISSING** | None (`backend/app/digital_twin/scenario_engine.py` to be created) | **ADD**: Implement `ScenarioEngine` with deep-copied state and zero mutation of live records. |
| **REQ-SCN-02** | Supported scenario types: shock load, sensor drift, stuck sensor, DO drop, storm dilution | **MISSING** | `backend/app/simulator/anomalies.py` has recipes, but no what-if engine | **ADD**: Bridge simulator recipes into scenario engine with customizable horizon and parameters. |
| **REQ-SCN-03** | Scenario reproducibility via deterministic random seed | **MISSING** | None | **ADD**: Seed-controlled stochastic perturbations in scenario engine. |
| **REQ-PRD-01** | Water quality prediction model evaluated on held-out paired observations | **BLOCKED** | UCI dataset contains paired influent/effluent, but needs formal evaluation harness | **ADD**: Baseline predictor evaluated on UCI data with temporal hold-out; return `insufficient_data` if missing. |
| **REQ-REC-02** | Advisory operational recommendations with human-review requirement | **MISSING** | None | **ADD**: Rule-governed advisory service with strict prohibition on autonomous actuator control. |
| **REQ-SUS-01** | Sustainability and water reuse accounting metrics (volume reused, displacement) | **MISSING** | None | **ADD**: Compute reuse volume and freshwater substitution when measured/simulated flow is present. |
| **REQ-API-01** | Versioned FastAPI REST router for twin state, history, scenarios, and configs | **MISSING** | None (`backend/app/api/v1/digital_twin.py` to be created) | **ADD**: Implement 11 versioned endpoints with typed Pydantic contracts and OpenAPI specs. |
| **REQ-SEC-02** | Server-side RBAC and facility-scoping enforcement for twin endpoints | **MISSING** | None | **ADD**: Role guards (`require_role`), facility scoping checks, and audit logging of mutations. |
| **REQ-PRF-01** | Performance benchmarks at 8, 50, 100, and 500 STPs | **MISSING** | None | **ADD**: Automated benchmark runner measuring state-update throughput, scenario latency, memory/CPU. |
| **REQ-DOC-01** | Complete frontend integration handoff documentation & contracts | **MISSING** | None | **ADD**: Comprehensive frontend handoff package with request/response examples and error states. |

---

## 2. Phase 1: Current-State Implementation Plan

### 2.1 Action Classifications (KEEP / MODIFY / ADD / REPLACE / NOT_REQUIRED)

1. **KEEP**:
   - `backend/app/simulator/engine.py`, `profile_loader.py`, `anomalies.py`, `schemas.py`: Retained as the synthetic stream generator.
   - `backend/app/services/validation_service.py`: Retained as the deterministic validation layer.
   - `backend/app/services/anomaly_service.py` & `ml/inference/engine.py`: Retained as the statistical anomaly inference engine.
   - `backend/app/services/treatment_service.py` & `certificate_service.py`: Retained for finalization and certificate generation.
   - `backend/app/services/verifier_service.py`: Retained for SHA-256 and ECDSA cryptographic verification.
   - `backend/app/models/`: All existing ORM models (`Facility`, `Sensor`, `Reading`, `TreatmentRecord`, `Certificate`, `DLTAnchor`, `User`, `AuditLog`, `ComplianceRule`, `ComplianceResult`).

2. **MODIFY**:
   - `backend/app/api/v1/compliance.py`: Corrected RBAC dependencies to require Auditor, Regulatory Stakeholder, or Admin.
   - `backend/app/core/rate_limit.py`: Added `RateLimiter` class wrapper with configurable sliding window and test compatibility.
   - `backend/app/services/compliance_service.py`: Corrected mandatory vs. optional active rule parameters to prevent TKN deadlocks.
   - `backend/app/api/v1/ingestion.py`: Integrate twin state updater upon successful reading validation.
   - `backend/app/services/simulator_service.py`: Trigger twin state updates during background simulation loop.
   - `backend/app/api/router.py`: Register the new `/api/v1/twin` router.
   - `backend/app/models/__init__.py`: Export new digital twin SQLAlchemy models so SQLite and PostgreSQL test runners create tables.

3. **ADD**:
   - `backend/app/models/digital_twin.py`: SQLAlchemy models for `TwinConfiguration`, `TwinState`, `TwinStateEvent`, `TwinScenario`, `TwinScenarioResult`, `TwinModelVersion`, `TwinPrediction`, and `TwinRecommendation`.
   - `backend/app/digital_twin/`:
     - `__init__.py`
     - `schemas.py`: Pydantic request/response schemas with explicit `observed`, `simulated`, `predicted`, `hypothetical` labeling.
     - `state.py`: Virtual plant state representations, freshness calculation, data quality assessment.
     - `state_updater.py`: Idempotent state transitions, out-of-order observation handling, non-overwrite logic for invalid data.
     - `process_model.py`: Multi-stage wastewater treatment process engine (mass balances, biological degradation, clarification, pH buffering, configuration hashing).
     - `scenario_engine.py`: Isolated what-if scenario execution with fixed random seeding, comparative time series generation, and base-state immutability.
     - `prediction_service.py`: Evidence-gated water quality prediction on audited datasets with explicit `insufficient_data` fallback.
     - `recommendation_service.py`: Advisory operational decision support with human-review constraints.
     - `sustainability_service.py`: Water reuse volume and freshwater displacement accounting.
     - `repository.py`: Persistence access for state snapshots, event streams, and scenario outputs.
   - `backend/app/api/v1/digital_twin.py`: FastAPI endpoints for twin state, history, scenarios, and configuration.
   - `backend/tests/`:
     - `test_twin_state.py`: State creation, version increments, out-of-order, duplicates, stale/invalid data handling, reconstruction.
     - `test_process_model.py`: Mass balances, kinetic equations, parameter bounds, stability, configuration hashing.
     - `test_scenarios.py`: Scenario isolation, parameter validation, reproducibility with seed, comparative output.
     - `test_twin_api.py`: FastAPI endpoints, server-side RBAC, facility scoping, pagination, and error responses.
     - `test_twin_benchmarks.py`: Scalability benchmarks at 8, 50, 100, and 500 STPs.
   - `docs/backend/`:
     - `DIGITAL_TWIN_FRONTEND_HANDOFF.md`: Integration guide, API reference, schemas, and example payloads.
     - `DIGITAL_TWIN_BENCHMARK_REPORT.md`: Benchmark methodology, throughput, latency, and resource metrics.

4. **REPLACE**: None. No existing modules are discarded or duplicated.

5. **NOT_REQUIRED**:
   - Autonomous actuator control (pump/valve/aerator auto-tuning): Prohibited by safety rules.
   - Wholesale on-chain anchoring of transient twin state or scenarios: Prohibited by architecture freeze.
   - Black-box XGBoost / LSTM models without domain interpretability: Excluded by frozen project scope.
