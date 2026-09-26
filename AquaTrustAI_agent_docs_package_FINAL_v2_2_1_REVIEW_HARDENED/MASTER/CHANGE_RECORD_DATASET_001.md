# Change Record DATASET-001 — Dataset Strategy Revision

**Status:** APPROVED FOR DOCUMENTATION / IMPLEMENTATION BASELINE
**Package release:** v2.2.0
**Change type:** research data-source strategy change; non-breaking downstream architecture change
**Requester/approver:** Project owner decision recorded through the current project workflow

## 1. Previous state

The documentation treated the existing Bangalore wastewater dataset as the primary historical source and the existing Indian water-quality dataset as the reference/compliance-support source.

## 2. Revised state

AquaTrust AI now uses a provenance-controlled **multi-source dataset portfolio**. The initial source pool for Phase 2 auditing consists of:

- UCI Water Treatment Plant;
- Melbourne Water Eastern Treatment Plant inlet/outlet wastewater-quality data;
- selected CPCB STP performance-evaluation records.

The existing Bangalore and Indian datasets remain retained as legacy/current-state assets.

## 3. Reason

The research objectives require coverage across BOD, COD, TSS, pH, ammoniacal nitrogen and total nitrogen, while no single verified public source was established as a complete six-parameter master dataset. A multi-source strategy provides broader parameter coverage while preserving source-level provenance.

## 4. Architectural impact

No change is made to:

- FastAPI;
- PostgreSQL ownership;
- canonical wastewater reading semantics;
- deterministic validation;
- StandardScaler + Isolation Forest;
- QA/compliance engine;
- treatment records/certificates;
- SHA-256;
- digital signatures;
- Hyperledger Fabric;
- append-only corrections;
- RBAC;
- 8/50/100/500 simulation scales;
- centralized/blockchain-centric/hybrid experiment methodology.

The dataset boundary is explicitly made source-agnostic.

## 5. Required documentation updates

- `MASTER/MASTER_PROJECT_SPECIFICATION.md`
- `MASTER/ARCHITECTURE_FREEZE.md`
- `MASTER/DATA_PROVENANCE_SPECIFICATION.md`
- `MASTER/DATASET_PORTFOLIO_SPECIFICATION.md`
- `MASTER/DATA_CONTRACTS.md`
- `MASTER/EXPERIMENT_PROTOCOL.md`
- `MASTER/ML_SPECIFICATION.md`
- `PHASES/PHASE_00_REPOSITORY_AUDIT.md`
- `PHASES/PHASE_02_DATA_PIPELINE.md`
- `PHASES/PHASE_03_STP_SIMULATOR.md`
- package/version authority documents

## 6. Compatibility classification

`non_breaking_downstream_architecture_change`.

The source datasets are implementation inputs behind the existing canonical boundary. Downstream consumers must not depend on source-specific filenames or schemas.

## 7. Acceptance condition

The implementation is correct only when a future approved dataset can be added or removed through the dataset/preprocessing layer without redesigning the downstream trust pipeline.
