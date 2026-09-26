# AquaTrust AI — Complete End-to-End Implementation Plan

**Project Title:** Decentralized Ledger Technology for Traceability and Quality Assurance in Decentralized Wastewater Treatment Facilities  
**Project Name:** AquaTrust AI  
**Document Type:** Detailed Implementation Plan / Engineering Execution Plan / Integration Plan  
**Baseline:** AquaTrust AI Final Master Project Blueprint  
**Primary Architecture:** Trust-Aware Hybrid Permissioned-DLT Architecture  
**Primary DLT Option:** Hyperledger Fabric  
**Primary Database:** PostgreSQL  
**Backend:** Python + FastAPI  
**Frontend:** React + TypeScript + Tailwind CSS + Recharts  
**AI:** Python, pandas, scikit-learn, StandardScaler, Isolation Forest  
**Cryptography:** SHA-256 + digital signatures  
**Delivery Horizon:** 32 weeks / 16 sprints  
**Status:** Current-state-aligned implementation baseline v2.1.2

---

# 1. Purpose

This document converts the AquaTrust AI Final Master Project Blueprint into an executable implementation plan.

It defines, end to end:

- what must be built;
- why each module exists;
- how each module works;
- what data enters and leaves each module;
- how modules integrate;
- database responsibilities;
- API responsibilities;
- AI processing;
- QA/compliance processing;
- certificate generation;
- cryptographic processing;
- PostgreSQL persistence;
- permissioned-DLT anchoring;
- verification;
- append-only corrections;
- dashboard behavior;
- role-based access;
- experiments;
- testing;
- performance/scalability evaluation;
- sprint sequencing;
- dependencies;
- acceptance criteria;
- implementation risks and controls.

This is an execution document. The Final Master Project Blueprint remains the functional and architectural baseline; this document adds implementation sequencing, interfaces, integration contracts, test gates, and delivery criteria.

### Revision 2.0 — Current-State Alignment

This revision incorporates the repository review verdict: the current codebase is an early frontend/data prototype with substantial UI/data work already present, while the backend, trust pipeline, cryptographic layer, permissioned DLT layer and experimental evaluation remain to be implemented. The plan therefore changes from a greenfield assumption to a **completion-and-integration plan** while preserving the original 11 objectives.

---

# 2. Final Project Boundary

## 2.1 Core system

The implementation must deliver this pipeline:

```text
Public Wastewater Datasets
        ↓
Preprocessing
        ↓
Multi-STP Simulator
        ↓
FastAPI Data Gateway
        ↓
Standardization
        ↓
Deterministic Data Validation
        ↓
Isolation Forest Anomaly Detection
        ↓
QA / Compliance Engine
        ↓
Finalized Treatment Record
        ↓
Digital Treatment Certificate
        ↓
Canonicalization
        ↓
SHA-256 Hash
        ↓
Digital Signature
        ↓
PostgreSQL + Permissioned DLT Anchor
        ↓
Independent Verification
        ↓
Audit / Corrections
        ↓
Role-Based Web Dashboards
        ↓
Experimental Evaluation
```

## 2.2 Core objectives implemented

The implementation must provide all eleven finalized objectives:

1. Multi-facility wastewater simulation.
2. Data-trust validation before ledger anchoring.
3. AI anomaly detection for BOD, COD, TSS, pH, ammoniacal nitrogen and total nitrogen.
4. Configurable QA/compliance evaluation.
5. Digitally signed and cryptographically hashed treatment records.
6. Permissioned DLT recording of treatment-event proof and selected metadata.
7. Append-only correction mechanism.
8. Standardized heterogeneous wastewater-data interface.
9. Centralized vs blockchain-centric vs hybrid architecture comparison.
10. Operator, auditor and regulatory stakeholder dashboards.
11. Experimental evaluation of integrity, latency, throughput, storage overhead, verification time, computational overhead and scalability.

## 2.3 Explicit non-goals

Do not make the following mandatory in the current implementation:

- LSTM forecasting;
- XGBoost water-quality prediction;
- predictive maintenance;
- equipment-failure prediction;
- live physical sensor deployment;
- mandatory IoT hardware;
- raw high-frequency sensor data on the ledger.

These may be documented as future extensions.

---

## 2.4 Current Implementation Baseline — Reviewed Against the AquaTrustAI Repository

The implementation plan is now explicitly aligned to the current repository state reviewed before this revision. The existing implementation is treated as a **frontend/data foundation**, not as a failed or disposable implementation. The objective of the next 32 weeks is to complete the missing backend, trust, cryptographic, DLT, verification and experimental layers and connect them to the existing UI.

### Current state

| Area | Current state | Required end state | Action |
|---|---|---|---|
| React/Vite frontend | Implemented | Retain and integrate | Keep; replace mock data/services incrementally |
| Tailwind/Recharts UI | Implemented | Retain | Keep existing visual foundation |
| Bangalore wastewater dataset | Present | Provenance-controlled processed dataset | Audit, document, preprocess and connect to simulator |
| Indian water-quality reference dataset | Present | Versioned compliance/reference source | Document provenance and connect to compliance explorer |
| Monitoring/dashboard UI | Partially implemented | API-backed operational dashboard | Connect to FastAPI |
| Operational mock services | Present | No mocks in core research workflow | Replace with real backend services |
| FastAPI backend | Not implemented in reviewed baseline | Required | Build |
| PostgreSQL persistence | Not implemented in reviewed baseline | Required | Build |
| Multi-STP simulator | Not implemented | Required | Build 8/50/100/500 workloads |
| Deterministic validation | Not implemented | Required | Build before AI/finalization |
| Isolation Forest pipeline | Not implemented | Required | Build and version |
| QA/compliance engine | UI/reference foundation only | Required backend engine | Build and version rules |
| Treatment records/certificates | Not implemented | Required | Build finalization and certificate lifecycle |
| SHA-256/digital signatures | Not implemented | Required | Build canonicalization + crypto service |
| Permissioned DLT/Fabric | Not implemented | Required | Build controlled network and anchoring |
| Independent verification | Not implemented | Required | Build verification API/UI |
| Append-only corrections | Not implemented | Required | Build correction and lineage workflow |
| RBAC/backend authorization | Not demonstrated | Required | Enforce at API/service layer |
| Architecture comparison | Not implemented | Required | Centralized/blockchain-centric/hybrid runners |
| Performance/scalability experiments | Not implemented | Required | Reproducible 8/50/100/500 benchmarks |

**Overall implementation assessment:** the current repository should be treated as an early frontend/data prototype, approximately **15–20% of the final engineering scope** by functional scope coverage. This percentage is an engineering planning estimate, not a measured code-coverage statistic.

### Required migration principle

Do **not** restart the project from scratch and do **not** discard the existing frontend/data work. Preserve useful screens, routing, styling, chart components and datasets. The migration path is:

```text
Existing React + dataset foundation
        ↓
Freeze shared data contracts
        ↓
Introduce FastAPI + PostgreSQL
        ↓
Replace provisional/mock services one feature at a time
        ↓
Attach validation + AI + compliance results
        ↓
Add treatment records + certificates
        ↓
Add SHA-256 + signatures + Fabric anchoring
        ↓
Add verification + corrections + audit lineage
        ↓
Run controlled architecture/scalability experiments
```

The frontend is therefore an **existing integration target**, not a Sprint-12 greenfield build. Backend integration work may begin as soon as the relevant API contracts stabilize.

## 2.5 Objective-by-Objective Gap Status

| Objective | Current baseline | Remaining implementation |
|---|---|---|
| O1 Multi-facility simulation | Partial dataset foundation | Simulator + 8/50/100/500 workloads |
| O2 Data-trust validation | Not implemented | Deterministic validation pipeline |
| O3 AI anomaly detection | Not implemented | Isolation Forest + versioning/evaluation |
| O4 QA/compliance | Partial UI/reference data | Backend rule engine + persistence + versioning |
| O5 Cryptographic records | Not implemented | Finalized record + certificate + canonicalization + SHA-256 + signature |
| O6 Permissioned DLT | Not implemented | Fabric network + chaincode + anchor service |
| O7 Append-only corrections | Not implemented | Correction workflow + lineage + re-anchor |
| O8 Standardized interface | Partial | FastAPI canonical contract + integration tests |
| O9 Architecture comparison | Not implemented | Controlled centralized/blockchain-centric/hybrid runners |
| O10 Web dashboard | Substantially started | Real API integration + role enforcement + verification/audit workflows |
| O11 Experimental evaluation | Not implemented | Integrity, latency, throughput, storage, verification, computational overhead and scalability |

## 2.6 Implementation Verdict and Priority Order

The reviewed verdict changes **execution priority**, not the final research objectives. The remaining work must be executed in this order:

1. Freeze canonical data contracts and repository migration boundaries.
2. Audit/preprocess the existing datasets and establish provenance.
3. Build the multi-STP simulator.
4. Build FastAPI ingestion and standardization.
5. Build deterministic validation.
6. Build Isolation Forest anomaly detection.
7. Build QA/compliance.
8. Build finalized treatment records and digital certificates.
9. Build PostgreSQL persistence and transactions.
10. Build canonicalization, SHA-256 and digital signatures.
11. Build Hyperledger Fabric anchoring.
12. Build independent verification.
13. Build append-only corrections and audit lineage.
14. Replace frontend mocks with real API integrations and enforce RBAC.
15. Build centralized, blockchain-centric and hybrid experiment runners.
16. Execute 8/50/100/500 STP benchmarks and integrity/tamper/failure tests.

No later module should be accepted merely because its UI exists. A feature is complete only when its service/API behavior, persistence, authorization, tests and research evidence are present.

# 3. Implementation Principles

## 3.1 Trust before ledger

No treatment event should be treated as finalized merely because it was written to a ledger.

The sequence is:

```text
Ingest
→ Standardize
→ Validate
→ Detect anomalies
→ Evaluate compliance
→ Finalize
→ Canonicalize
→ Hash
→ Sign
→ Persist
→ Anchor
```

## 3.2 Separate three statuses

The implementation must never collapse data quality, AI anomaly detection and regulatory compliance into one field.

Use:

- `quality_status`
- `anomaly_status`
- `compliance_status`

A record can therefore be:

```text
quality_status = valid
anomaly_status = anomalous
compliance_status = compliant
```

or any other logically valid combination.

## 3.3 PostgreSQL is the detailed source of application data

PostgreSQL stores detailed:

- facilities;
- sensors;
- readings;
- validation results;
- anomaly results;
- compliance results;
- treatment records;
- certificates;
- corrections;
- audit logs;
- DLT references.

## 3.4 DLT is the integrity/provenance layer

The permissioned ledger stores compact proof and metadata, such as:

- record ID;
- certificate ID;
- facility ID;
- event timestamp;
- compliance summary;
- canonical hash;
- signature/reference metadata;
- correction relationship;
- transaction ID;
- ledger timestamp.

The ledger is not a replacement for PostgreSQL.

## 3.5 Corrections are append-only

Never overwrite or delete a finalized treatment record.

Use:

```text
Original Record
      ↓
Correction Request
      ↓
Authorization
      ↓
Corrected Record
      ↓
New Certificate
      ↓
New Hash
      ↓
New Signature
      ↓
New DLT Anchor
```

The original remains verifiable.

---

# 4. Target Repository Structure

Recommended repository:

```text
aquatrust-ai/
├── apps/
│   ├── api/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   ├── core/
│   │   │   ├── db/
│   │   │   ├── models/
│   │   │   ├── schemas/
│   │   │   ├── services/
│   │   │   ├── validators/
│   │   │   ├── ai/
│   │   │   ├── compliance/
│   │   │   ├── certificates/
│   │   │   ├── crypto/
│   │   │   ├── dlt/
│   │   │   ├── corrections/
│   │   │   ├── audit/
│   │   │   └── main.py
│   │   └── tests/
│   ├── web/
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── layouts/
│   │   │   ├── pages/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   └── routes/
│   │   └── tests/
│   └── simulator/
│       ├── datasets/
│       ├── generators/
│       ├── scenarios/
│       ├── configs/
│       └── runner/
├── packages/
│   ├── shared/
│   ├── data-contracts/
│   ├── crypto/
│   └── evaluation/
├── dlt/
│   ├── network/
│   ├── chaincode/
│   ├── identities/
│   └── scripts/
├── data/
│   ├── raw/
│   ├── processed/
│   ├── fixtures/
│   └── generated/
├── experiments/
│   ├── centralized/
│   ├── blockchain_centric/
│   ├── hybrid/
│   ├── workloads/
│   └── results/
├── docs/
├── scripts/
├── docker/
├── .env.example
└── README.md
```

---

# 5. Environment and Infrastructure Setup

## 5.1 Development environment

Recommended baseline:

- Python 3.x;
- Node.js LTS;
- PostgreSQL;
- Docker / Docker Compose;
- Git;
- FastAPI;
- React + TypeScript;
- Tailwind CSS;
- Recharts;
- pandas;
- scikit-learn;
- joblib;
- cryptographic library;
- Hyperledger Fabric tooling.

## 5.2 Environment separation

Create:

```text
.env.example
.env.development
.env.test
```

Never commit:

- private signing keys;
- database passwords;
- Fabric credentials;
- production secrets.

## 5.3 Docker services

A development Compose environment should provide, as applicable:

```text
postgres
api
web
simulator
dlt components
```

The DLT network may be run using the Fabric test/development network during implementation and then replaced by the final controlled experimental network configuration.

---

# 6. Module 1 — Dataset Ingestion and Preprocessing

## 6.1 Purpose

Convert public wastewater datasets into a controlled internal dataset that can be used to simulate heterogeneous treatment facilities.

## 6.2 Inputs

Required parameters include, where available:

- BOD;
- COD;
- TSS;
- pH;
- ammoniacal nitrogen;
- total nitrogen;
- timestamps;
- plant/facility identifiers;
- sensor/source identifiers;
- units.

## 6.3 Processing

1. Load raw dataset.
2. Inspect schema.
3. Identify parameter columns.
4. Normalize names.
5. Normalize units.
6. Parse timestamps.
7. Remove or explicitly mark unusable records.
8. Preserve provenance of source rows.
9. Store processed dataset.
10. Generate a reproducible dataset manifest.

## 6.4 Outputs

```text
processed_readings
dataset_manifest
parameter_dictionary
source_metadata
```

## 6.5 Acceptance

A dataset cannot enter simulation until its parameters, units and timestamp representation are known.

---

# 7. Module 2 — Multi-STP Simulator

## 7.1 Purpose

Create a reproducible decentralized wastewater-treatment environment without requiring physical plants.

## 7.2 Scale levels

The simulator must support:

- 8 STPs;
- 50 STPs;
- 100 STPs;
- 500 STPs.

## 7.3 Facility model

Each facility should have:

```text
facility_id
facility_name
location/region metadata
facility_type
capacity metadata
active_status
created_at
```

## 7.4 Sensor model

Each sensor should have:

```text
sensor_id
facility_id
parameter
unit
sensor_type
status
```

## 7.5 Reading generation

A simulated reading contains:

```text
reading_id
facility_id
sensor_id
timestamp
parameter
value
unit
source
```

## 7.6 Scenario generation

The simulator must deliberately generate:

- normal readings;
- invalid values;
- missing readings;
- duplicate readings;
- sudden changes;
- consistency violations;
- anomalous patterns.

The scenario generator must use deterministic seeds so that experiments can be reproduced.

## 7.7 Simulator modes

Recommended:

```text
NORMAL
VALIDATION_FAILURE
ANOMALY
MIXED
STRESS
```

## 7.8 Acceptance

The same seed and configuration must reproduce the same experiment workload.

---

# 8. Module 3 — Standardized Wastewater Data Interface

## 8.1 Purpose

Allow heterogeneous facilities to submit data through one internal contract.

## 8.2 Canonical reading schema

```json
{
  "facility_id": "STP-001",
  "sensor_id": "SENSOR-001",
  "timestamp": "2026-01-01T10:00:00Z",
  "parameter": "BOD",
  "value": 24.5,
  "unit": "mg/L",
  "source": "simulator"
}
```

## 8.3 Gateway responsibilities

The FastAPI gateway must:

1. authenticate/identify the submitting participant;
2. validate request shape;
3. normalize parameter names;
4. normalize units;
5. normalize timestamps;
6. map source-specific identifiers;
7. reject structurally invalid payloads;
8. pass standardized readings to the trust pipeline.

## 8.4 Integration contract

Every downstream service must consume the standardized internal representation rather than raw source-specific formats.

This prevents source-specific logic from spreading into AI, QA, database and DLT modules.

---

# 9. Module 4 — Deterministic Data Validation

## 9.1 Purpose

Detect objective data-quality problems before AI and before ledger anchoring.

## 9.2 Validation types

### Range validation

Check parameter-specific acceptable input ranges.

### Missing-value validation

Detect:

- null;
- absent;
- malformed;
- expected-but-not-received readings.

### Duplicate validation

Detect duplicate combinations based on the defined identity, such as:

```text
facility_id + sensor_id + parameter + timestamp
```

### Sudden-change validation

Identify implausible temporal changes using configured thresholds.

### Consistency validation

Check relationships and basic internal consistency among readings where such rules are configured.

## 9.3 Validation result

Store:

```text
validation_status
validation_flags
validation_reason
validation_timestamp
validator_version
```

## 9.4 Rule versioning

Every validation result must identify the validation-rule version used.

## 9.5 Acceptance

A validation result must be reproducible from:

```text
input reading + validation configuration + rule version
```

---

# 10. Module 5 — AI Anomaly Detection

## 10.1 Model

Primary model:

```text
StandardScaler → Isolation Forest
```

## 10.2 Target parameters

- BOD;
- COD;
- TSS;
- pH;
- ammoniacal nitrogen;
- total nitrogen.

## 10.3 Feature preparation

Features may include:

- parameter value;
- normalized parameter value;
- temporal context;
- facility context;
- parameter-specific derived values where defined.

Do not silently introduce unrelated predictive-maintenance features.

## 10.4 Training

1. Prepare representative processed data.
2. Fit preprocessing transformation.
3. Fit Isolation Forest.
4. Record model configuration.
5. Persist model artifact.
6. Persist model version.
7. Persist feature-set version.

## 10.5 Inference

For each eligible reading/window:

```text
Input
→ feature preparation
→ scaler
→ Isolation Forest
→ anomaly score
→ anomaly classification
```

## 10.6 Output

```text
anomaly_status
anomaly_score
model_version
feature_set_version
inference_timestamp
```

## 10.7 AI vs validation

Validation answers:

> Is this measurement structurally/data-quality valid?

AI answers:

> Does this measurement/pattern look unusual relative to the learned data distribution?

They must remain separate.

---

# 11. Module 6 — Quality Assurance and Compliance Engine

## 11.1 Purpose

Determine whether measured parameters satisfy configured treatment-quality requirements.

## 11.2 Rule model

Each compliance rule should identify:

```text
parameter
operator
threshold
unit
effective_from
effective_to
rule_version
```

## 11.3 Parameter evaluation

For each applicable parameter:

```text
measurement
→ resolve active rule
→ normalize units
→ compare against threshold
→ create parameter result
```

## 11.4 Overall compliance

Aggregate parameter-level results into:

```text
compliant
non_compliant
not_evaluable
```

The aggregation logic must be deterministic and documented.

## 11.5 AI integration

AI anomaly information may be shown alongside compliance, but AI anomaly status must not silently replace the compliance rule.

Example:

```text
quality_status = valid
anomaly_status = anomalous
compliance_status = compliant
```

## 11.6 Acceptance

Given identical measurements and rule versions, the compliance result must be deterministic.

---

# 12. Module 7 — Finalized Treatment Record

## 12.1 Purpose

Create the authoritative application-level snapshot that is eligible for cryptographic certification and DLT anchoring.

## 12.2 Record contents

At minimum:

```text
treatment_record_id
facility_id
measurement/time window
parameter summary
quality_status
anomaly_status
compliance_status
validation references
AI references
compliance-rule version
created_at
finalization status
```

## 12.3 Finalization gate

A record should only become finalized after required:

- standardization;
- validation;
- AI processing;
- compliance processing;

have completed.

## 12.4 Immutable application semantics

After finalization:

- no in-place mutation;
- no deletion;
- no silent replacement.

Any correction creates a new record.

---

# 13. Module 8 — Digital Treatment Certificate

## 13.1 Purpose

Provide a human-readable and machine-verifiable representation of the finalized treatment event.

## 13.2 Certificate contents

Recommended:

```text
certificate_id
treatment_record_id
facility_id
treatment period
parameter summary
quality status
anomaly status
compliance status
certificate version
issued_at
record hash
signature metadata
DLT anchor reference
correction/revision reference
```

## 13.3 Certificate lifecycle

```text
DRAFT
→ GENERATED
→ SIGNED
→ ANCHORED
→ VERIFIED
```

A corrected record creates a new certificate version/reference.

---

# 14. Module 9 — Canonicalization

## 14.1 Purpose

Ensure that the same logical treatment record always produces the same byte representation before hashing.

## 14.2 Canonicalization rules

Define and freeze:

- field names;
- field ordering;
- timestamp format;
- numeric precision;
- null representation;
- encoding;
- whitespace policy;
- collection ordering.

## 14.3 Process

```text
Treatment Record
→ select signed fields
→ normalize values
→ deterministic serialization
→ UTF-8 bytes
```

## 14.4 Acceptance

Running canonicalization twice on the same record must produce identical output.

---

# 15. Module 10 — SHA-256 Hashing

## 15.1 Process

```text
canonical bytes
→ SHA-256
→ hexadecimal digest
```

## 15.2 Stored values

Store:

```text
record_hash
hash_algorithm = SHA-256
canonicalization_version
```

The hash is the integrity fingerprint of the canonicalized record.

---

# 16. Module 11 — Digital Signatures

## 16.1 Purpose

Provide authenticity/integrity evidence associated with an authorized signing identity.

## 16.2 Signing process

```text
canonical record
→ hash
→ signing operation
→ signature
```

## 16.3 Verification

```text
record
→ canonicalize
→ recompute hash
→ verify signature against public key
```

## 16.4 Key management

Private signing material must:

- never be committed to Git;
- be stored outside source code;
- be separated by environment;
- have controlled access.

---

# 17. Module 12 — PostgreSQL Persistence

## 17.1 Core tables

The implementation must cover the blueprint entities:

```text
facilities
sensors
readings
validation_results
anomaly_results
compliance_results
treatment_records
certificates
dlt_anchors
corrections
audit_logs
```

## 17.2 Relationships

```text
facility
  └── sensors
        └── readings
              ├── validation_results
              └── anomaly_results

treatment_record
  ├── compliance_results
  ├── certificate
  ├── dlt_anchor
  └── corrections

all important state transitions
  └── audit_logs
```

## 17.3 Transaction boundaries

Critical operations must be transactional.

For example:

```text
finalize treatment record
→ create certificate
→ store hash/signature metadata
→ create DLT anchor reference
→ commit
```

Where an external DLT transaction cannot participate in a database transaction, use explicit pending/success/failure states and reconciliation.

---

# 18. Module 13 — Permissioned DLT

## 18.1 Purpose

Provide distributed, permissioned evidence of finalized treatment events.

## 18.2 Primary implementation

Use Hyperledger Fabric as the primary permissioned-DLT implementation option.

Do not mix Fabric and Solidity/Ganache assumptions into the same production implementation.

## 18.3 Participants

Logical participants may include:

- facility organization;
- auditing organization;
- regulatory organization;
- system operator/administrator.

The exact organizational topology must be frozen before final DLT implementation.

## 18.4 DLT record

A compact anchor should contain fields such as:

```text
anchor_id
treatment_record_id
certificate_id
facility_id
event_timestamp
record_hash
compliance_status
signature_reference
correction_reference
application_version
```

## 18.5 DLT transaction lifecycle

```text
finalized record
→ canonicalize
→ hash
→ sign
→ persist application record
→ submit DLT transaction
→ receive transaction ID
→ store DLT anchor reference
```

## 18.6 Failure handling

If DLT submission fails:

```text
application record = finalized/pending_anchor
```

Do not fabricate a successful anchor.

A retry/reconciliation mechanism must later submit the same finalized hash and update the anchor status.

---

# 19. Module 14 — Independent Verification

## 19.1 Verification goal

A verifier should not need to trust the dashboard display alone.

## 19.2 Verification workflow

```text
certificate/record ID
→ retrieve application record
→ retrieve canonical signed fields
→ reconstruct canonical representation
→ calculate SHA-256
→ compare with stored hash
→ verify digital signature
→ retrieve DLT anchor
→ compare DLT hash
→ return verification state
```

## 19.3 Verification states

Recommended:

```text
VERIFIED
HASH_MISMATCH
SIGNATURE_INVALID
DLT_ANCHOR_MISSING
DLT_HASH_MISMATCH
RECORD_NOT_FOUND
CORRECTED_RECORD
PENDING_ANCHOR
```

## 19.4 Acceptance

A deliberate modification of a signed record must produce a verification failure.

---

# 20. Module 15 — Append-Only Corrections

## 20.1 Purpose

Support legitimate corrections while preserving the original evidence.

## 20.2 Workflow

```text
Original Record
→ Correction Request
→ Authorization
→ Corrected Data
→ Re-validation
→ Re-run AI where applicable
→ Re-run compliance
→ New finalized record
→ New certificate
→ New hash
→ New signature
→ New DLT anchor
```

## 20.3 Correction record

Store:

```text
correction_id
original_record_id
corrected_record_id
reason
requested_by
approved_by
created_at
status
```

## 20.4 Prohibited behavior

Do not:

- update original finalized values in place;
- delete the original;
- replace the original certificate;
- reuse the original hash for changed content.

---

# 21. Module 16 — Audit Logging

## 21.1 Audit events

Capture important actions:

- ingestion;
- validation;
- AI execution;
- compliance evaluation;
- record finalization;
- certificate generation;
- signing;
- DLT anchoring;
- verification;
- correction request;
- correction approval;
- correction creation;
- dashboard-sensitive actions.

## 21.2 Audit fields

```text
audit_id
actor
role
action
entity_type
entity_id
timestamp
result
metadata
```

## 21.3 Principle

Audit logs describe system actions; they must not become an uncontrolled second database of sensitive raw data.

---

# 22. Module 17 — Backend API

## 22.1 API domains

Organize endpoints by domain:

```text
/facilities
/sensors
/readings
/validation
/anomalies
/compliance
/treatment-records
/certificates
/verification
/corrections
/audit
/experiments
```

## 22.2 Example end-to-end API sequence

```text
POST /readings
        ↓
validation pipeline
        ↓
GET /readings/{id}/validation
        ↓
GET /readings/{id}/anomaly
        ↓
GET /treatment-records/{id}
        ↓
GET /certificates/{id}
        ↓
POST /verification
```

## 22.3 API principles

- typed request/response schemas;
- consistent error format;
- authentication;
- authorization;
- pagination for collections;
- explicit versioning;
- idempotency for retry-sensitive operations;
- correlation/request IDs;
- audit logging for state-changing actions.

---

# 23. Module 18 — Frontend Dashboard

## 23.1 Main application areas

The web application should include:

1. Dashboard.
2. Facility List.
3. Facility Detail.
4. Monitoring.
5. Anomalies.
6. Compliance.
7. Treatment Records.
8. Certificates.
9. Verification.
10. Audit History.
11. Corrections.
12. Experimental Comparison.

## 23.2 Operator

The operator needs:

- facility monitoring;
- sensor trends;
- validation issues;
- anomalies;
- compliance;
- treatment records;
- certificate access;
- correction workflows where authorized.

## 23.3 Auditor

The auditor needs:

- cross-facility record inspection;
- verification;
- audit history;
- correction history;
- DLT evidence;
- certificate inspection.

## 23.4 Regulatory stakeholder

The regulatory interface should emphasize:

- facility-level compliance;
- treatment records;
- certificate verification;
- historical traceability;
- audit evidence;
- cross-facility views where authorized.

---

# 24. Role-Based Access Control

## 24.1 Operator permissions

Typical:

```text
view own facility
view readings
view validation
view anomalies
view compliance
view treatment records
view certificates
request correction
```

## 24.2 Auditor permissions

Typical:

```text
read authorized facilities
verify certificates
view audit history
inspect corrections
inspect DLT anchors
```

## 24.3 Regulatory stakeholder permissions

Typical:

```text
view authorized facilities
view compliance
verify certificates
inspect treatment records
inspect audit evidence
```

## 24.4 Security rule

Authorization must be enforced at the backend, not only by hiding frontend buttons.

---

# 25. Experimental Architecture Implementations

Three architectures must be implemented or sufficiently modeled to produce a controlled comparison.

## 25.1 Architecture A — Centralized

```text
Data
→ Gateway
→ Validation
→ AI
→ QA
→ PostgreSQL
→ Verification
```

No DLT anchor is used.

## 25.2 Architecture B — Blockchain-centric

The experimental architecture pushes a substantially larger proportion of finalized data/proof operations toward the ledger.

The exact payload and write policy must be frozen before benchmarking.

## 25.3 Architecture C — Hybrid

```text
Detailed data → PostgreSQL
Finalized proof/metadata → Permissioned DLT
```

This is the proposed architecture.

## 25.4 Fair comparison rule

All three architectures must process equivalent logical workloads:

- same number of STPs;
- same parameter set;
- same reading counts;
- same workload scenarios;
- same machine/environment where practical.

---

# 26. Performance and Scalability Workloads

Run workloads at:

```text
8 STPs
50 STPs
100 STPs
500 STPs
```

Use repeatable workload configurations.

For each workload record:

- number of facilities;
- number of sensors;
- number of readings;
- number of validation events;
- number of AI inferences;
- number of compliance evaluations;
- number of finalized records;
- number of certificates;
- number of DLT transactions.

---

# 27. Metrics

## 27.1 Integrity

Measure:

- tamper detection success;
- hash mismatch detection;
- signature verification correctness;
- DLT anchor consistency.

## 27.2 Latency

Measure:

```text
ingestion latency
validation latency
AI latency
compliance latency
certificate generation latency
hash/sign latency
DLT submission latency
end-to-end finalization latency
verification latency
```

## 27.3 Throughput

Measure:

```text
readings/second
finalized records/second
DLT transactions/second
verification operations/second
```

## 27.4 Storage overhead

Measure:

- PostgreSQL storage;
- ledger storage;
- certificate metadata;
- index overhead;
- architecture-specific storage growth.

## 27.5 Computational overhead

Measure:

- CPU;
- memory;
- AI inference cost;
- cryptographic cost;
- DLT submission cost.

## 27.6 Scalability

Compare how each architecture behaves as STP count increases.

---

# 28. Testing Strategy

## 28.1 Unit tests

Test:

- validators;
- unit conversion;
- canonicalization;
- hashing;
- signatures;
- compliance rules;
- correction relationships;
- simulator generation.

## 28.2 API tests

Test:

- valid requests;
- invalid requests;
- authentication;
- authorization;
- state transitions;
- idempotency;
- error handling.

## 28.3 Database tests

Test:

- foreign keys;
- uniqueness;
- indexes;
- transaction boundaries;
- append-only behavior;
- audit persistence.

## 28.4 AI tests

Test:

- model loading;
- deterministic preprocessing;
- expected anomaly outputs;
- score persistence;
- model version tracking.

## 28.5 DLT tests

Test:

- transaction submission;
- participant identity;
- read-back;
- anchor retrieval;
- failure and retry;
- hash consistency.

## 28.6 Cryptographic tests

Test:

- deterministic canonicalization;
- hash stability;
- signature validity;
- modified-record detection.

## 28.7 Tamper tests

Deliberately alter:

- measurement;
- compliance result;
- certificate field;
- hash;
- DLT reference.

The verification layer must identify the inconsistency.

## 28.8 Failure-recovery tests

Simulate:

- database unavailable;
- DLT unavailable;
- duplicate submission;
- partial finalization;
- failed signing;
- failed anchor;
- retry after failure.

## 28.9 End-to-end test

At least one test must execute:

```text
dataset
→ simulator
→ gateway
→ validation
→ AI
→ compliance
→ certificate
→ hash
→ signature
→ PostgreSQL
→ DLT
→ verification
→ correction
→ second verification
```

---

# 29. Detailed Integration Contracts

## 29.1 Simulator → Gateway

Contract:

```text
facility_id
sensor_id
timestamp
parameter
value
unit
source
```

Guarantee: simulator outputs conform to the canonical ingestion schema.

## 29.2 Gateway → Validation

Guarantee:

- normalized parameter;
- normalized unit;
- normalized timestamp;
- identified facility and sensor.

## 29.3 Validation → AI

AI receives only records eligible for AI inference according to the defined pipeline. Validation results remain attached to the record.

## 29.4 AI → QA

QA receives:

- standardized measurement/result context;
- anomaly result;
- model version.

AI anomaly does not replace compliance evaluation.

## 29.5 QA → Certificate

Only the finalized treatment-record service decides when the record is ready for certification.

## 29.6 Certificate → Crypto

The certificate/treatment record provides the exact canonical field set to be signed.

## 29.7 Crypto → DLT

DLT receives the final hash and approved metadata.

## 29.8 PostgreSQL ↔ DLT

PostgreSQL stores the application record and DLT transaction reference. DLT stores the compact proof.

## 29.9 Verification → All evidence sources

Verification compares:

```text
PostgreSQL record
vs
recomputed hash
vs
signature
vs
DLT anchor
```

---

# 30. State Machines

## 30.1 Treatment record

```text
INGESTED
→ VALIDATED
→ ANALYZED
→ COMPLIANCE_EVALUATED
→ FINALIZED
→ CERTIFIED
→ ANCHORED
→ VERIFIED

Possible exceptional states:
VALIDATION_FAILED
ANALYSIS_FAILED
COMPLIANCE_NOT_EVALUABLE
SIGNING_FAILED
ANCHOR_PENDING
ANCHOR_FAILED
CORRECTION_REQUESTED
CORRECTED
```

## 30.2 Certificate

```text
DRAFT
→ GENERATED
→ SIGNED
→ ANCHORED
→ VERIFIED
→ SUPERSEDED_BY_CORRECTION
```

## 30.3 Correction

```text
REQUESTED
→ UNDER_REVIEW
→ APPROVED / REJECTED
→ PROCESSING
→ CORRECTED
→ RE-ANCHORED
```

---

# 31. Configuration Management

Keep these outside hard-coded business logic:

- compliance thresholds;
- validation thresholds;
- anomaly model configuration;
- simulation scale;
- simulation seed;
- parameter/unit mappings;
- DLT network endpoints;
- signing configuration;
- application environment.

Version:

```text
validation_rule_version
compliance_rule_version
model_version
feature_set_version
canonicalization_version
application_version
```

---

# 32. Observability

The implementation should expose:

- structured logs;
- request IDs;
- processing timestamps;
- module execution duration;
- DLT transaction IDs;
- model versions;
- rule versions;
- error categories.

For experiments, metrics must be exported to a machine-readable result format.

---

# 33. Data Provenance

Every finalized record should be traceable to:

```text
source dataset
→ simulator scenario
→ facility
→ sensor
→ reading(s)
→ validation result
→ AI result
→ compliance result
→ treatment record
→ certificate
→ hash
→ signature
→ DLT transaction
```

This chain is central to the research claim of traceability.

---

# 34. Security Controls

Required controls:

1. least privilege;
2. backend authorization;
3. secure secret storage;
4. no private keys in Git;
5. controlled DLT identities;
6. immutable application semantics for finalized records;
7. audit logging;
8. input validation;
9. deterministic cryptographic serialization;
10. explicit correction lineage.

Important limitation:

DLT integrity proves that an anchored representation has not been silently changed; it does not prove that a physical sensor was truthful.

---

# 35. Sprint Plan — 32 Weeks

The following 16 sprints follow the uploaded 32-week sprint structure while expanding each sprint into implementation deliverables and integration gates.

## Sprint 1 — Weeks 1–2: Current-State Audit, Requirements and Architecture Freeze

### Objectives

- review the existing AquaTrustAI frontend/data implementation;
- preserve useful work and identify disposable/provisional services;
- freeze the final permissioned-DLT architecture and technology stack;
- freeze canonical data contracts, status semantics and integration boundaries.

### Tasks

- repository/module inventory;
- frontend route/component inventory;
- dataset inventory and provenance review;
- identify mock/provisional services;
- map existing UI pages to future API endpoints;
- freeze `quality_status`, `anomaly_status` and `compliance_status`;
- freeze canonical wastewater reading schema;
- freeze treatment-record/certificate identifiers;
- freeze Hyperledger Fabric as the primary DLT implementation;
- define PostgreSQL ownership of detailed application data;
- define DLT payload boundary;
- define RBAC roles and authorization boundaries;
- freeze experiment methodology.

### Deliverables

- current-state audit;
- gap/closure matrix;
- architecture decision record;
- shared data contracts;
- API-to-UI integration map;
- migration backlog.

### Exit gate

The team can identify what is retained, what is replaced, what is newly built and how every existing core screen will obtain real backend data.

---

## Sprint 2 — Weeks 3–4: Dataset Audit, Preprocessing and Reproducibility

### Tasks

- audit the existing Bangalore wastewater dataset;
- audit the existing Indian water-quality reference dataset;
- document public sources and provenance;
- identify usable BOD, COD, TSS, pH, ammoniacal nitrogen and total nitrogen fields;
- normalize units and timestamps;
- clean and validate source records;
- define parameter dictionary;
- define configurable compliance thresholds;
- generate processed datasets;
- create dataset/version manifest;
- define mapping from historical dataset records to simulated STPs;
- preserve frontend data compatibility during migration.

### Deliverables

- audited raw/processed datasets;
- preprocessing scripts;
- parameter dictionary;
- threshold configuration;
- provenance manifest;
- simulator input fixtures.

### Exit gate

Processed, versioned data can be consumed by the simulator and its provenance can be reproduced independently.

---

## Sprint 3 — Weeks 5–6: Multi-STP Simulator

### Tasks

- facility generator;
- sensor generator;
- reading generator;
- normal scenarios;
- invalid scenarios;
- missing scenarios;
- duplicate scenarios;
- sudden-change scenarios;
- anomalous scenarios;
- deterministic seeds;
- 8/50/100/500-STP workloads.

### Deliverables

- simulator package;
- workload configurations;
- generated fixtures;
- reproducibility tests.

### Exit gate

All four scale levels can be generated reproducibly.

---

## Sprint 4 — Weeks 7–8: Data Gateway and Standardization

### Tasks

- FastAPI application;
- ingestion endpoints;
- request schemas;
- facility/sensor identification;
- parameter mapping;
- unit normalization;
- timestamp normalization;
- ingestion errors;
- API authentication foundation;
- request logging.

### Deliverables

- gateway;
- standardized schema;
- API documentation;
- integration tests.

### Exit gate

Simulator data can enter the trust pipeline through the API.

### Parallel frontend track

From this sprint onward, the existing React frontend may be connected incrementally to stable endpoints. Do not wait until Sprint 12 to start integration. Any page connected to an endpoint must use the canonical API contract and must not introduce a second source-specific schema.

---

## Sprint 5 — Weeks 9–10: Deterministic Validation

### Tasks

- range validator;
- missing validator;
- duplicate validator;
- sudden-change validator;
- consistency validator;
- quality-status logic;
- validation result persistence;
- rule versioning;
- validator unit tests.

### Deliverables

- validation service;
- validation database model;
- validation API;
- test suite.

### Exit gate

Invalid data is prevented from being treated as trusted input for downstream finalization.

---

## Sprint 6 — Weeks 11–13: AI Anomaly Detection

### Tasks

- feature pipeline;
- StandardScaler;
- Isolation Forest;
- training dataset;
- model artifact;
- model versioning;
- inference service;
- anomaly score;
- anomaly status;
- evaluation;
- AI result persistence.

### Deliverables

- trained model;
- inference service;
- evaluation report;
- model metadata.

### Exit gate

Eligible readings can receive reproducible anomaly results.

---

## Sprint 7 — Weeks 14–15: QA and Compliance

### Tasks

- compliance-rule schema;
- parameter threshold evaluation;
- unit-aware comparison;
- parameter-level results;
- overall compliance status;
- AI + QA integration;
- rule versioning;
- compliance persistence.

### Deliverables

- compliance engine;
- rule configuration;
- API;
- tests.

### Exit gate

The system can deterministically produce a compliance result for a finalized treatment window.

---

## Sprint 8 — Weeks 16–17: Treatment Records and Digital Certificates

### Tasks

- treatment record service;
- finalization gate;
- certificate generator;
- certificate IDs;
- lifecycle state;
- certificate history;
- machine-readable representation;
- verification metadata.

### Deliverables

- finalized treatment record;
- digital certificate;
- certificate API.

### Exit gate

A valid treatment workflow can produce a finalized certificate before DLT anchoring.

---

## Sprint 9 — Weeks 18–20: PostgreSQL Backend

### Tasks

Implement and integrate:

- facilities;
- sensors;
- readings;
- validation_results;
- anomaly_results;
- compliance_results;
- treatment_records;
- certificates;
- dlt_anchors;
- corrections;
- audit_logs.

Also implement:

- migrations;
- indexes;
- foreign keys;
- transaction boundaries;
- repository/service layer;
- seed data.

### Exit gate

All core application data persists correctly and relationships are test-covered.

---

## Sprint 10 — Weeks 21–23: Canonicalization, SHA-256 and Permissioned DLT

### Tasks

- canonical representation;
- canonicalization version;
- SHA-256 service;
- signature service;
- Fabric development network;
- participant identities;
- chaincode/transaction model;
- DLT anchor submission;
- transaction ID persistence;
- anchor status;
- retry/reconciliation.

### Deliverables

- crypto module;
- permissioned DLT network;
- anchor service;
- integration tests.

### Exit gate

A finalized certificate can be hashed, signed, persisted and anchored.

---

## Sprint 11 — Weeks 24–25: Verification and Append-Only Corrections

### Tasks

- verification API;
- hash recalculation;
- signature verification;
- DLT read-back;
- mismatch states;
- correction request;
- authorization;
- corrected record;
- re-validation;
- re-certificate;
- re-sign;
- re-anchor;
- lineage view;
- audit trail.

### Exit gate

The system detects tampering and preserves original records during correction.

---

## Sprint 12 — Weeks 26–27: Frontend Integration, RBAC and Research Workflows

The existing React/Vite frontend is retained. This sprint is an integration and hardening sprint, not a greenfield UI build.

### Tasks

Replace provisional/mock data paths with real API integrations for:

- overview dashboard;
- facility list and facility detail;
- monitoring;
- anomaly results;
- compliance results;
- finalized treatment records;
- digital certificates;
- verification;
- audit history;
- correction workflow.

Also implement:

- API client layer;
- loading/error/empty states;
- role-specific navigation;
- backend-enforced authorization;
- operator workflow;
- auditor verification/audit workflow;
- regulatory stakeholder compliance/verification workflow;
- removal of mock services from core research flows;
- end-to-end UI integration tests.

### Deliverables

- API-backed React application;
- RBAC integration;
- verification and correction screens;
- frontend integration tests;
- mock-service removal checklist.

### Exit gate

All core dashboard actions use real backend APIs, authorization is enforced server-side, and no core research workflow depends on fabricated/mock data.

---

## Sprint 13 — Weeks 28–29: Architecture Comparison

### Tasks

Implement controlled experiment runners for:

1. centralized;
2. blockchain-centric;
3. hybrid.

Freeze:

- workload;
- machine;
- dataset;
- scenario seed;
- parameter set;
- measurement methodology.

### Deliverables

- three experiment runners/configurations;
- comparable output format;
- experiment scripts.

### Exit gate

Equivalent workloads can be executed across all architectures.

---

## Sprint 14 — Week 30: Scalability and Performance Testing

### Tasks

Run:

```text
8 STPs
50 STPs
100 STPs
500 STPs
```

Measure:

- latency;
- throughput;
- storage;
- verification time;
- computational overhead;
- scalability.

### Deliverables

- raw benchmark results;
- processed result tables;
- plots;
- analysis notes.

### Exit gate

All required metrics have repeatable measurements.

---

## Sprint 15 — Week 31: Advanced Trust and Intelligence — Future Scope

Optional extensions:

- wastewater data-trust score;
- STP health/reliability score;
- network-level STP comparison;
- explainable anomaly reasons;
- sensor fault vs treatment anomaly classification.

These must not destabilize the core implementation.

---

## Sprint 16 — Week 32: Advanced DLT and Finalization — Future Scope

Optional extensions:

- advanced smart contracts/chaincode;
- role-based DLT permissions;
- advanced provenance;
- AI model/compliance-rule versioning enhancements;
- advanced tampering/failure testing;
- final integration;
- documentation;
- demonstration package.

---

# 36. Sprint Dependency Graph

```text
S1 Current-State Audit + Contracts
  ↓
S2 Dataset + Reproducibility
  ↓
S3 Simulator
  ↓
S4 Gateway + Standardization
  ↓
S5 Validation
  ↓
S6 AI
  ↓
S7 Compliance
  ↓
S8 Treatment + Certificate
  ↓
S9 PostgreSQL Integration
  ↓
S10 Crypto + Permissioned DLT
  ↓
S11 Verification + Corrections
  ↓
S12 Frontend Integration + RBAC
  ↓
S13 Architecture Comparison
  ↓
S14 Scalability + Performance
  ↓
S15–S16 Finalization / Future Scope
```

**Parallel track:** existing frontend integration begins during S4 and continues through S12. Dataset/provenance work begins in S1–S2. Test automation, observability and security review run continuously from S4 onward.

```text
S1/S2 ───────────────→ Existing React/Data Foundation
                         ↓
S4 API contracts ─────→ incremental real-data integration
                         ↓
S5–S11 trust pipeline → verification/corrections
                         ↓
S12 final UI/RBAC integration
```


# 37. Definition of Done

A module is not complete merely because its code exists.

Each module is done only when:

1. implementation exists;
2. API/service integration exists;
3. database persistence exists where required;
4. error handling exists;
5. unit tests exist;
6. integration tests exist where applicable;
7. audit behavior is defined;
8. role permissions are enforced where applicable;
9. documentation exists;
10. acceptance criteria pass;
11. no provisional/mock service remains in the core research workflow;
12. frontend behavior is backed by the canonical API contract;
13. evidence required for reproducibility is preserved.

---

# 38. End-to-End Acceptance Test

Create one reproducible demonstration:

### Stage 1

Load a public wastewater dataset.

### Stage 2

Generate an 8-STP simulation.

### Stage 3

Submit standardized readings.

### Stage 4

Run deterministic validation.

### Stage 5

Run Isolation Forest.

### Stage 6

Evaluate compliance.

### Stage 7

Generate finalized treatment record.

### Stage 8

Generate digital treatment certificate.

### Stage 9

Canonicalize.

### Stage 10

Generate SHA-256 hash.

### Stage 11

Digitally sign.

### Stage 12

Persist in PostgreSQL.

### Stage 13

Anchor hash/metadata on permissioned DLT.

### Stage 14

Verify certificate independently.

### Stage 15

Modify a protected field deliberately.

### Stage 16

Run verification again and demonstrate failure.

### Stage 17

Submit a legitimate correction.

### Stage 18

Create corrected record/certificate/hash/signature/DLT anchor.

### Stage 19

Verify both original and corrected lineage.

### Stage 20

Display the complete history in the dashboard.

---

# 39. Research Evidence Package

The final project should preserve evidence for:

- dataset provenance;
- simulator configuration;
- validation-rule versions;
- model version;
- compliance-rule versions;
- treatment records;
- certificates;
- hashes;
- signatures;
- DLT transaction IDs;
- correction lineage;
- benchmark configurations;
- benchmark raw outputs;
- processed metrics;
- screenshots;
- test reports.

This package is important for demonstrating reproducibility and supporting the final dissertation/project report.

---

# 40. Final Demonstration Sequence

The final demo should follow the research narrative rather than showing unrelated screens:

```text
1. Choose STP
2. Show incoming wastewater measurements
3. Show standardization
4. Show validation result
5. Show AI anomaly result
6. Show compliance result
7. Generate finalized treatment record
8. Generate digital treatment certificate
9. Show hash/signature
10. Show DLT transaction
11. Verify certificate
12. Modify a value and show verification failure
13. Create correction
14. Show original + corrected lineage
15. Show audit trail
16. Show architecture comparison
17. Show scalability results
```

---

# 41. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Public datasets lack all desired parameters | Medium | Document missing fields and use a consistent subset |
| DLT setup consumes excessive development time | High | Freeze Fabric scope early and keep payload minimal |
| AI results are unstable | High | Freeze preprocessing, seed/configuration and model version |
| Compliance thresholds are ambiguous | High | Externalize and version configuration |
| Hash changes due to serialization | Critical | Freeze canonicalization before certificate signing |
| DLT unavailable during finalization | High | Use pending-anchor state and reconciliation |
| Dashboard hides backend authorization flaws | High | Test authorization at API/service layer |
| Benchmarks are unfair | Critical | Use identical workload definitions and repeatable runs |
| Simulator is not reproducible | High | Seed all stochastic generation |
| Scope expands into forecasting/predictive maintenance | High | Keep those features explicitly future scope |

---

# 42. Final Deliverables

At project completion, the implementation package should contain:

## Software

- backend API;
- web dashboard;
- simulator;
- AI pipeline;
- validation engine;
- compliance engine;
- certificate service;
- cryptographic service;
- PostgreSQL schema/migrations;
- permissioned DLT network/chaincode;
- verification service;
- correction workflow;
- audit system.

## Research artifacts

- dataset documentation;
- simulator methodology;
- AI evaluation;
- compliance-rule documentation;
- architecture comparison;
- scalability benchmarks;
- integrity/tamper experiments;
- performance analysis.

## Documentation

- README;
- architecture document;
- API documentation;
- database documentation;
- DLT documentation;
- deployment guide;
- test report;
- benchmark report;
- final implementation plan;
- final sprint plan.

---

# 43. Objective-to-Implementation Traceability

| Objective | Implementation |
|---|---|
| O1 | Dataset ingestion + multi-STP simulator |
| O2 | Validation + anomaly pipeline before finalization/anchoring |
| O3 | StandardScaler + Isolation Forest |
| O4 | Configurable QA/compliance engine |
| O5 | Treatment records + certificates + SHA-256 + signatures |
| O6 | Permissioned DLT anchoring |
| O7 | Append-only correction service |
| O8 | FastAPI standardized data interface |
| O9 | Centralized/blockchain-centric/hybrid experiment runners |
| O10 | Role-based web dashboard |
| O11 | Integrity, latency, throughput, storage, verification, computational and scalability benchmarks |

---

# 44. Final Implementation Gate

The project is implementation-complete only when this chain works without manual database edits:

```text
Public Dataset
→ Preprocessing
→ Multi-STP Simulation
→ Standardized API
→ Validation
→ AI
→ Compliance
→ Finalized Treatment Record
→ Digital Treatment Certificate
→ Canonicalization
→ SHA-256
→ Digital Signature
→ PostgreSQL
→ Permissioned DLT
→ Independent Verification
→ Append-Only Correction
→ Re-verification
→ Audit History
→ Dashboard
→ Controlled Architecture Comparison
→ Scalability Evaluation
```

Any step that requires manually changing database rows, manually fabricating DLT transaction IDs, bypassing authorization, editing finalized records in place, or relying on mock services for a core research workflow is not considered a complete implementation.

---

# 45. Final Project Mental Model

The implementation can be understood through five questions:

### 1. Where did the data come from?

Public wastewater datasets are transformed into reproducible simulated decentralized treatment-facility streams.

### 2. Can the incoming data be trusted?

Deterministic validation checks data quality, while Isolation Forest identifies statistical anomalies.

### 3. Does the treatment satisfy configured quality requirements?

The QA/compliance engine evaluates measurements against versioned thresholds.

### 4. Can the finalized record be proven to remain unchanged?

Canonicalization, SHA-256, digital signatures and permissioned DLT anchoring create independently verifiable integrity evidence.

### 5. Can the architecture scale?

Controlled experiments compare centralized, blockchain-centric and hybrid designs at 8, 50, 100 and 500 STPs.

---

# 46. Implementation Freeze Rules

Once the project reaches the implementation freeze:

1. Do not change the canonicalization rules without a version change.
2. Do not change compliance thresholds without rule-version tracking.
3. Do not change the AI feature set without model/feature versioning.
4. Do not change the DLT payload during benchmark runs.
5. Do not change workload sizes mid-experiment.
6. Do not mix Fabric and Ethereum/Ganache implementation assumptions.
7. Do not silently add forecasting or predictive-maintenance functionality.
8. Do not compare architectures using different workloads.
9. Do not modify finalized records directly.
10. Record every material architectural change.

---

# 47. Final Outcome

The completed AquaTrust AI system should demonstrate a complete trust pipeline:

```text
DATA
  ↓
STANDARDIZATION
  ↓
VALIDATION
  ↓
AI ANOMALY DETECTION
  ↓
QUALITY ASSURANCE
  ↓
FINALIZED TREATMENT RECORD
  ↓
DIGITAL CERTIFICATE
  ↓
CRYPTOGRAPHIC INTEGRITY
  ↓
PERMISSIONED DLT PROOF
  ↓
INDEPENDENT VERIFICATION
  ↓
APPEND-ONLY CORRECTION
  ↓
AUDITABLE HISTORY
  ↓
EXPERIMENTAL EVALUATION
```

The research contribution is therefore not simply “using blockchain for wastewater.” The implementation demonstrates a structured trust-before-ledger workflow in which heterogeneous wastewater measurements are standardized, checked, analyzed, evaluated, finalized, cryptographically protected, anchored, independently verified and preserved through correction-aware history, followed by a measurable comparison of centralized, blockchain-centric and hybrid architectures.

---

# 48. Master Feature Disposition — KEEP / MODIFY / IMPROVE / DISCARD / BUILD

This section is the authoritative disposition register for the existing project. No feature should be removed, retained or redesigned ambiguously. The implementation team must use this table as the change-control baseline.

## 48.1 Existing repository and frontend

| Existing item / capability | Decision | Required action | Final role |
|---|---|---|---|
| React + Vite application | **KEEP** | Preserve framework and existing routing foundation | Primary web application |
| TypeScript | **KEEP** | Extend shared types from canonical API contracts | Frontend type safety |
| Tailwind CSS | **KEEP** | Preserve visual language; only improve where required for research workflows | UI styling |
| Recharts | **KEEP** | Connect charts to real API data | Monitoring/analytics visualization |
| Existing dashboard shell | **KEEP + MODIFY** | Preserve useful layout; replace mock data with API-backed data | Operator/auditor/regulator dashboard |
| Existing monitoring UI | **KEEP + MODIFY** | Feed standardized readings and backend results | Facility monitoring |
| Existing historical trend UI | **KEEP + MODIFY** | Use persisted PostgreSQL records and experiment fixtures | Historical monitoring |
| Existing compliance reference explorer | **KEEP + IMPROVE** | Connect to versioned compliance rules/reference data | Compliance/reference workflow |
| Existing sensors/alerts/treatment-status mock services | **DISCARD AS CORE IMPLEMENTATION** | Remove from production research path; optionally retain as development fixtures | Temporary mock fixtures only |
| Existing AI Insights mock behavior | **DISCARD AS CORE IMPLEMENTATION + REPLACE** | Replace with Isolation Forest inference API | Real anomaly intelligence |
| Existing frontend data files used directly by core workflows | **MODIFY** | Move authoritative data access behind API contracts | Frontend read model/fixtures |
| Existing Vercel frontend deployment configuration | **KEEP + MODIFY** | Keep if useful; point API base URL to deployed FastAPI service | Frontend deployment |
| Existing visual design work | **KEEP** | Do not redesign without functional reason | Presentation layer |
| Existing routes that map to final functions | **KEEP + MODIFY** | Preserve route semantics where sensible and connect to real services | Navigation |
| UI-only functionality with no final objective mapping | **REVIEW / DISCARD** | Remove only if it has no role in O1–O11 or documented future scope | Scope control |

## 48.2 Data and datasets

| Item | Decision | Required action |
|---|---|---|
| Bangalore STP dataset | **KEEP** | Treat as primary historical source; document provenance, schema, limitations and preprocessing |
| Indian water-quality reference dataset | **KEEP + MODIFY** | Use as a reference/compliance-support dataset; do not represent it as live facility telemetry |
| Public dataset preprocessing | **IMPROVE** | Make deterministic, versioned and reproducible |
| Dataset manifest | **BUILD** | Record source, retrieval date, checksum, fields, units, transformations and exclusions |
| Direct use of raw dataset as simulated live data | **MODIFY** | Route through simulator/scenario generation |
| Dataset values altered without provenance | **DISCARD** | Every transformation must be reproducible |
| Public data as proof of physical sensor truth | **DISCARD** | Public datasets support simulation/research; they do not establish physical truth |

## 48.3 Previously proposed AI/features

| Earlier feature | Decision | Reason / final treatment |
|---|---|---|
| Isolation Forest | **KEEP — CORE** | Explicit final objective |
| StandardScaler + Isolation Forest | **KEEP — CORE** | Primary anomaly pipeline |
| XGBoost water-quality prediction | **DISCARD FROM CORE** | Not part of final objectives |
| LSTM forecasting | **DISCARD FROM CORE** | Not part of final objectives |
| Predictive maintenance | **DISCARD FROM CORE** | Not part of final objectives |
| Equipment-failure prediction | **DISCARD FROM CORE** | Not part of final objectives |
| Separate maintenance dataset | **DISCARD FROM CORE** | No longer required by final scope |
| AI anomaly explanation | **FUTURE / OPTIONAL** | May be added only after core anomaly pipeline is stable |
| STP health/reliability score | **FUTURE / OPTIONAL** | Not a core objective |
| Network-level STP ranking | **FUTURE / OPTIONAL** | Do not allow it to consume core implementation time |

## 48.4 DLT and blockchain technology

| Existing/previous direction | Decision | Final treatment |
|---|---|---|
| Permissioned DLT | **KEEP — CORE** | Final architecture |
| Hyperledger Fabric | **KEEP — PRIMARY IMPLEMENTATION** | Primary permissioned DLT |
| Solidity | **DISCARD AS PRIMARY IMPLEMENTATION** | Only retain as historical proposal/reference if needed |
| Hardhat | **DISCARD AS PRIMARY IMPLEMENTATION** | Not needed for Fabric |
| Ganache | **DISCARD AS PRIMARY IMPLEMENTATION** | Not the final permissioned DLT environment |
| Ethereum-style public-chain architecture | **DISCARD FROM CORE** | Conflicts with final permissioned-DLT direction |
| Fabric development/test network | **KEEP** | Development and controlled experiments |
| Minimal on-chain payload | **KEEP** | Store proof/provenance metadata, not high-frequency raw telemetry |
| Hash anchoring | **KEEP — CORE** | Central integrity mechanism |
| DLT transaction ID | **KEEP** | Verification/audit evidence |
| Full raw sensor dataset on-chain | **DISCARD** | Storage/privacy/performance overhead; off-chain PostgreSQL is authoritative for detailed data |

## 48.5 Backend and trust pipeline

| Capability | Decision | Final action |
|---|---|---|
| FastAPI | **BUILD — CORE** | Canonical backend gateway and service layer |
| PostgreSQL | **BUILD — CORE** | Authoritative detailed application store |
| Deterministic validation | **BUILD — CORE** | Must run before finalization/anchoring |
| Quality status | **BUILD — CORE** | Separate from AI/compliance |
| Anomaly status | **BUILD — CORE** | Separate from quality/compliance |
| Compliance status | **BUILD — CORE** | Separate from quality/anomaly |
| Treatment records | **BUILD — CORE** | Finalized evidence object |
| Digital Treatment Certificate | **BUILD — CORE** | Human/machine-readable proof artifact |
| SHA-256 | **BUILD — CORE** | Hash finalized canonical representation |
| Digital signatures | **BUILD — CORE** | Sign certificate/record representation |
| Independent verification | **BUILD — CORE** | Recompute and compare independently |
| Append-only correction | **BUILD — CORE** | Never overwrite finalized records |
| Audit logging | **BUILD — CORE** | Record security and state transitions |
| Backend RBAC | **BUILD — CORE** | UI permissions are insufficient |

## 48.6 Dashboard and stakeholder workflows

| Feature | Decision | Final action |
|---|---|---|
| Operator dashboard | **KEEP + MODIFY** | Real-time/current simulation view backed by APIs |
| Auditor dashboard | **BUILD/MODIFY** | Verification, provenance, certificates, corrections and audit trail |
| Regulatory dashboard | **BUILD/MODIFY** | Compliance status, certificate verification, facility evidence |
| Verification page | **BUILD** | Independent certificate/record verification |
| Certificate page | **BUILD** | Display certificate identity, hash, signature and DLT reference |
| Audit history | **BUILD** | Show immutable lineage and actor/timestamp |
| Correction workflow UI | **BUILD** | Request → review → corrected record → re-anchor |
| AI insights page | **MODIFY** | Show actual anomaly scores/status/model version |
| Compliance page | **MODIFY** | Show rule version and parameter-level results |
| Generic analytics not mapped to objectives | **REVIEW** | Keep only if useful to O10/O11 |

## 48.7 Experiments

| Experiment capability | Decision |
|---|---|
| Centralized architecture runner | **BUILD — CORE** |
| Blockchain-centric architecture runner | **BUILD — CORE** |
| Hybrid architecture runner | **BUILD — CORE / PRIMARY RESEARCH ARCHITECTURE** |
| 8 STP workload | **BUILD — CORE** |
| 50 STP workload | **BUILD — CORE** |
| 100 STP workload | **BUILD — CORE** |
| 500 STP workload | **BUILD — CORE** |
| Integrity/tamper experiment | **BUILD — CORE** |
| Failure/recovery experiment | **BUILD — CORE** |
| Latency benchmark | **BUILD — CORE** |
| Throughput benchmark | **BUILD — CORE** |
| Storage-overhead benchmark | **BUILD — CORE** |
| Verification-time benchmark | **BUILD — CORE** |
| Computational-overhead benchmark | **BUILD — CORE** |
| Scalability analysis | **BUILD — CORE** |
| Uncontrolled architecture comparisons | **DISCARD** |
| Different workloads for different architectures | **DISCARD** |
| Non-repeatable benchmark runs | **DISCARD** |

---

# 49. Final System Architecture — Authoritative Version

The following architecture supersedes earlier architectural sketches and must be used consistently in code, documentation, diagrams, demonstrations and experiments.

```text
                         ┌───────────────────────────────┐
                         │      PUBLIC DATASETS          │
                         │ Bangalore STP / Reference DB  │
                         └───────────────┬───────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │ DATA PREPROCESSING + MANIFEST  │
                         │ cleaning / units / timestamps │
                         │ provenance / versioning       │
                         └───────────────┬───────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │       MULTI-STP SIMULATOR      │
                         │ 8 / 50 / 100 / 500 facilities│
                         │ normal + invalid + anomaly    │
                         │ deterministic scenario seeds  │
                         └───────────────┬───────────────┘
                                         │ canonical payload
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         FASTAPI DATA / TRUST GATEWAY                         │
│ authentication → schema validation → facility/sensor mapping → normalization│
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
                         ┌───────────────────────────────┐
                         │ STANDARDIZED DATA CONTRACT     │
                         │ facility / sensor / timestamp │
                         │ parameter / value / unit      │
                         │ source / provenance           │
                         └───────────────┬───────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │ DETERMINISTIC VALIDATION       │
                         │ range / missing / duplicate    │
                         │ sudden change / consistency    │
                         │ rule version                   │
                         └───────────────┬───────────────┘
                                         │
                         quality_status  │
                                         ▼
                         ┌───────────────────────────────┐
                         │ ISOLATION FOREST AI            │
                         │ StandardScaler → IF            │
                         │ anomaly score/status            │
                         │ model + feature-set versions   │
                         └───────────────┬───────────────┘
                                         │
                         anomaly_status  │
                                         ▼
                         ┌───────────────────────────────┐
                         │ QA / COMPLIANCE ENGINE          │
                         │ parameter thresholds           │
                         │ units / rules / violations     │
                         │ compliance rule version        │
                         └───────────────┬───────────────┘
                                         │
                     compliance_status   │
                                         ▼
                         ┌───────────────────────────────┐
                         │ FINALIZATION GATE               │
                         │ quality + AI + QA + provenance │
                         │ → Finalized Treatment Record  │
                         └───────────────┬───────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────┐
                         │ DIGITAL TREATMENT CERTIFICATE  │
                         │ certificate ID / status        │
                         │ evidence / versions / metadata │
                         └───────────────┬───────────────┘
                                         │
                         canonical representation
                                         ▼
                         ┌───────────────────────────────┐
                         │ CRYPTOGRAPHIC TRUST LAYER       │
                         │ canonicalization version       │
                         │ SHA-256                        │
                         │ digital signature              │
                         └──────────────┬────────────────┘
                                        │
                        ┌───────────────┴─────────────────┐
                        │                                 │
                        ▼                                 ▼
             ┌─────────────────────┐          ┌────────────────────────┐
             │      POSTGRESQL      │          │ PERMISSIONED DLT        │
             │ detailed records     │          │ Hyperledger Fabric      │
             │ readings             │          │ hash + selected metadata│
             │ validation/AI/QA     │          │ transaction ID          │
             │ certificates         │          │ immutable anchor        │
             │ corrections/audit    │          └───────────┬────────────┘
             └──────────┬──────────┘                      │
                        │                                 │
                        └──────────────┬──────────────────┘
                                       ▼
                         ┌───────────────────────────────┐
                         │ INDEPENDENT VERIFICATION       │
                         │ retrieve → canonicalize        │
                         │ → hash → signature → DLT      │
                         │ → VALID / FAILED / PENDING     │
                         └───────────────┬───────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
               OPERATOR               AUDITOR             REGULATOR
               dashboard              dashboard            dashboard
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         ▼
                         ┌───────────────────────────────┐
                         │ CORRECTIONS + AUDIT LINEAGE    │
                         │ original preserved             │
                         │ corrected record created      │
                         │ new certificate/hash/signature│
                         │ new DLT anchor                │
                         └───────────────────────────────┘

                         ───── RESEARCH LAYER ─────
                         Centralized / Blockchain-centric
                         / Hybrid experiment runners
                         ↓
                         8 / 50 / 100 / 500 STPs
                         ↓
                         integrity / latency / throughput
                         storage / verification / CPU-memory
                         scalability / failure-recovery
```

## 49.1 Layer responsibilities

### Layer 1 — Data source
Public wastewater datasets are the research input. They are not represented as live physical sensors.

### Layer 2 — Simulation
The simulator converts historical/public observations into controlled facility and sensor streams with reproducible scenarios.

### Layer 3 — Gateway
FastAPI provides the single canonical ingestion boundary.

### Layer 4 — Trust pipeline
Validation determines objective data-quality status. Isolation Forest determines statistical anomaly status. Compliance evaluates configured quality requirements.

### Layer 5 — Evidence generation
Only eligible treatment windows become finalized treatment records and certificates.

### Layer 6 — Cryptographic integrity
The finalized representation is canonicalized, hashed and digitally signed.

### Layer 7 — Storage
PostgreSQL stores detailed operational evidence. Fabric stores the tamper-evident proof/selected metadata needed for independent verification.

### Layer 8 — Verification
Verification is independent of the original creation process. It must recompute the hash and validate the signature and DLT anchor.

### Layer 9 — Governance
Corrections are new records linked to originals. Audit history is append-only.

### Layer 10 — Presentation
React provides role-specific views over API-backed evidence.

### Layer 11 — Research evaluation
The same logical workload is replayed through centralized, blockchain-centric and hybrid architectures.

---

# 50. Complete End-to-End Workflow — Every Core Function

## 50.1 Workflow A — Dataset ingestion and provenance

```text
Select public dataset
→ record source URL/name and retrieval metadata
→ checksum/raw-file capture
→ inspect schema
→ identify parameters
→ map units
→ map timestamps
→ identify missing fields
→ clean invalid rows
→ normalize values
→ save processed dataset
→ generate manifest
→ version preprocessing configuration
→ expose processed dataset to simulator
```

### Required evidence
- raw dataset;
- processed dataset;
- preprocessing script;
- manifest;
- parameter dictionary;
- transformation log;
- dataset version.

### Failure behavior
If a dataset lacks a required parameter, the system must document the limitation rather than silently inventing values.

---

## 50.2 Workflow B — Multi-STP simulation

```text
Choose workload size
→ choose dataset version
→ choose seed
→ choose scenario mix
→ generate facilities
→ assign sensors
→ generate readings
→ inject controlled scenarios
→ attach provenance
→ validate simulator output schema
→ persist fixture
→ calculate workload manifest
→ submit to gateway
```

### Workload sizes
- 8 STPs;
- 50 STPs;
- 100 STPs;
- 500 STPs.

### Scenarios
- normal;
- missing;
- duplicate;
- invalid range;
- sudden change;
- statistically anomalous;
- mixed workload.

### Simulator must never
- modify the original dataset;
- create non-reproducible random data;
- bypass the gateway;
- directly fabricate finalized treatment records.

---

## 50.3 Workflow C — Standardized API ingestion

```text
Simulator/source
→ authenticated request
→ request schema validation
→ facility identity validation
→ sensor identity validation
→ parameter normalization
→ unit normalization
→ timestamp normalization
→ provenance attachment
→ ingestion ID
→ persist raw/normalized observation
→ send standardized reading to trust pipeline
```

### Canonical reading

```json
{
  "facility_id": "STP-001",
  "sensor_id": "SENSOR-001",
  "timestamp": "2026-01-01T10:00:00Z",
  "parameter": "BOD",
  "value": 24.5,
  "unit": "mg/L",
  "source": "simulator",
  "dataset_version": "dataset-v1",
  "simulation_run_id": "SIM-001"
}
```

---

## 50.4 Workflow D — Deterministic validation

```text
Standardized reading
→ structural validation
→ range validation
→ missing-value validation
→ duplicate detection
→ temporal/sudden-change detection
→ consistency checks
→ validation flags
→ quality_status
→ validation-rule version
→ persist result
```

### Status model

At minimum:

```text
VALID
INVALID
INCOMPLETE
DUPLICATE
SUSPICIOUS
```

The exact enum must be frozen before implementation.

### Critical rule

Invalid data must not silently become trusted finalized evidence.

---

## 50.5 Workflow E — AI anomaly detection

```text
Eligible validated data
→ feature selection
→ feature-set version
→ preprocessing/scaling
→ Isolation Forest inference
→ anomaly score
→ anomaly threshold
→ anomaly_status
→ model version
→ inference timestamp
→ persist result
```

### Important distinction

```text
quality_status = data-quality judgment
anomaly_status = statistical-pattern judgment
```

An anomalous reading is not automatically invalid. A valid reading can be statistically unusual.

---

## 50.6 Workflow F — QA/compliance evaluation

```text
Validated/eligible treatment window
→ select compliance rule set
→ identify parameter requirements
→ normalize units
→ compare each parameter
→ generate parameter-level result
→ record violations
→ calculate overall compliance_status
→ record rule version
→ persist evidence
```

### Output

```text
parameter_result[]
overall_compliance_status
rule_version
evaluation_timestamp
```

Do not use compliance status as a substitute for anomaly status.

---

## 50.7 Workflow G — Treatment-record finalization

The finalization gate is the point where an observation set becomes a research-grade evidence record.

```text
Treatment window
→ confirm provenance
→ confirm validation results
→ attach AI result
→ attach compliance result
→ attach processing versions
→ calculate record identity
→ construct immutable logical record
→ finalization authorization
→ status = FINALIZED
```

The finalized record must contain enough metadata to reproduce how the result was produced.

---

## 50.8 Workflow H — Digital Treatment Certificate

```text
Finalized treatment record
→ generate certificate ID
→ generate certificate payload
→ include facility + period + statuses
→ include evidence/version metadata
→ persist certificate
→ prepare canonical representation
```

The certificate is a presentation/evidence object. It is not the DLT itself.

---

## 50.9 Workflow I — Canonicalization and hashing

```text
Certificate/finalized record
→ select signed fields
→ normalize field order
→ normalize timestamps
→ normalize number representation
→ normalize strings
→ remove nondeterministic fields
→ serialize using frozen canonicalization version
→ calculate SHA-256
→ persist canonicalization version + hash
```

### Critical rule

Two independent implementations given the same signed representation must produce the same canonical bytes and hash.

---

## 50.10 Workflow J — Digital signature

```text
Canonical bytes
→ load authorized signing identity
→ sign canonical representation/hash
→ store signature
→ store signer identity/reference
→ store signature algorithm/version
→ audit signing event
```

Private keys must never be committed to the repository.

---

## 50.11 Workflow K — PostgreSQL persistence

PostgreSQL is the detailed application source of truth for off-chain evidence.

Recommended logical entities:

```text
facilities
sensors
dataset_versions
simulation_runs
raw_readings
normalized_readings
validation_results
model_versions
anomaly_results
compliance_rules
compliance_results
treatment_records
certificates
cryptographic_artifacts
dlt_anchors
correction_requests
audit_logs
users
roles
permissions
experiment_runs
experiment_metrics
```

Relationships must preserve provenance from dataset → simulation → reading → analysis → certificate → anchor.

---

## 50.12 Workflow L — Permissioned DLT anchoring

```text
Signed finalized certificate
→ create anchor payload
→ include record/certificate ID
→ include SHA-256
→ include selected metadata
→ submit Fabric transaction
→ receive transaction ID
→ persist transaction ID
→ update anchor status
→ expose anchor to verification
```

### Anchor states

```text
PENDING
SUBMITTED
CONFIRMED
FAILED
RECONCILIATION_REQUIRED
```

### DLT failure

A temporary DLT failure must not corrupt the PostgreSQL finalized record. The record remains finalized with an explicit anchor-pending/failed state until reconciliation according to the final state-machine rules.

---

## 50.13 Workflow M — Independent verification

```text
Verifier submits certificate/record ID
→ retrieve PostgreSQL evidence
→ retrieve DLT anchor
→ reconstruct canonical representation
→ recompute SHA-256
→ compare against stored hash
→ verify digital signature
→ compare hash with DLT anchor
→ validate certificate/record state
→ produce verification result
→ write verification event to audit log
```

### Verification outcomes

```text
VERIFIED
HASH_MISMATCH
SIGNATURE_INVALID
ANCHOR_NOT_FOUND
ANCHOR_MISMATCH
RECORD_NOT_FOUND
CORRECTION_SUPERSEDED
PENDING
```

### Tamper demonstration

If a protected PostgreSQL field is deliberately changed after anchoring:

```text
modified DB value
→ canonical representation changes
→ recomputed SHA-256 changes
→ DLT hash remains original
→ verification fails
```

This demonstrates record-integrity detection. It does **not** prove physical sensor truth.

---

## 50.14 Workflow N — Append-only correction

```text
Original finalized record
→ correction request
→ reason + evidence
→ authorized reviewer
→ approve/reject
→ if approved:
      create new record
      link original_record_id
      preserve original
      re-run required validation
      re-run AI/QA when affected
      create corrected certificate
      canonicalize
      hash
      sign
      anchor new version
      mark original as SUPERSEDED_BY_CORRECTION
→ update lineage
→ audit every transition
```

Never:

```text
UPDATE finalized_record SET value = ...
```

as a mechanism for changing finalized evidence.

---

## 50.15 Workflow O — Audit logging

Every security/research-significant transition should create an audit event:

```text
actor
role
timestamp
action
entity_type
entity_id
previous_state
new_state
request_id
reason
metadata
```

Examples:

- ingestion;
- validation;
- model inference;
- compliance evaluation;
- finalization;
- signing;
- DLT anchoring;
- verification;
- correction request;
- correction approval;
- correction rejection;
- role/permission change.

---

## 50.16 Workflow P — Operator workflow

```text
Login
→ authorized facility view
→ select facility
→ inspect current readings
→ inspect quality status
→ inspect anomaly status
→ inspect compliance status
→ open treatment record
→ generate/follow certificate lifecycle
→ inspect anchor status
→ verify record
→ submit correction if permitted
```

Operator permissions must never allow direct modification of finalized evidence.

---

## 50.17 Workflow Q — Auditor workflow

```text
Login
→ search facility/record/certificate
→ inspect provenance
→ inspect validation result
→ inspect AI result/model version
→ inspect compliance/rule version
→ inspect certificate
→ independently verify
→ inspect DLT transaction
→ inspect correction lineage
→ inspect audit history
```

The auditor must be able to verify evidence without changing it.

---

## 50.18 Workflow R — Regulatory stakeholder workflow

```text
Login
→ select facility
→ view compliance history
→ inspect finalized certificates
→ verify selected certificate independently
→ inspect rule version
→ inspect violations
→ inspect correction history
→ inspect DLT proof
→ export/report evidence
```

Regulatory workflows must remain evidence-oriented rather than operational-control-oriented.

---

## 50.19 Workflow S — Frontend API integration

The frontend must stop treating static/mock services as authoritative.

```text
React page
→ API client
→ authenticated request
→ FastAPI
→ service layer
→ PostgreSQL/DLT/AI as required
→ response DTO
→ React state
→ chart/table/detail component
```

Static files may remain for:
- local development fixtures;
- offline UI tests;
- deterministic demo fallback where explicitly labeled.

They must not be the source of truth for the final research workflow.

---

## 50.20 Workflow T — Experimental evaluation

```text
Freeze dataset version
→ freeze simulator seed/configuration
→ generate logical workload
→ execute centralized architecture
→ collect metrics
→ reset environment
→ execute blockchain-centric architecture
→ collect metrics
→ reset environment
→ execute hybrid architecture
→ collect metrics
→ repeat runs
→ calculate statistics
→ compare architectures
→ run integrity/tamper tests
→ run failure/recovery tests
→ analyze scalability
→ preserve raw + processed results
```

The architecture comparison must measure the same logical workload and use documented environment/methodology controls.

---

# 51. Architecture Comparison — Exact Experimental Definitions

## 51.1 Centralized architecture

```text
Dataset
→ Simulator
→ FastAPI
→ Validation
→ AI
→ QA
→ Finalized Record
→ PostgreSQL
→ Verification
```

No DLT anchor is used.

Purpose: establish the conventional centralized baseline.

## 51.2 Blockchain-centric architecture

```text
Dataset
→ Simulator
→ Gateway
→ Validation
→ AI
→ QA
→ treatment evidence
→ DLT-oriented storage/transactions
→ verification
```

The implementation must explicitly document what evidence is placed on the ledger and measure the resulting storage, latency and throughput overhead.

Purpose: establish the ledger-heavy comparison baseline.

## 51.3 Hybrid architecture

```text
Dataset
→ Simulator
→ Gateway
→ Validation
→ AI
→ QA
→ Finalized Record
→ PostgreSQL detailed evidence
→ certificate
→ SHA-256/signature
→ Fabric hash/selected metadata anchor
→ verification
```

Purpose: evaluate the final AquaTrust AI architecture.

## 51.4 Fairness controls

All three architectures must use:

- same dataset version;
- same simulator seed;
- same facility counts;
- same scenario distribution;
- same logical records;
- same machine/environment class where practical;
- same measurement definitions;
- same number of repeated runs;
- documented warm-up policy;
- documented failure/retry policy.

---

# 52. Final Data Model and Evidence Lineage

## 52.1 Core lineage

```text
dataset_version
      ↓
simulation_run
      ↓
facility
      ↓
sensor
      ↓
raw_reading
      ↓
normalized_reading
      ↓
validation_result
      ↓
anomaly_result
      ↓
compliance_result
      ↓
treatment_record
      ↓
certificate
      ↓
cryptographic_artifact
      ↓
dlt_anchor
      ↓
verification_event
```

Correction branch:

```text
original_treatment_record
      ↓
correction_request
      ↓
corrected_treatment_record
      ↓
new_certificate
      ↓
new_cryptographic_artifact
      ↓
new_dlt_anchor
```

## 52.2 Mandatory provenance fields

Every finalized evidence object should be able to resolve:

```text
dataset_version
simulation_run_id
facility_id
sensor_ids / source IDs
time window
validation_rule_version
model_version
feature_set_version
compliance_rule_version
application_version
canonicalization_version
hash
signature metadata
DLT network/channel/reference
DLT transaction ID
```

---

# 53. Function-by-Function Frontend Completion Map

The current frontend should be completed according to function rather than page count.

| Frontend function | Data source after completion | Action |
|---|---|---|
| Dashboard KPI cards | PostgreSQL/API aggregation | Replace mock values |
| Facility list | Facilities API | Connect |
| Facility detail | Facility + readings APIs | Connect |
| Monitoring trends | normalized readings API | Connect |
| Alerts/anomalies | anomaly API | Replace mock service |
| Compliance view | compliance API | Connect |
| Treatment records | treatment-record API | Build/connect |
| Certificate view | certificate API | Build/connect |
| Hash/signature display | crypto artifact API | Build/connect |
| DLT anchor display | DLT anchor API | Build/connect |
| Verification | verification API | Build |
| Corrections | correction API | Build |
| Audit history | audit API | Build |
| Operator actions | authorized mutation APIs | Connect with RBAC |
| Auditor views | read-only evidence APIs | Build/connect |
| Regulatory views | compliance/evidence APIs | Build/connect |
| AI insights | Isolation Forest API | Replace provisional data |
| Reference explorer | versioned dataset/rule APIs | Improve |

---

# 54. API Surface — Implementation Contract

The exact implementation framework may vary internally, but the public contract should follow a stable `/api/v1` structure.

## 54. API Surface

The authoritative API surface is defined exclusively by `MASTER/API_ENDPOINT_REGISTRY.md`. This master specification intentionally does not duplicate endpoint paths or request/response schemas. Agents must not infer, invent, rename, or preserve superseded endpoint paths from earlier project drafts.

# 55. Final Implementation Rules — What Must Never Happen

The following are explicit stop conditions.

1. Do not continue building core functionality on mock services.
2. Do not introduce XGBoost/LSTM/predictive maintenance into the core pipeline.
3. Do not switch the final DLT architecture back to Ganache/Solidity merely because it is easier.
4. Do not place the detailed high-frequency telemetry dataset on-chain.
5. Do not overwrite finalized treatment records.
6. Do not allow the UI to bypass backend authorization.
7. Do not fabricate DLT transaction IDs for demonstrations.
8. Do not claim a hash proves physical sensor truth.
9. Do not merge `quality_status`, `anomaly_status` and `compliance_status`.
10. Do not compare architectures using different workloads.
11. Do not call a module complete because its UI exists.
12. Do not mark a certificate as fully anchored when the Fabric transaction is only pending/failed.
13. Do not change canonicalization after records have been used for benchmark evidence without versioning the change.
14. Do not silently alter public datasets without a preprocessing/provenance record.
15. Do not make future-scope features a dependency for the core research objectives.

---

# 56. Final Project Workflow — One Complete Story

The final system must be explainable as one continuous research story:

```text
PUBLIC WASTEWATER DATA
        ↓
DATASET PROVENANCE
        ↓
PREPROCESSING
        ↓
MULTI-STP SIMULATION
        ↓
STANDARDIZED INGESTION
        ↓
DATA VALIDATION
        ↓
quality_status
        ↓
ISOLATION FOREST
        ↓
anomaly_status
        ↓
QA / COMPLIANCE
        ↓
compliance_status
        ↓
FINALIZATION GATE
        ↓
FINALIZED TREATMENT RECORD
        ↓
DIGITAL TREATMENT CERTIFICATE
        ↓
CANONICAL REPRESENTATION
        ↓
SHA-256
        ↓
DIGITAL SIGNATURE
        ↓
POSTGRESQL DETAILED EVIDENCE
        +
HYPERLEDGER FABRIC ANCHOR
        ↓
INDEPENDENT VERIFICATION
        ↓
OPERATOR / AUDITOR / REGULATOR
        ↓
CORRECTION WHEN NECESSARY
        ↓
NEW VERSION + NEW CERTIFICATE
        ↓
NEW HASH + NEW SIGNATURE
        ↓
NEW DLT ANCHOR
        ↓
ORIGINAL + CORRECTED LINEAGE PRESERVED
        ↓
AUDIT TRAIL
        ↓
CONTROLLED ARCHITECTURE COMPARISON
        ↓
8 / 50 / 100 / 500 STP BENCHMARKS
        ↓
INTEGRITY + PERFORMANCE + SCALABILITY EVIDENCE
        ↓
FINAL RESEARCH CONCLUSION
```

This is the authoritative end-to-end workflow. Any implementation that cannot traverse this path without manual database edits, fabricated ledger records, or bypassed authorization is incomplete.

---

# 57. Final Architecture Freeze

Before Sprint 3 begins, the following decisions must be frozen:

| Decision | Frozen choice |
|---|---|
| Primary UI | Existing React + TypeScript + Vite |
| UI styling | Existing Tailwind foundation |
| Charting | Existing Recharts foundation |
| Backend | FastAPI |
| Database | PostgreSQL |
| AI | StandardScaler + Isolation Forest |
| Primary DLT | Hyperledger Fabric |
| Hash | SHA-256 |
| Signature | Versioned digital-signature implementation |
| Detailed data storage | PostgreSQL |
| Ledger payload | Hash + selected treatment/provenance metadata |
| Core roles | Operator, Auditor, Regulatory Stakeholder |
| Simulation scale | 8 / 50 / 100 / 500 STPs |
| Core AI parameters | BOD, COD, TSS, pH, ammoniacal nitrogen, total nitrogen |
| Correction model | Append-only |
| Architecture comparison | Centralized / Blockchain-centric / Hybrid |
| Core statuses | quality_status / anomaly_status / compliance_status |
| Certificate terminology | Digital Treatment Certificate |
| Finalization terminology | Finalized Treatment Record |

After this freeze, any technology substitution requires an explicit architecture decision record and must not silently alter the research design.

---

# 58. Final Completion Definition

AquaTrust AI is complete only when all of the following are simultaneously true:

### Existing foundation
- existing useful frontend is retained and integrated;
- datasets are provenance-controlled;
- mock services are removed from the core research path.

### Data pipeline
- simulator works at all four scales;
- standardized API works;
- deterministic validation works;
- reproducibility is demonstrated.

### AI
- Isolation Forest is trained, versioned and evaluated;
- anomaly inference is persisted and reproducible.

### QA
- compliance rules are configurable and versioned;
- parameter-level and overall compliance results are persisted.

### Evidence
- finalized treatment records are immutable by application semantics;
- digital certificates are generated;
- canonicalization is deterministic;
- SHA-256 is reproducible;
- signatures are verifiable.

### DLT
- Fabric network is operational;
- finalized evidence is anchored;
- transaction IDs are persisted;
- anchor failures are handled without corrupting records.

### Verification
- independent verification succeeds for valid records;
- tampering produces a verification failure;
- signature/hash/DLT mismatch states are distinguishable.

### Corrections
- corrections create new records;
- original records remain preserved;
- lineage is visible;
- corrected records are revalidated/re-certified/re-anchored as required.

### Security
- backend RBAC is enforced;
- secrets and private keys are protected;
- audit logging exists.

### Frontend
- operator workflow is API-backed;
- auditor workflow is API-backed;
- regulatory workflow is API-backed;
- verification/certificate/correction/audit views are functional.

### Research
- centralized, blockchain-centric and hybrid architectures are implemented;
- identical logical workloads are benchmarked;
- 8/50/100/500 STP workloads are measured;
- integrity, latency, throughput, storage, verification time, computational overhead and scalability are reported;
- raw and processed experimental evidence is preserved.

### Final demonstration
The entire workflow can be executed from public dataset to verified certificate and then through a deliberate tamper test and append-only correction without manually editing database evidence or fabricating ledger results.

---

# 59. Final Instruction to the Implementation Agent

When this plan is supplied to an implementation agent, the agent must work in the following order:

```text
1. Inspect current repository.
2. Map every existing file/feature to this disposition register.
3. Produce a gap report.
4. Freeze shared contracts.
5. Preserve KEEP items.
6. Modify IMPROVE/MODIFY items.
7. Remove DISCARD items only after confirming they are not required by the final UI.
8. Build missing CORE services.
9. Integrate each service into the existing frontend.
10. Add tests at every boundary.
11. Produce evidence for every completed objective.
12. Run the final end-to-end workflow.
13. Run tamper/correction tests.
14. Run architecture comparison experiments.
15. Run 8/50/100/500 scalability tests.
16. Update documentation and research evidence.
```

The implementation agent must never silently redefine the research objectives or introduce previously discarded technologies/features into the core system.



### Added v2.1.2 authoritative contract
- `VALIDATION_SPECIFICATION.md` — deterministic pre-AI data-trust validation rules, versioning and change-control requirements.
