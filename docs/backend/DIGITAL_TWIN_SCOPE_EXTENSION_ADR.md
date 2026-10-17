# AquaTrust AI — Architecture Decision Record (ADR)
## ADR-008: Digital Twin Engine Scope Extension

**Status:** APPROVED (Controlled Scope Extension to Architecture Freeze)  
**Date:** 2026-10-17  
**Author:** Royce (Senior Backend Engineer & Digital Twin Implementation Owner, Member 2)  
**Authority Hierarchy:**  
1. Current executable code, canonical schemas, and working service contracts.  
2. `ARCHITECTURE_FREEZE.md` and `DOCUMENT_VERSION_FREEZE.md`.  
3. `MASTER_PROJECT_SPECIFICATION.md` and related Master specifications.  
4. `AquaTrust_AI_Implementation_Plan.md`.  
5. `AquaTrustAI — Complete Digital Twin Implementation Blueprint`.  

---

### 1. Context and Problem Statement

The core AquaTrustAI architecture was frozen in `ARCHITECTURE_FREEZE.md` around a deterministic trust pipeline for decentralized Sewage Treatment Plants (STPs):
`Telemetry/Simulator -> Validation -> Isolation Forest Anomaly Detection -> Compliance Engine -> Finalized Treatment Records -> Digital Certificates -> SHA-256 -> ECDSA Signatures -> PostgreSQL -> Hyperledger Fabric Anchor -> Independent Verification`.

The frozen scope explicitly prohibited uncontrolled expansion into black-box XGBoost prediction and LSTM forecasting as core requirements to maintain auditability and avoid circular dependencies.

However, to provide comprehensive operational visibility and decision support, the project mandate introduces the **AquaTrustAI Digital Twin Engine**. The Digital Twin must provide a stateful, reproducible virtual representation of decentralized STPs, tracking plant operating states across configured treatment stages, computing transparent process-model estimates, executing isolated what-if scenarios, and providing evidence-gated advisory recommendations.

---

### 2. Decision and Scope Boundary

We implement the Digital Twin as a **domain capability and modular extension** residing in `backend/app/digital_twin/`, integrated with the existing backend services without violating frozen architectural invariants.

#### 2.1 Reused Components (Do Not Duplicate)
- **STP Runtime Simulator** (`backend/app/simulator/`): Reused as the source of stochastic synthetic telemetry and physical constraints.
- **Deterministic Validation Engine** (`backend/app/services/validation_service.py`): Reused as the mandatory gatekeeper for observation eligibility.
- **Isolation Forest Inference Engine** (`ml/inference/`, `backend/app/services/anomaly_service.py`): Reused for statistical anomaly detection across supported parameters (`BOD`, `COD`, `TSS`, `pH`, `NH4_N`, `TN`).
- **Compliance Engine** (`backend/app/services/compliance_service.py`): Reused for evaluating CPCB discharge standards against treatment records.
- **Treatment Record & Certificate Lifecycle** (`backend/app/services/treatment_service.py`, `certificate_service.py`): Reused for frozen evidence finalization.
- **Cryptographic & DLT Services** (`backend/app/services/verifier_service.py`, `backend/app/models/dlt_anchor.py`): Reused for SHA-256 hashing, ECDSA P-256 signing, and Fabric anchoring.
- **Authentication & RBAC** (`backend/app/core/security.py`, `models/user.py`): Reused for server-side role validation.

#### 2.2 New Capabilities Added
1. **Persistent Virtual Plant State (`TwinState`, `TwinStateEvent`, `TwinConfiguration`)**:
   - Monotonic per-facility `state_version`.
   - Treatment stage tracking (`inlet`, `primary_clarifier`, `biological_aeration`, `secondary_clarifier`, `final_effluent`).
   - Distinct observation tracking: latest accepted observation vs. latest received observation.
   - Explicit state freshness: `fresh`, `stale`, `expired`.
   - Explicit data quality: `valid`, `suspect`, `invalid`, `insufficient_data`.
   - Transactionally safe, idempotent state transitions.
   - State reconstruction from event logs and base snapshots.

2. **Transparent Treatment-Process Model (`ProcessModelEngine`)**:
   - Mass-balance and kinetic process calculations across configured stages.
   - Stoichiometric coupling ($COD \ge 2.0 \cdot BOD$, $TN \ge TKN \ge NH_4\text{-}N$).
   - Temperature-corrected biological removal kinetics ($k(T) = k_{20} \cdot \theta^{(T-20)}$).
   - Clarifier solids separation modeling.
   - Nitrification alkalinity buffering pH dynamics.
   - Deterministic configuration hashing via SHA-256 for model provenance.
   - Numerical stability checks and boundary clipping ($pH \in [0, 14]$, concentrations $\ge 0$).
   - Explicit `insufficient_data` output when critical inputs are missing.

3. **Isolated What-If Scenario Engine (`ScenarioEngine`)**:
   - Runs isolated simulations starting from a fixed `base_state_version`.
   - Supported scenario types: `influent_quality_change`, `sensor_drift`, `stuck_sensor`, `missing_delayed_readings`, `process_aeration_change`, `hydraulic_shock_load`, and `alternative_treatment_assumptions`.
   - Absolute isolation: Running a scenario never mutates actual readings, live twin state, finalized treatment records, or certificates.
   - Reproducibility guaranteed via deterministic random seeding.

4. **Evidence-Gated Water Quality Prediction & Advisory Recommendations**:
   - Audited paired influent/effluent datasets (UCI Water Treatment Plant).
   - Baseline predictive model with leakage-free temporal evaluation.
   - Strict `insufficient_data` gating where operating parameters or paired observations are missing.
   - Advisory recommendations with explicit `requires_human_review = True` and strict prohibition of autonomous actuator control.

5. **REST API & Server-Side RBAC (`/api/v1/facilities/{id}/twin/...`)**:
   - Comprehensive endpoints for state retrieval, version history, configuration management, scenario execution, and model inspection.
   - Server-side role enforcement per `RBAC_PERMISSION_MATRIX.md` (Operator, Admin, Auditor, CPCB Regulator).

---

### 3. Data Invariants & Non-Negotiable Rules

1. **Data Origin Distinction**:
   - `observed`: Measured physically by a sensor or imported from authoritative historical records.
   - `simulated`: Produced by the synthetic telemetry simulator.
   - `predicted`: Computed by a versioned process model or ML predictor.
   - `hypothetical`: Generated during a what-if scenario run.
   *These categories must never be combined or substituted in compliance records.*

2. **Invalid Observation Non-Overwrite Invariant**:
   - If an incoming reading is rejected as `invalid`, the virtual physical state retains its previous accepted value.
   - The reject event is explicitly recorded in `sensor_states` and `twin_state_events`, and `data_quality` flags the issue.
   - Retained previous values are never displayed as fresh readings.

3. **DLT Anchoring Invariant**:
   - What-if scenario outcomes and transient state updates are NOT committed to Hyperledger Fabric.
   - Only finalized audit state snapshots and official treatment certificates are anchored.

---

### 4. Compatibility and Impact Analysis

- **Backward Compatibility:** 100% compatible. The existing 132 tests remain passing.
- **Database Schema:** New tables (`twin_configurations`, `twin_states`, `twin_state_events`, `twin_scenarios`, `twin_scenario_results`, `twin_model_versions`, `twin_predictions`, `twin_recommendations`) are added without modifying existing tables or foreign key constraints.
- **Performance:** Scalable to 500 STPs with asynchronous scenario execution, cached active state, and bulk batch updates.
