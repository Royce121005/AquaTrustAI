# AquaTrust AI — Architecture Freeze

## 1. Authoritative pipeline

```text
Public Datasets
      ↓
Preprocessing + Provenance
      ↓
Multi-STP Simulator (8 / 50 / 100 / 500)
      ↓
FastAPI Data Gateway
      ↓
Standardization
      ↓
Deterministic Data Validation
      ↓
Isolation Forest
      ↓
QA + Compliance Engine
      ↓
Finalized Treatment Record
      ↓
Digital Treatment Certificate
      ↓
Canonicalization
      ↓
SHA-256
      ↓
Digital Signature
      ↓
PostgreSQL — detailed evidence
      ↓
Hyperledger Fabric — finalized proof/metadata anchor
      ↓
Independent Verification
      ↓
Operator / Auditor / Regulatory Dashboards
      ↓
Append-only Corrections + Audit Lineage
      ↓
Controlled Architecture Experiments
      ↓
Performance + Scalability Evaluation
```

## 2. Architectural decisions

- Permissioned DLT is the final DLT direction.
- Hyperledger Fabric is the primary DLT implementation.
- PostgreSQL stores detailed off-chain records and evidence.
- High-frequency/raw telemetry is not stored wholesale on-chain.
- SHA-256 is used for canonical record hashing.
- Digital signatures are separate from hashing and DLT anchoring.
- Verification must independently reconstruct the canonical representation.
- Corrections are append-only and preserve the original finalized record.
- The frontend is the presentation/integration layer; it is not the authoritative business-logic layer.
- `quality_status`, `anomaly_status`, and `compliance_status` remain separate.
- The simulator must use the same standardized ingestion contract as a facility.
- Treatment stage/sample-point semantics must be preserved when supported by the source.
- Independent verification must resolve signing public keys from the trusted verification-key registry.

## 2A. Dataset architecture invariants

- The project uses a **versioned, provenance-controlled dataset portfolio**, not one permanently hard-coded wastewater dataset.
- Existing Bangalore and Indian water-quality datasets are retained as legacy/current-state assets but are not frozen as the permanent master research dataset.
- The initial Phase 2 source pool is UCI Water Treatment Plant, Melbourne Water Eastern Treatment Plant inlet/outlet wastewater-quality data, and selected CPCB STP performance-evaluation records.
- Dataset-specific parsing belongs only in the Phase 2 dataset adapter/preprocessing layer.
- The simulator, FastAPI gateway and downstream trust pipeline must remain source-agnostic.
- Records from unrelated physical sources must never be row-wise merged to fabricate a complete treatment event.
- Observed and simulated provenance must remain distinguishable.
- Every experiment freezes the exact dataset manifest/checksums used for reproducibility.

## 3. Core AI scope

Core AI is Isolation Forest anomaly detection for:
- BOD
- COD
- TSS
- pH
- ammoniacal nitrogen
- total nitrogen

## 4. Explicitly out of core scope

Do not reintroduce as core requirements:
- XGBoost prediction
- LSTM forecasting
- predictive maintenance/equipment-failure prediction
- Solidity/Hardhat/Ganache as the primary DLT
- raw high-frequency telemetry on-chain
- frontend-only compliance or AI claims
- manual database overwrites of finalized evidence
- fabricated DLT transaction identifiers

## 5. Required research comparison

The implementation must eventually support controlled comparison of:
1. Centralized architecture
2. Blockchain-centric architecture
3. Hybrid architecture

Metrics include:
- latency
- throughput
- storage overhead
- verification time
- computational overhead
- scalability
- integrity/tamper-detection behavior

## 6. Architecture change protocol

Any proposed architectural change must:
1. identify the affected master requirement;
2. identify all dependent phases;
3. update the relevant contract;
4. update tests;
5. document migration impact;
6. obtain human approval before implementation.

An agent must not silently replace an architecture decision.
