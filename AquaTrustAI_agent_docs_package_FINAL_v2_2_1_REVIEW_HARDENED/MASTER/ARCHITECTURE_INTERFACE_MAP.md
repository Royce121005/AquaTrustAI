# AquaTrust AI — Architecture Interface Map

**Status:** AUTHORITATIVE — v2.2.1 engineering freeze

This document freezes the boundaries between major AquaTrust AI components. A phase may implement an interface, but may not silently redefine it.

## 1. Boundary map

| Boundary | Producer | Consumer | Input | Output | Persistence | Owner phase |
|---|---|---|---|---|---|---|
| Dataset → preprocessing | dataset adapter | preprocessing service | source rows + provenance + record classification | normalized records | dataset metadata | P02 |
| Preprocessing → simulator | preprocessing service | simulator | approved parameter distributions/records | deterministic simulation fixtures | scenario metadata | P03 |
| Simulator → gateway | simulator | FastAPI | canonical readings including treatment-stage semantics where known | ingestion result | ingestion batch + readings | P04 |
| Gateway → validation | API/domain service | validation service | canonical reading | validation result | validation_results | P05 |
| Validation → anomaly | validation service | ML service | valid/processable readings + feature context | anomaly result | anomaly_results + model metadata | P06 |
| Validation/AI → compliance | domain service | compliance engine | readings + validation/anomaly context + rule set | compliance result | compliance_results | P07 |
| Pipeline → treatment record | domain service | record service | evidence bundle | immutable finalized record | treatment_records | P08 |
| Record → certificate/crypto | record service | crypto service | frozen record payload | certificate + hash + signature | certificates + crypto metadata | P09 |
| Signed record → DLT | anchor service | Fabric Gateway/chaincode | compact anchor payload | transaction reference/status | dlt_anchors | P10 |
| Record + DLT → verification | verification service | API/UI | record/certificate identifier + trusted signing-key lookup | verification result | audit event | P11 |
| Verification/correction → frontend | API | React client | authenticated request | DTOs + status/error | none in frontend | P12 |
| API → authorization | auth middleware/policy | every protected endpoint | principal + permission + resource | allow/deny | auth/audit metadata | P13 |
| Experiment runner → architecture adapters | benchmark runner | three architecture adapters | fixed workload | metrics + evidence | experiment_runs/metrics | P14–P15 |

## 2. Canonical service responsibilities

### Ingestion service
- Accept only canonical reading schema.
- Assign/validate ingestion batch identifiers.
- Never perform compliance decisions.
- Never sign or anchor records.

### Validation service
- Deterministic checks only.
- Must be reproducible from input + validation rule version.
- Produces `quality_status`; it must not write `anomaly_status` or `compliance_status`.

### AI service
- Isolation Forest only for the approved six parameters.
- Produces anomaly evidence and model/version metadata.
- Does not decide regulatory compliance.

### Compliance service
- Evaluates versioned rules.
- Produces parameter-level and aggregate compliance results.
- Does not alter source readings.

### Record service
- Constructs the immutable evidence bundle.
- Defines finalization state according to `DATABASE_SCHEMA.md` and `CRYPTOGRAPHY_SPECIFICATION.md`.

### Crypto service
- Canonicalizes exactly the protected record representation.
- Computes SHA-256.
- Signs the digest/payload according to the frozen algorithm.
- Does not create DLT transactions.

### DLT anchor service
- Anchors only finalized signed records.
- Never manufactures transaction IDs.
- Maintains explicit pending/submitted/confirmed/failed/reconciliation states.

### Verification service
- Independently recomputes hash and verifies signature.
- Compares the recomputed hash with the stored PostgreSQL hash and DLT anchor.
- Returns structured verification evidence.

## 3. Interface invariants

1. All timestamps crossing service boundaries are ISO 8601 UTC.
2. IDs are UUIDs unless a protocol requires a provider-specific identifier.
3. Enumerations are lower_snake_case strings at API boundaries.
4. Decimal measurements are not converted to binary floating-point strings for canonical hashing.
5. Source provenance travels with the evidence lineage.
6. A downstream service may reject invalid input; it may not silently repair evidence.
7. A breaking contract change requires change control.
8. The frontend cannot be the source of truth for AI, compliance, cryptography, finalization or DLT state.

## 4. Failure semantics

Every boundary must distinguish:
- invalid request/data;
- transient dependency failure;
- permanent processing failure;
- authorization failure;
- duplicate/idempotent request;
- reconciliation-required state.

A failure must be observable in logs/audit evidence and must not result in fabricated success.
