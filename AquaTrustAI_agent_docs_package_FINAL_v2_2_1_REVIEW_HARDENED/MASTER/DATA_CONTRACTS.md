# AquaTrust AI — Canonical Data Contracts

These are logical contracts. Physical database types and constraints are authoritative in `MASTER/DATABASE_SCHEMA.md`; HTTP paths and JSON schemas are authoritative in `MASTER/API_ENDPOINT_REGISTRY.md`; canonical serialization and signature representation are authoritative in `MASTER/CRYPTOGRAPHY_SPECIFICATION.md`. Phase 01 implements these frozen contracts and must not redefine them.


## Exact Contract Mapping and Representation Rules

This section is authoritative for semantic-to-physical naming. Agents MUST NOT infer aliases.

### Treatment Record mapping

| Logical/Domain concept | Canonical API/DTO field | Physical DB representation |
|---|---|---|
| treatment readings / evidence | `evidence_snapshot` | `treatment_records.evidence_snapshot` |
| digital signature | `signature` | `signatures.signature_id` referenced by the treatment record |
| DLT anchor | `dlt_anchor` | the corresponding DLT anchor fields in `treatment_records` / anchor table as defined by `DATABASE_SCHEMA.md` |
| treatment period start | `period_start` | `treatment_records.period_start` |
| treatment period end | `period_end` | `treatment_records.period_end` |
| observed reading time | `observed_at` | `treatment_readings.observed_at` |

If an API DTO intentionally exposes a convenience object such as `signature` or `dlt_anchor`, that object MUST be explicitly mapped to the physical fields above. A convenience object does not create a second source of truth.

### Compliance result mapping

| Logical/Domain concept | Canonical API/DTO field | Physical DB representation |
|---|---|---|
| compliance rule evaluation set | `parameter_results` | `compliance_results.parameter_results` |
| compliance rule-set identity/version | `rule_set` | the rule-set identity/version columns defined in `DATABASE_SCHEMA.md` |

`rule_set` is metadata identifying the rule set used; `parameter_results` is the evaluated result payload. They are not interchangeable.

### Status representation

Canonical API enum values MUST use lower_snake_case. Examples:

- `quality_status`: `valid`, `invalid`, `incomplete`
- `anomaly_status`: `normal`, `anomalous`, `insufficient_data`
- `compliance_status`: `compliant`, `non_compliant`, `not_evaluable`
- `record_state`: `draft`, `processing`, `eligible_for_finalization`, `finalized`, `superseded_by_correction`

If an implementation uses uppercase/internal enum constants, it MUST serialize them to the canonical API values above. Agents MUST NOT introduce alternate spellings, casing, or synonymous enum values.


## 1. Facility

Required semantic fields:
- facility_id
- facility_name
- facility_type
- location metadata
- capacity metadata
- active/status metadata
- provenance/reference metadata

## 2. Sensor

Required semantic fields:
- sensor_id
- facility_id
- parameter
- unit
- sensor metadata
- active/status metadata

## Contract-to-schema naming rule

The logical names below use the same field names as the authoritative API/database contracts wherever practical. Do not introduce alternate aliases. In particular:
- `TreatmentReading.timestamp` is represented as `observed_at`.
- `TreatmentRecord.treatment_period` is represented as `period_start` and `period_end`.
- API and persisted object names use lower_snake_case.
- Measurement values use the frozen `NUMERIC(20,6)` database precision and canonical six-decimal representation.

## 3. TreatmentReading

```text
reading_id
facility_id
sensor_id
observed_at
treatment_stage
parameter
value
unit
source
provenance
quality_status
```

`treatment_stage` is optional when the source has no reliable stage/sample-point semantics. When the source distinguishes inlet, intermediate treatment or final-effluent measurements, the normalized stage MUST be preserved rather than discarded.

Baseline normalized stage values are:
- `inlet`
- `primary_treatment`
- `secondary_treatment`
- `final_effluent`
- `other`
- `unknown`

For `source = dataset`, `provenance` MUST identify the immutable `dataset_id` and `source_row_reference` when available. For simulator-generated records it MUST additionally preserve `scenario_id`, `simulation_seed` and, when source-derived, `source_dataset_ids[]` as required by `DATA_PROVENANCE_SPECIFICATION.md`. Provenance may also carry the explicit `data_origin` value (`observed` or `simulated`). These values belong inside the existing provenance object and do not create a second source of truth.

Dataset-specific source columns must never leak into the canonical reading contract.

A reading-level `quality_status` is `valid` or `invalid`. `incomplete` is a treatment-window/record-level status used when required evidence is missing; it is not a substitute for a reading-level validation result.

## 4. ValidationResult

```text
reading_id
quality_status
validation_flags
validation_version
validated_at
```

## 5. AnomalyResult

```text
reading_id
anomaly_status
anomaly_score
model_version
feature_set_version
inference_at
```

`anomaly_status` is independent of compliance.

## 6. ComplianceResult

```text
treatment_record_id
compliance_status
rule_version
rule_set
parameter_results
evaluated_at
```

## 7. TreatmentRecord

```text
record_id
facility_id
period_start
period_end
readings
provenance
quality_status
anomaly_status
compliance_status
certificate_id
canonical_hash
signature
dlt_anchor
created_at
```

A finalized treatment record is evidence. It must not be overwritten.

## 8. Digital Treatment Certificate

Semantic contents:
- certificate_id
- record_id
- facility identity
- treatment period
- finalized status information
- compliance summary
- certificate version
- issuer/signing identity
- canonical hash
- digital signature metadata
- DLT reference once anchored

## 9. Correction

```text
correction_id
original_record_id
requested_by
authorized_by
reason
proposed_changes
created_at
status
corrected_record_id
new_certificate_id
new_hash
new_signature
new_dlt_anchor
```

The original record remains immutable.

## 10. DLT Anchor

```text
anchor_id
record_id
canonical_hash
certificate_id
facility_id
event_timestamp
compliance_metadata
signature_metadata
network_reference
transaction_id
```

The DLT layer anchors proof metadata; it does not replace the detailed PostgreSQL evidence store.

## 11. Status semantics

Never collapse these into one field:

```text
quality_status
anomaly_status
compliance_status
```

Example:

```text
quality_status = valid
anomaly_status = anomalous
compliance_status = compliant
```

This is valid and must remain representable.

## 12. Source-record and stage semantics

- `source_record_type` is provenance metadata, not a measurement value.
- `measurement` is the only source-record type eligible for observed readings.
- `regulatory_limit` and `narrative_or_metadata` records must not enter the observed-reading stream.
- `treatment_stage` must be preserved when supported by the source.
- Compliance rules may scope to a treatment stage; stage must never be guessed from parameter names alone.

## 13. Versioning

The following must be versionable:
- validation rules
- AI model
- AI feature set
- compliance rules
- certificate format
- canonicalization format
- API contract where compatibility requires it

## 13. Canonicalization rule

Authoritative hashes must be generated from a deterministic canonical representation, never from:
- arbitrary database serialization
- frontend JSON formatting
- nondeterministic object ordering
- timestamps added after hashing
- mutable fields excluded without explicit contract definition
