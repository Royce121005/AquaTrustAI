# AquaTrust AI — Finalization Policy

**Status:** AUTHORITATIVE / FROZEN  
**Version:** 2.2.1

## 1. Canonical status values

The canonical API status values are lower_snake_case:

- `quality_status`: `valid` | `invalid` | `incomplete`
- `anomaly_status`: `normal` | `anomalous` | `insufficient_data`
- `compliance_status`: `compliant` | `non_compliant` | `not_evaluable`

Uppercase forms may be used only as internal symbolic constants if the implementation language requires them. They MUST serialize to the canonical API values above.

### Status scope

- A **reading-level** validation result uses `valid` or `invalid`.
- `incomplete` is a treatment-window/record-level state indicating required evidence is missing.
- `insufficient_data` means the approved AI feature/model could not produce a valid anomaly result because the required history/features were unavailable.
- `not_evaluable` means compliance could not be deterministically evaluated for required evidence/rule/unit/stage reasons.

## 2. Finalized record and correction semantics

A finalized TreatmentRecord is immutable with respect to its evidence and cryptographic identity. The following MUST NOT be edited in place after finalization:

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

## 3. Required finalization inputs

A record must have:

- validated standardized measurements;
- validation results;
- anomaly results for every required parameter where the AI workflow declares the parameter evaluable;
- compliance result;
- provenance metadata;
- processing/model/rule versions;
- deterministic record identity.

If the required anomaly workflow returns `insufficient_data`, finalization is blocked unless the approved research policy explicitly defines that parameter as optional for the treatment record. The implementation must not silently downgrade `insufficient_data` to `normal`.

If compliance returns `not_evaluable` for a required parameter, finalization is blocked.

## 4. Finalization matrix

| Quality | Anomaly | Compliance | Finalizable | Reason |
|---|---|---|---|---|
| valid | normal | compliant | yes | Normal compliant evidence |
| valid | anomalous | compliant | yes | Preserve anomaly evidence; compliance remains independently valid |
| valid | normal | non_compliant | yes | Preserve non-compliance as an auditable outcome |
| valid | anomalous | non_compliant | yes | Preserve both anomaly and non-compliance evidence |
| valid | insufficient_data | compliant | no | Required AI evidence incomplete |
| valid | insufficient_data | non_compliant | no | Required AI evidence incomplete |
| valid | any | not_evaluable | no | Compliance cannot be established |
| invalid | any | any | no | Measurement integrity failed |
| incomplete | any | any | no | Required measurement/evidence missing |

A finalized record does **not** imply that the treatment was compliant or that measurements were physically correct. It means the available evidence passed the defined finalization gate and was frozen for traceability.

## 5. Finalization transaction

A draft TreatmentRecord exists before compliance evaluation. ComplianceResult therefore references an existing draft/processing record.

Finalization atomically transitions the record from `eligible_for_finalization` to `finalized` and freezes the evidence snapshot. Certificate and cryptographic artifacts are generated according to the crypto contract. DLT anchoring is subsequent and is not a prerequisite for the local record to enter `finalized`.

A finalized record is not considered `anchored` until Fabric commit confirmation is recorded.

## 6. Prohibited behavior

- Never overwrite a finalized record.
- Never delete a finalized record to correct it.
- Never treat `anomalous` as synonymous with `invalid`.
- Never treat `non_compliant` as a failed database transaction.
- Never convert `insufficient_data` to `normal`.
- Never convert `not_evaluable` to `compliant`.
