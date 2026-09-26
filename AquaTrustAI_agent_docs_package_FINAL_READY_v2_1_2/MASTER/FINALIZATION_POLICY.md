# AquaTrust AI — Finalization Policy


## Canonical Status Values and Finalized-State Immutability

The canonical API status values are lower_snake_case:

- `quality_status`: `valid` | `invalid`
- `anomaly_status`: `normal` | `anomalous`
- `compliance_status`: `compliant` | `non_compliant`

Uppercase forms such as `VALID`, `ANOMALOUS`, and `COMPLIANT` may be used only as internal symbolic constants if the implementation language requires them. They MUST serialize to the canonical API values above.

### Finalized record and correction semantics

A finalized TreatmentRecord is immutable with respect to its evidence and cryptographic identity. In particular, the following MUST NOT be edited in place after finalization:

- measurement/evidence snapshot
- provenance fields
- AI result/model metadata
- compliance result/rule-set evidence
- canonical representation
- content hash
- signature
- DLT anchor/reference

A correction MAY update only the lineage/state metadata needed to identify that the finalized record has been superseded by a correction, provided the database schema and audit trail preserve the original finalized evidence exactly.

The correction flow is:

`finalized original → correction request → authorized correction → new draft record → validation/AI/compliance → cryptographic finalization → new finalized corrected record → lineage link to original`

The original record remains independently verifiable and MUST remain retrievable. No UPDATE/DELETE may alter its protected evidence or cryptographic identity.


## Record lifecycle prerequisite

A draft TreatmentRecord is created before compliance evaluation. ComplianceResult therefore references an existing draft record. Finalization changes that record from `eligible_for_finalization` to `finalized`; it does not create the first TreatmentRecord. This avoids a circular dependency between compliance results and treatment records.

**Status:** AUTHORITATIVE / FROZEN
**Version:** 2.1.1

## Purpose
Define exactly when a Treatment Record may become `FINALIZED`. No phase or agent may invent an alternative finalization rule.

## Required inputs
A record must have: validated standardized measurements, validation result, anomaly result for every required parameter, compliance result, provenance metadata, processing/model/rule versions, and a deterministic record identifier.

## Status semantics
- `quality_status`: `VALID`, `INVALID`, `INCOMPLETE`
- `anomaly_status`: `NORMAL`, `ANOMALOUS`, `INSUFFICIENT_DATA`
- `compliance_status`: `COMPLIANT`, `NON_COMPLIANT`, `NOT_EVALUABLE`

## Finalization matrix
| Quality | Anomaly | Compliance | Finalizable | Reason |
|---|---|---|---|---|
| VALID | NORMAL | COMPLIANT | YES | Normal compliant evidence |
| VALID | ANOMALOUS | COMPLIANT | YES | Preserve anomaly evidence; compliance remains independently valid |
| VALID | NORMAL | NON_COMPLIANT | YES | Preserve non-compliance as an auditable finalized outcome |
| VALID | ANOMALOUS | NON_COMPLIANT | YES | Preserve both anomaly and non-compliance evidence |
| VALID | INSUFFICIENT_DATA | COMPLIANT | NO | AI evidence incomplete |
| VALID | INSUFFICIENT_DATA | NON_COMPLIANT | NO | AI evidence incomplete |
| VALID | any | NOT_EVALUABLE | NO | Compliance cannot be established |
| INVALID | any | any | NO | Measurement integrity failed |
| INCOMPLETE | any | any | NO | Required measurement/evidence missing |

A finalized record therefore does **not** imply that the treatment was compliant or that measurements were physically correct. It means the available evidence passed the defined finalization gate and was frozen for traceability.

## Finalization transaction
Finalization must atomically create/freeze the Treatment Record and its Digital Treatment Certificate metadata. The cryptographic artifact is produced in Phase 09; the DLT anchor is a subsequent step and is not a prerequisite for the local record to enter `FINALIZED`, but a finalized record is not considered `ANCHORED` until the DLT transaction is confirmed.

## Prohibited behavior
- Never overwrite a finalized record.
- Never delete a finalized record to correct it.
- Never treat `ANOMALOUS` as synonymous with `INVALID`.
- Never treat `NON_COMPLIANT` as a failed database transaction.
