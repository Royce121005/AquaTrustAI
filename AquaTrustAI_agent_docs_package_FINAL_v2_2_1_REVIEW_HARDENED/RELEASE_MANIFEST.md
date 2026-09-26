# AquaTrust AI — Agent Documentation Release Manifest

**Release:** v2.2.1  
**Status:** FINAL AGENT HANDOFF BASELINE  
**Purpose:** Cross-contract consistency, dataset-provenance hardening and reproducible benchmark methodology.

## 1. Primary change

The v2.2.0 dataset portfolio strategy is retained and hardened. This release also resolves contract contradictions and implementation ambiguities discovered during a full package review.

## 2. Approved initial source pool for Phase 2 audit

- UCI Water Treatment Plant — official UCI source.
- Melbourne Water Eastern Treatment Plant inlet/outlet wastewater-quality datasets — official DataVic/Melbourne Water sources.
- Selected CPCB STP performance-evaluation reports — exact report identity, retrieval date, checksum and extracted-record lineage must be recorded for every selected report.

These are an audit pool, not an instruction to merge all sources or use all sources in every experiment.

## 3. Legacy assets

- Bangalore wastewater dataset
- Indian water-quality reference dataset

These remain available for audit, migration and regression purposes. They are not the permanent master research dataset.

## 4. Resolved v2.2.1 drawbacks

1. Status enum contradiction across contracts.
2. Loss of treatment-stage/sample-point semantics.
3. Insufficient lineage representation for multi-source simulation inputs.
4. Risk of regulatory-limit values from CPCB reports being mistaken for measurements.
5. Ambiguous Melbourne inlet/outlet date pairing.
6. Benchmark ambiguity beyond facility count.
7. ML train/test leakage through derived simulator data.
8. Lack of an independent public-key resolution path for signature verification.
9. `admin` role leakage into stakeholder endpoint authorization.
10. Obsolete blueprint examples conflicting with exact schema/state contracts.
11. Unclear distinction between logical lineage entities and frozen physical database tables.

## 5. New authoritative documents

- `MASTER/WORKLOAD_AND_BENCHMARK_SPECIFICATION.md`
- `MASTER/CHANGE_RECORD_REVIEW_002.md`

## 6. Downstream invariants

- canonical API remains FastAPI `/api/v1`;
- PostgreSQL remains detailed evidence store;
- Hyperledger Fabric remains primary DLT;
- simulator remains deterministic at 8/50/100/500 STPs;
- validation, Isolation Forest, compliance, treatment records, cryptography and Fabric remain the core architecture;
- exact dataset manifests/checksums are frozen for experiments;
- source records are never row-wise merged to fabricate a treatment event;
- observed and simulated provenance remains distinguishable;
- regulatory limits are never treated as measurements;
- treatment-stage semantics are preserved when supported;
- finalized records remain append-only/correction-aware.

## 7. Agent startup rule

Before implementing any phase:

1. Read `MASTER/DOCUMENT_VERSION_FREEZE.md`.
2. Read `MASTER/MASTER_PROJECT_SPECIFICATION.md`.
3. Read the master contracts explicitly listed by the assigned phase.
4. Also read `MASTER/CHANGE_RECORD_REVIEW_002.md` and `MASTER/WORKLOAD_AND_BENCHMARK_SPECIFICATION.md` when the phase touches data, ML, simulation or experiments.
5. If any conflict remains, stop and follow `MASTER/CHANGE_CONTROL.md`.

## 8. Package contents

The package contains documentation/contracts only. External public datasets are intentionally not bundled. Phase 02 must retrieve and checksum approved sources under the provenance rules.

## 9. Do not provide the agent with the old package alongside this one

Use this v2.2.1 package as the sole authoritative documentation baseline.
