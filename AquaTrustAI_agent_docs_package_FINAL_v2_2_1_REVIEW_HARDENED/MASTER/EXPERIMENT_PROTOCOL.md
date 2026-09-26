# AquaTrust AI — Controlled Architecture Experiment Protocol

**Status:** AUTHORITATIVE — v2.2.1 research-methodology freeze

## 1. Purpose

Compare three architectures under equivalent workloads without allowing implementation differences to invalidate the comparison.

## 2. Architecture variants

### A — Centralized
PostgreSQL is the authoritative persistence layer. No DLT submission occurs. Integrity checks use the same application hash/signature layer where the experiment requires it, but no distributed ledger confirmation is used.

### B — Blockchain-centric
The experimental variant treats the DLT as the primary persisted evidence path for the same canonical finalized treatment-record payload used by the hybrid variant. The exact payload size and Fabric transaction limits must be reported. If the payload cannot be accepted by the configured Fabric path, the run is recorded as unsupported/failed rather than silently changing, truncating or compressing the logical evidence payload.

### C — Hybrid
PostgreSQL stores detailed evidence and Fabric stores compact proof/selected metadata. This is the authoritative production architecture.

## 3. Workload identity and parity

The complete workload is defined by `MASTER/WORKLOAD_AND_BENCHMARK_SPECIFICATION.md`.

All variants must receive:
- the same frozen dataset portfolio snapshot;
- the same dataset manifest version and source checksums;
- same facility counts: 8, 50, 100, 500;
- same simulation seeds per scenario;
- same record generation rate;
- same record payload semantics as far as the architecture permits;
- same machine/environment class for comparable runs;
- same warm-up policy;
- same repetition count;
- the same machine-readable workload manifest.

## 3A. Non-DLT pipeline parity

Unless an experiment explicitly states otherwise, centralized, blockchain-centric and hybrid variants use the same:

- preprocessing output;
- validation configuration;
- Isolation Forest model/artifact;
- compliance rule set;
- treatment-record semantics;
- canonicalization version;
- SHA-256 implementation;
- digital-signature algorithm and key policy.

The architecture comparison is intended to isolate persistence/verification architecture, not to compare different business logic or cryptographic configurations.

## 4. Scenarios

Minimum scenarios:
1. normal workload;
2. missing values;
3. duplicate readings;
4. out-of-range values;
5. sudden changes;
6. anomalous values;
7. non-compliant values;
8. mixed realistic workload.

## 5. Metrics

Required:
- end-to-end latency;
- ingestion latency;
- finalization latency;
- anchor latency where applicable;
- throughput (records/sec);
- storage overhead;
- verification time;
- computational overhead;
- scalability as facility count grows;
- integrity/tamper-detection result.

## 6. Measurement definitions

### Latency
Elapsed wall-clock time between a defined start event and defined completion event. Every reported latency must identify its boundary.

### Throughput
Successfully completed records divided by measurement-window duration. Failed/rejected records are reported separately.

### Storage overhead
Additional bytes attributable to the architecture compared with the same logical evidence set. Report database and ledger components separately.

### Verification time
Time from verifier request start to complete structured verification result.

### Computational overhead
CPU and memory consumed by the architecture-specific processing path, measured using the same observation method across variants.

### Scalability
Change in the chosen metrics as workload increases from 8 to 500 STPs.

## 7. Repetitions

Run at least 5 measured repetitions per architecture × workload × scenario after a documented warm-up. Report median and p95 for latency where sample size permits; also report mean and standard deviation for repeated-run metrics.

## 8. Required workload manifest

No measured result is valid without a frozen workload manifest. It must include the fields defined in `MASTER/WORKLOAD_AND_BENCHMARK_SPECIFICATION.md`, including facility count, scenario, seed, time window, sampling interval, parameter/stage profile, expected record count, dataset manifest checksum and source checksums.

## 9. Environment record

Every experiment stores:
- OS;
- CPU;
- RAM;
- storage;
- Python version;
- PostgreSQL version;
- Fabric version where applicable;
- container/runtime versions;
- application commit SHA;
- configuration snapshot;
- dataset portfolio manifest checksum;
- per-source dataset checksums;
- random seeds.

## 10. Statistical discipline

Do not compare a median from one architecture with a mean from another. Use the same statistic and units across variants. Report failed runs and exclusions with reasons.

## 11. Research interpretation

The experiment reports measured differences. It must not manufacture causal explanations that were not measured. Architectural advantages/limitations are discussed from the observed metrics and documented design properties.

## Frozen blockchain-centric comparison
The blockchain-centric architecture must persist the same finalized treatment-record evidence used by the hybrid architecture through the permissioned DLT as the primary evidence path, while retaining only the minimum off-chain data needed to execute the experiment and retrieve presentation data. The workload, record count, payload schema, cryptographic operations, and verification task must remain identical across variants wherever the metric is intended to compare architecture rather than feature differences.
