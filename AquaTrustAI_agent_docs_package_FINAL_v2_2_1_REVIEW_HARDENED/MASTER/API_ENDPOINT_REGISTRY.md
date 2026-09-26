# AquaTrust AI — API Endpoint Registry

**Status:** AUTHORITATIVE — v2.2.1 engineering freeze
**Base path:** `/api/v1`
**Transport:** HTTPS in deployed environments; HTTP permitted only for local development.

This registry is the endpoint-level contract. Implementations must not invent parallel endpoints for the same capability.


## Authorization Authority

Endpoint authorization MUST conform to `RBAC_PERMISSION_MATRIX.md`.

- Human user authorization is evaluated using the defined end-user roles: `operator`, `auditor`, and `regulatory_stakeholder`.
- `service_identity` is an infrastructure identity, not an interactive end-user role.
- Research execution endpoints are invoked by the designated research `service_identity`; research execution is not exposed as an end-user role.
- DLT reconciliation is restricted to the authority defined by the RBAC matrix (auditor/regulatory stakeholder where applicable) and/or the designated service identity for automated reconciliation.
- If an endpoint table in this document conflicts with `RBAC_PERMISSION_MATRIX.md`, implementation MUST STOP and the discrepancy must be resolved through `CHANGE_CONTROL.md`; the agent must not invent a role mapping.


## 1. Conventions

- JSON request/response unless explicitly marked otherwise.
- `Authorization: Bearer <token>` for protected endpoints.
- `X-Request-ID` accepted and propagated; generated when absent.
- `Idempotency-Key` required for externally retried create/finalize/correction/anchor commands where specified.
- Pagination uses `page`, `page_size`, and stable ordering.
- Errors use `{error_code, message, details, request_id}`.

## 2. Endpoint registry

| Method | Path | Purpose | Required role | Idempotency |
|---|---|---|---|---|
| GET | `/health` | service health | public/local | n/a |
| GET | `/facilities` | list authorized facilities | all authenticated | n/a |
| GET | `/facilities/{facility_id}` | facility detail | all authenticated with scope | n/a |
| GET | `/facilities/{facility_id}/readings` | readings | scoped roles | n/a |
| POST | `/ingestion/readings` | ingest canonical readings | operator/service_identity | yes |
| POST | `/validation/readings/{reading_id}` | run deterministic validation | service_identity | yes |
| GET | `/validation/readings/{reading_id}` | validation result | scoped roles | n/a |
| GET | `/anomalies/readings/{reading_id}` | anomaly result | scoped roles | n/a |
| POST | `/anomalies/infer` | run approved model inference | service_identity | yes |
| GET | `/compliance/rules` | list applicable rules | authenticated | n/a |
| POST | `/compliance/evaluate` | evaluate evidence against rules | service_identity | yes |
| GET | `/treatment-records` | list authorized records | all scoped roles | n/a |
| GET | `/treatment-records/{record_id}` | record detail | all scoped roles | n/a |
| POST | `/treatment-records/finalize` | create immutable finalized record | operator/service_identity | yes |
| GET | `/certificates/{certificate_id}` | certificate | all scoped roles | n/a |
| POST | `/verification/records/{record_id}` | independently verify | auditor/regulatory/operator scoped | no |
| GET | `/verification/records/{record_id}/history` | verification history | auditor/regulatory | n/a |
| GET | `/verification/keys/{key_id}` | public signing key for independent verification | public/verification service | n/a |
| POST | `/corrections` | request correction | operator/auditor as permitted | yes |
| GET | `/corrections/{correction_id}` | correction detail | authorized | n/a |
| POST | `/corrections/{correction_id}/authorize` | authorize correction | designated authorized role | yes |
| POST | `/corrections/{correction_id}/execute` | create corrected record | service_identity | yes |
| GET | `/audit-events` | audit history | auditor/regulatory_stakeholder | n/a |
| GET | `/dlt/anchors/{record_id}` | anchor status/details | auditor/regulatory/scoped | n/a |
| POST | `/dlt/anchors/{record_id}/reconcile` | retry/reconcile anchor | auditor/regulatory_stakeholder/service_identity | yes |
| GET | `/experiments/{experiment_run_id}` | experiment run | service_identity | n/a |
| GET | `/experiments/{experiment_run_id}/metrics` | experiment metrics | service_identity | n/a |

## 3. Command payload contracts

### Canonical reading ingestion
Required:
```json
{
  "facility_id": "uuid",
  "sensor_id": "uuid-or-null",
  "observed_at": "ISO-8601 UTC",
  "treatment_stage": "inlet|primary_treatment|secondary_treatment|final_effluent|other|unknown|null",
  "parameter": "BOD|COD|TSS|pH|ammoniacal_nitrogen|total_nitrogen",
  "value": "decimal",
  "unit": "string",
  "source": "dataset|simulator|facility_adapter",
  "provenance": {}
}
```

### Finalization command
Must reference existing evidence identifiers and versions rather than accepting client-computed compliance/hash/signature values as authoritative.

### Correction command
Must include original record ID, reason, proposed changes, and actor context. The server decides authorization and creates the corrected record.

## 4. Independent verification-key semantics

`GET /verification/keys/{key_id}` returns only public verification metadata:

```text
key_id
algorithm
curve
public_key
fingerprint
status
created_at
revoked_at
```

Private keys are never returned by any API.

A verifier must validate the key fingerprint/identity according to the configured trust policy before accepting a signature as independently verifiable.

## 5. HTTP semantics

- `200`: successful read/action.
- `201`: resource created.
- `202`: accepted asynchronous DLT/long-running operation.
- `400`: malformed/invalid request.
- `401`: unauthenticated.
- `403`: authenticated but unauthorized.
- `404`: resource not found or not visible to caller.
- `409`: state conflict/idempotency conflict.
- `422`: semantic validation failure.
- `429`: rate limited.
- `500/503`: server/dependency failure; never report success.

## 6. Security invariants

Frontend role checks are UX only. Backend authorization is authoritative.

Never accept from the client as authoritative:
- compliance status;
- anomaly status;
- final hash;
- digital signature;
- DLT transaction ID;
- privileged actor identity.

## 7. API versioning

Breaking changes require a new API version or explicit compatibility plan. Additive fields should be backward-compatible and covered by contract tests.

## 8. Frozen authorization rules
- Treatment-record finalization is permitted to an `operator` for records within that operator's authorized facility scope, only when `FINALIZATION_POLICY.md` permits finalization.
- Correction requests may be created by authorized users in scope. Correction authorization is performed only by a configured `auditor` or `regulatory_stakeholder`; the requester cannot authorize their own correction.
- DLT reconciliation is restricted to `auditor` and `regulatory_stakeholder` within authorized scope.
- Experiment execution uses an infrastructure/research execution identity, not an end-user RBAC role.
