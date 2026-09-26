# AquaTrust AI — PostgreSQL Database Schema Freeze

**Status:** AUTHORITATIVE — v2.2.1 engineering freeze
**Database:** PostgreSQL
**Time standard:** UTC
**Identifier standard:** UUID v4 for application entities unless a deterministic identifier is explicitly required by an experiment.

This is the logical-to-physical database contract. Agents may add non-semantic indexes or operational metadata when justified, but must not rename or change the meaning of frozen fields without change control.


## Finalized Record Immutability and Supersession Enforcement

The `finalized → superseded_by_correction` transition is a lineage/state transition only. It does NOT modify the finalized evidence or cryptographic identity.

For a finalized record, these fields are immutable after finalization:

- evidence snapshot/readings
- observed/treatment period
- provenance
- validation result
- AI/anomaly result and model metadata
- compliance result and rule-set metadata
- canonical representation
- content hash
- signature reference and signature bytes/metadata
- DLT anchor/reference

The only permitted post-finalization mutation on the original record is the controlled lineage state transition to `superseded_by_correction` and the minimum lineage metadata required to point to the correction. That mutation MUST be auditable.

The corrected record is a new database row with a new primary identifier, new canonical representation, new hash, new signature and new DLT anchor. `supersedes_record_id` links it to the original.

### Enforcement responsibility

Database foreign keys enforce referential integrity, but they do not by themselves enforce all lifecycle rules. The application/service transaction layer MUST enforce:

1. a compliance result can reference only an existing draft/processing treatment record;
2. finalization can occur only from `eligible_for_finalization`;
3. a finalized record cannot have protected evidence/cryptographic fields updated;
4. a correction creates a new record rather than mutating protected evidence;
5. a certificate can be created only for a finalized record;
6. lineage links are valid and auditable.

Where practical, database constraints/triggers SHOULD provide defense-in-depth for the immutability rules. Any trigger-based enforcement MUST remain consistent with the application contract.


## 1. Global conventions

- Primary keys: `uuid`.
- Foreign keys: `uuid`.
- Timestamps: `timestamptz`, stored in UTC.
- Measurement values: PostgreSQL `NUMERIC(20,6)`, not unconstrained floating-point text. Standardized values are stored to six decimal places. Canonical treatment-record serialization uses fixed six-decimal-place decimal strings with no exponent notation.
- JSON: `jsonb` for structured evidence that is intentionally schemaless; critical queryable fields remain typed columns.
- Statuses: constrained text enums or database enums; API representation is lower_snake_case.
- Immutable evidence rows are never updated in place after finalization.
- Every mutable operational table carries `created_at`; stateful tables may also carry `updated_at`.

## 2. Core tables

### facilities
`facility_id uuid PK`, `facility_name text`, `facility_type text`, `location jsonb`, `capacity numeric`, `capacity_unit text`, `status text`, `provenance jsonb`, `created_at timestamptz`, `updated_at timestamptz`.

### sensors
`sensor_id uuid PK`, `facility_id uuid FK`, `parameter text`, `unit text`, `treatment_stage text nullable`, `metadata jsonb`, `status text`, `created_at timestamptz`, `updated_at timestamptz`.

Unique logical constraint: `(facility_id, sensor_id)` is inherently unique; parameter/unit combinations must not be assumed unique because facilities may have multiple sensors for the same parameter.

### readings
`reading_id uuid PK`, `facility_id uuid FK`, `sensor_id uuid FK nullable`, `observed_at timestamptz`, `treatment_stage text nullable`, `parameter text`, `value numeric(20,6)`, `unit text`, `source text`, `provenance jsonb`, `quality_status text`, `ingestion_batch_id uuid nullable`, `created_at timestamptz`.

Index requirements: facility/time, parameter/time, batch, and source as justified by workload.

### validation_results
`validation_result_id uuid PK`, `reading_id uuid FK`, `quality_status text`, `validation_flags jsonb`, `validation_version text`, `validated_at timestamptz`.

One current validation result per reading/version; historical results remain queryable if revalidation is explicitly performed.

### anomaly_results
`anomaly_result_id uuid PK`, `reading_id uuid FK`, `anomaly_status text`, `anomaly_score numeric(20,10)`, `model_version text`, `feature_set_version text`, `inference_at timestamptz`, `model_metadata jsonb`.

### compliance_rules
`rule_id uuid PK`, `parameter text`, `operator text`, `threshold numeric(20,6) nullable`, `threshold_min numeric(20,6) nullable`, `threshold_max numeric(20,6) nullable`, `threshold_unit text`, `facility_scope jsonb nullable`, `stage_scope text nullable`, `effective_from timestamptz`, `effective_to timestamptz nullable`, `rule_version text`, `source_reference text`, `active boolean`, `created_at timestamptz`.

### compliance_results
`compliance_result_id uuid PK`, `treatment_record_id uuid FK`, `compliance_status text`, `rule_version text`, `parameter_results jsonb`, `evaluated_at timestamptz`.

### treatment_records
`record_id uuid PK`, `facility_id uuid FK`, `period_start timestamptz`, `period_end timestamptz`, `record_version integer`, `record_state text`, `quality_status text`, `anomaly_status text`, `compliance_status text`, `provenance jsonb`, `evidence_snapshot jsonb`, `certificate_id uuid nullable`, `canonical_hash text nullable`, `signature_id uuid nullable`, `anchor_status text`, `supersedes_record_id uuid nullable`, `created_at timestamptz`, `finalized_at timestamptz nullable`.

Protected fields become immutable once `record_state=finalized`.

### certificates
`certificate_id uuid PK`, `record_id uuid FK UNIQUE`, `certificate_version text`, `issuer_identity text`, `issued_at timestamptz`, `compliance_summary jsonb`, `canonical_hash text`, `signature_id uuid`, `dlt_anchor_id uuid nullable`, `status text`.

### signing_keys
`key_id text PK`, `algorithm text`, `curve text`, `public_key text`, `fingerprint text`, `status text`, `created_at timestamptz`, `revoked_at timestamptz nullable`.

`signing_keys` stores public verification material only. Private signing keys must never be stored in PostgreSQL.

### cryptographic_artifacts
`signature_id uuid PK`, `record_id uuid FK UNIQUE`, `canonicalization_version text`, `hash_algorithm text`, `canonical_hash text`, `signature_algorithm text`, `signature_value text`, `key_id text`, `signed_at timestamptz`.

### dlt_anchors
`anchor_id uuid PK`, `record_id uuid FK UNIQUE`, `certificate_id uuid FK`, `facility_id uuid FK`, `event_timestamp timestamptz`, `canonical_hash text`, `compliance_status text`, `signature_metadata jsonb`, `network_reference jsonb`, `transaction_id text nullable`, `anchor_status text`, `submitted_at timestamptz nullable`, `confirmed_at timestamptz nullable`, `failure_code text nullable`, `created_at timestamptz`.

### corrections
`correction_id uuid PK`, `original_record_id uuid FK`, `requested_by uuid`, `authorized_by uuid nullable`, `reason text`, `proposed_changes jsonb`, `status text`, `corrected_record_id uuid nullable`, `new_certificate_id uuid nullable`, `new_hash text nullable`, `new_signature_id uuid nullable`, `new_dlt_anchor_id uuid nullable`, `created_at timestamptz`, `authorized_at timestamptz nullable`, `completed_at timestamptz nullable`.

### audit_logs
`audit_log_id uuid PK`, `actor_id uuid nullable`, `actor_role text nullable`, `action text`, `resource_type text`, `resource_id uuid nullable`, `request_id text nullable`, `outcome text`, `metadata jsonb`, `created_at timestamptz`.

### users
`user_id uuid PK`, `external_subject text UNIQUE`, `display_name text`, `status text`, `created_at timestamptz`, `updated_at timestamptz`.

### roles / user_roles
Roles are controlled application roles. `operator`, `auditor`, and `regulatory_stakeholder` are the required research roles. A system `admin` role may exist only for infrastructure/administrative tasks and is not a substitute for stakeholder permissions.

### experiment_runs
`experiment_run_id uuid PK`, `experiment_name text`, `architecture_variant text`, `workload_size integer`, `scenario_id text`, `environment_snapshot jsonb`, `seed integer`, `started_at timestamptz`, `ended_at timestamptz`, `status text`.

### experiment_metrics
`metric_id uuid PK`, `experiment_run_id uuid FK`, `metric_name text`, `metric_value numeric`, `unit text`, `percentile text nullable`, `sample_count integer`, `measurement_metadata jsonb`.

## 3. Required relationships

```text
facility → sensors → readings
reading → validation_results
reading → anomaly_results
treatment_record → compliance_results
record → certificate → cryptographic_artifact → signing_key → dlt_anchor
record → corrections → corrected_record
cryptographic_artifact → signing_keys
all consequential actions → audit_logs
experiment_run → experiment_metrics
```

## 4. Finalization state machine

Minimum record states:

```text
draft → processing → eligible_for_finalization → finalized
                                           ↘ rejected
finalized → superseded_by_correction
```

A record is eligible for finalization only when required validation, anomaly evaluation and compliance evaluation have completed according to the corresponding master specifications. `finalized` means the evidence snapshot is frozen; it does not mean DLT confirmation is necessarily complete.

## 5. Anchor state machine

```text
not_required → pending → submitted → confirmed
                         ↘ failed → reconciliation_required → submitted
```

The PostgreSQL finalized record survives temporary DLT failure.

## 6. Integrity constraints

- No delete endpoint for finalized treatment records.
- No update endpoint for protected finalized fields.
- A correction creates a new record linked through `supersedes_record_id`.
- A certificate cannot exist without a finalized record.
- A DLT anchor cannot be confirmed without a canonical hash matching the certificate.
- `canonical_hash` must be 64 hexadecimal characters for SHA-256.
- A referenced `signature_id` must resolve to a signing artifact whose `key_id` resolves to an active or historically valid public key record.
- Foreign keys and unique constraints must enforce lineage integrity.

## 7. Migration policy

All schema changes require:
1. migration file;
2. forward migration test;
3. rollback/recovery strategy;
4. representative fixture test;
5. impact entry in `CHANGE_CONTROL.md` when a frozen contract changes.
