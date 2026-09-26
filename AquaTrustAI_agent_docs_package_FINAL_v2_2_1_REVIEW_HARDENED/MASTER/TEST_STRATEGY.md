# AquaTrust AI — Test Strategy and Evidence Standard

**Status:** AUTHORITATIVE — v2.2.1 engineering freeze

## 1. Test layers

1. Unit tests — deterministic service/function behavior.
2. Contract tests — API/schema compatibility.
3. Database tests — constraints, migrations, transaction boundaries.
4. Integration tests — service-to-service boundaries.
5. DLT integration tests — Fabric submission/query/reconciliation.
6. End-to-end tests — dataset/simulator → verified certificate.
7. Security/RBAC tests — positive and negative authorization.
8. Performance tests — controlled experiment protocol.
9. Regression tests — existing functionality after each phase.

## 2. Mandatory end-to-end path

```text
approved dataset
→ preprocessing
→ simulator
→ ingestion
→ validation
→ anomaly detection
→ compliance
→ finalized record
→ certificate
→ hash/signature
→ PostgreSQL
→ Fabric anchor
→ independent verification
→ correction
→ new record/certificate/anchor
```

## 3. Evidence requirements

A completion report is valid only when it references:
- test command;
- test identifier or suite;
- pass/fail result;
- relevant commit SHA;
- environment where material;
- artifact/log/screenshot location where needed.

Statements such as “works” without evidence do not satisfy the completion gate.

## 4. Contract tests

Contract tests must cover:
- field names/types;
- required/optional behavior;
- enum values;
- timestamp format;
- decimal serialization;
- error structure;
- authorization response semantics.

## 5. Integrity tests

Mandatory:
- tampered reading changes verification result;
- tampered protected metadata changes verification result;
- reordered JSON keys do not change canonical hash;
- original record remains after correction;
- corrected record has distinct ID/hash/signature;
- DLT anchor points to the expected hash.

## 6. Concurrency/idempotency tests

Test:
- duplicate ingestion request;
- duplicate finalize command;
- duplicate correction command;
- simultaneous finalization attempts;
- simultaneous correction authorization;
- DLT retry after timeout.

## 7. Failure tests

At minimum:
- database unavailable;
- AI model unavailable;
- invalid input;
- compliance rule missing;
- Fabric unavailable;
- Fabric returns failure;
- stale authorization;
- corrupted certificate;
- missing DLT anchor.

## 8. Regression gate

A phase cannot be marked complete if it breaks a previous phase's tests unless the change is explicitly approved and all dependent tests are updated through change control.

## 9. Final acceptance

Phase 16 must map every objective O1–O11 to one or more executable acceptance tests and evidence artifacts.
