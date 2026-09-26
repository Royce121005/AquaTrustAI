# AquaTrust AI — Workload and Benchmark Specification

**Status:** AUTHORITATIVE / FROZEN — v2.2.1  
**Scope:** Simulator workload identity, benchmark comparability, run manifests and reproducibility

## 1. Purpose

This document closes the ambiguity between the required facility scales (8/50/100/500 STPs) and the actual workload presented to each architecture.

A facility count alone does not define an experiment. Every benchmark run MUST freeze the complete workload manifest before measurement.

## 2. Required workload identity

Every simulation/benchmark run must record:

- `workload_id`
- `facility_count` — one of `8`, `50`, `100`, `500`
- `scenario_id`
- `simulation_seed`
- `dataset_manifest_checksum`
- per-source dataset checksums
- `processing_version`
- simulated time window
- sampling interval
- active parameter set
- active treatment-stage/sensor profile
- expected reading count
- actual generated reading count
- anomaly/error injection configuration
- randomization configuration
- application commit SHA
- environment snapshot

The `workload_id` is immutable once measurement begins.

## 3. Facility scales

The required benchmark scales are exactly:

- 8 STPs
- 50 STPs
- 100 STPs
- 500 STPs

No additional scale may replace these required points. Additional stress points are permitted only as supplemental experiments.

## 4. Scenario set

The minimum controlled scenarios are:

1. `normal`
2. `missing_values`
3. `duplicate_readings`
4. `out_of_range_values`
5. `sudden_change`
6. `statistical_anomalies`
7. `non_compliant_values`
8. `mixed_realistic`

The scenario definition must state which faults/anomalies are injected, their rates, whether injection is deterministic, and whether the injected ground truth is available for evaluation.

## 5. Logical-record parity

The same logical finalized treatment-record workload must be used for all three architecture variants.

The centralized, blockchain-centric and hybrid runners MUST NOT:
- generate different readings;
- use different seeds;
- silently drop records;
- change parameter values;
- change validation/compliance outcomes;
- use different cryptographic settings.

Architecture-specific persistence is the variable under comparison.

## 6. Non-DLT pipeline parity

Unless a specific experiment explicitly measures a different feature, all variants use the same:

- canonical input workload;
- preprocessing;
- validation;
- anomaly model/artifact;
- compliance rule set;
- treatment-record construction;
- canonicalization version;
- SHA-256 implementation;
- digital-signature algorithm and key policy.

This prevents the DLT architecture comparison from becoming an accidental comparison of different application stacks.

## 7. Blockchain-centric definition

The blockchain-centric variant persists the same canonical finalized evidence payload used by the hybrid variant as its primary evidence path on the permissioned DLT.

The benchmark MUST report:
- canonical payload byte size;
- transaction/request byte size;
- ledger storage size;
- transaction latency;
- commit latency;
- throughput;
- verification time;
- failed/unsupported submissions.

If a payload exceeds the configured Fabric transaction limits, the run MUST be recorded as unsupported/failed for that architecture rather than silently truncating, compressing, dropping or changing the payload. Such a result is itself a measured architectural limitation.

## 8. Warm-up and repetitions

Each architecture × facility_count × scenario combination requires:

- documented warm-up;
- at least 5 measured repetitions;
- identical repetition count across variants;
- identical seed schedule across variants.

Warm-up executions MUST NOT be included in reported measured samples.

## 9. Measurement boundaries

The run manifest must define start and end events for every latency metric.

At minimum:

- ingestion latency: accepted request → persisted ingestion result;
- finalization latency: finalization command start → finalized record committed;
- anchor latency: anchor submission start → Fabric commit confirmation;
- end-to-end latency: workload submission start → completion of the defined final evidence state;
- verification time: verification request start → structured verification result.

## 10. Failed-run policy

A failed run is never silently removed.

The manifest must record:
- failure stage;
- failure code;
- error summary;
- whether retry occurred;
- retry outcome;
- reason for any exclusion from aggregate statistics.

## 11. Dataset/simulation leakage controls

For ML evaluation:

- training preprocessing/scaling is fit only on training data;
- test-period observations cannot influence model fitting;
- simulator variants derived from held-out observations cannot be placed in training data;
- injected anomaly labels are evaluation metadata only;
- source/facility identity must remain available for grouped or source-holdout analysis.

## 12. Required benchmark manifest

Before a measured run starts, persist a machine-readable manifest containing at minimum:

```text
workload_id
architecture_variant
facility_count
scenario_id
simulation_seed
dataset_manifest_checksum
source_checksums[]
processing_version
time_window
sampling_interval
parameter_profile
stage_profile
expected_record_count
injection_config
application_commit_sha
environment_snapshot
warmup_policy
repetition_index
```

A benchmark result without this manifest is not research-grade evidence.

## 13. Acceptance

The experiment layer is complete only when two independent runs using the same frozen manifest reproduce the same logical workload and materially equivalent record counts, subject to explicitly documented infrastructure-level nondeterminism.
