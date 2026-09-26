# AquaTrust AI — Change Record REVIEW-002

**Change ID:** REVIEW-002  
**Date:** 2026-09-27  
**Status:** APPROVED FOR v2.2.1 IMPLEMENTATION BASELINE  
**Type:** non_breaking_additive + contract-consistency hardening + research-methodology hardening

## 1. Reason

A full consistency review of the v2.2.0 agent package identified several places where older blueprint-era terminology could conflict with the newer frozen contracts. The review also identified provenance and experiment-definition gaps that could allow accidental data leakage, stage mixing, non-reproducible workloads or non-independent signature verification.

## 2. Resolved issues

### A. Status-enum contradiction
Older finalization text used `VALID/INVALID/INCOMPLETE`, `NORMAL/ANOMALOUS/INSUFFICIENT_DATA` and `COMPLIANT/NON_COMPLIANT/NOT_EVALUABLE`, while the newer contract listed only the first two values for some statuses.

Resolution:
- `quality_status`: `valid | invalid | incomplete`
- `anomaly_status`: `normal | anomalous | insufficient_data`
- `compliance_status`: `compliant | non_compliant | not_evaluable`
- individual reading validation may still return only `valid | invalid`; `incomplete` is a record/window-level state.

### B. Treatment-stage loss
Source datasets can contain inlet, intermediate-stage and final-effluent measurements. The previous canonical reading did not expose stage explicitly.

Resolution:
- add optional canonical `treatment_stage`;
- preserve it when the source has meaningful stage/sample-point semantics;
- use stage in validation/ML time-series identity and compliance rule scope where applicable;
- do not infer a stage when the source does not support it.

### C. Multi-source simulation lineage
A simulator may legitimately use parameter-specific distributions from more than one source. A singular `dataset_id` was insufficient to express that lineage.

Resolution:
- observed records retain one `dataset_id`;
- simulated records may retain `source_dataset_ids[]` plus source row/distribution references;
- no row-wise cross-source event fabrication is permitted.

### D. Regulatory-limit leakage
CPCB reports can contain both measured observations and stated discharge standards/limits.

Resolution:
- dataset manifests must classify source records as `measurement`, `regulatory_limit`, or `narrative/metadata`;
- only `measurement` records may enter the canonical observed-reading pipeline;
- regulatory limits must not enter ML training or be mistaken for observed wastewater values.

### E. Melbourne inlet/outlet pairing ambiguity
Matching Melbourne inlet and outlet rows by date must not be interpreted as a synchronized physical sample/event.

Resolution:
- inlet and outlet remain separate stage/time-context records;
- same-date rows may be compared only as a documented analytical comparison, not merged into one observation.

### F. Benchmark ambiguity
Facility count alone did not define an experiment workload.

Resolution:
- add `WORKLOAD_AND_BENCHMARK_SPECIFICATION.md`;
- every run freezes workload identity, time window, sampling interval, parameter/stage profile, expected record count, scenario injection and environment.

### G. Signature verification independence
The verifier requires a trusted public key corresponding to `key_id`.

Resolution:
- add a public signing-key registry and read-only verification endpoint;
- private keys remain outside the database/frontend/repository;
- ECDSA uses deterministic RFC 6979 nonce generation for reproducible signature artifacts where supported by the selected implementation.

### H. Role mapping ambiguity
The endpoint registry used `admin` in places where the RBAC matrix explicitly says `admin` is infrastructure-only.

Resolution:
- application endpoints use `operator`, `auditor`, `regulatory_stakeholder` and `service_identity` only;
- infrastructure admin is not an end-user stakeholder role.

### I. Master blueprint drift
Several old examples referenced `timestamp`, `dataset_version`, `simulation_run_id`, obsolete validation enums and a legacy treatment-record state machine.

Resolution:
- examples are aligned to the current contracts;
- authoritative physical schema remains in `DATABASE_SCHEMA.md`;
- authoritative endpoint schema remains in `API_ENDPOINT_REGISTRY.md`;
- logical lineage terms use `dataset_id`, `processing_version`, `scenario_id` and `simulation_seed`.

## 3. Affected documents

- `MASTER/MASTER_PROJECT_SPECIFICATION.md`
- `MASTER/DATA_CONTRACTS.md`
- `MASTER/DATA_PROVENANCE_SPECIFICATION.md`
- `MASTER/DATABASE_SCHEMA.md`
- `MASTER/API_ENDPOINT_REGISTRY.md`
- `MASTER/RBAC_PERMISSION_MATRIX.md`
- `MASTER/COMPLIANCE_RULE_SPECIFICATION.md`
- `MASTER/FINALIZATION_POLICY.md`
- `MASTER/VALIDATION_SPECIFICATION.md`
- `MASTER/ML_SPECIFICATION.md`
- `MASTER/EXPERIMENT_PROTOCOL.md`
- `MASTER/ARCHITECTURE_INTERFACE_MAP.md`
- `MASTER/ARCHITECTURE_FREEZE.md`
- `MASTER/AGENT_EXECUTION_PROTOCOL.md`
- `MASTER/DOCUMENT_VERSION_FREEZE.md`
- `MASTER/CHANGE_CONTROL.md`
- `MASTER/README.md`
- phase files for 02, 03, 06, 07, 09, 11, 13, 14, 15 and 16 where needed

## 4. Compatibility

The changes are additive or corrective at the documentation/contract level. Existing records without stage information remain valid when stage is genuinely unknown/not applicable. Existing reading payloads remain accepted when the new field is optional.

Status serialization is standardized to lower_snake_case.

## 5. Research impact

These changes improve reproducibility and prevent:
- source-stage mixing;
- regulatory-limit leakage into ML;
- hidden workload differences;
- non-independent signature verification;
- accidental end-user admin privilege;
- contradictions between the master blueprint and exact contracts.

## 6. Approval

This record is the approved implementation baseline for v2.2.1. Any further semantic change requires a new change record under `MASTER/CHANGE_CONTROL.md`.
