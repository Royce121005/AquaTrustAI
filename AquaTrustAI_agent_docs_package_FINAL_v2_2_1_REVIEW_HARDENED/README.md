# AquaTrust AI — Agent Documentation Package v2.2.1

**FINAL REVIEW-HARDENED RELEASE**

This package supersedes v2.2.0. Use only this release as the authoritative agent documentation baseline. REVIEW-002 resolves cross-contract inconsistencies, strengthens provenance and closes benchmark/verification gaps.


This package is the controlled execution documentation for implementing AquaTrust AI in sequential phases.

## What changed from v1

The original 52-file package was strong on phase sequencing and scope control. v2 adds an engineering contract layer to prevent **interpretation drift** between agents.

New authoritative controls include:
- architecture interface map;
- exact PostgreSQL schema contract;
- API endpoint registry;
- Hyperledger Fabric network/anchor contract;
- cryptography/canonicalization specification;
- Isolation Forest ML specification;
- compliance rule specification;
- frontend/API mapping;
- RBAC permission matrix;
- controlled experiment protocol;
- test/evidence strategy;
- objective-to-evidence traceability matrix;
- formal change-control process;
- source-agnostic multi-source dataset portfolio specification;
- approved dataset-strategy change record;
- documentation authority/version freeze.

## Agent execution model

Do **not** give an agent the entire implementation plan and ask it to build everything.

Use:

```text
Phase N
  ↓
Read assigned phase + required MASTER contracts
  ↓
Read previous completion report
  ↓
Audit repository state
  ↓
Implement only assigned scope
  ↓
Unit + contract + integration + regression tests
  ↓
Self-audit against frozen contracts
  ↓
Write completion report
  ↓
STOP
```

## Authority

Phase documents do not override MASTER documents. Completion reports are evidence only. If documents conflict, the agent must stop and report the conflict.

## Recommended agent packet

For each phase provide:
1. the phase file;
2. every MASTER file listed under “Read before implementation”;
3. the previous phase completion report;
4. repository/branch/commit SHA;
5. any explicitly approved change-control records.

## Do not start implementation from this README alone

The README is navigation. The actual engineering truth lives in `MASTER/` and the assigned phase document.

## v2.2.0 contract-freeze update
This release resolves the major interpretation gaps identified during the v2 review: API authority, database precision, cryptographic signature encoding, ML baseline features, compliance range semantics, finalization eligibility, Fabric implementation baseline, RBAC action mapping, data provenance, and experiment comparability.


## v2.2.0 Final Contract Corrections

This package incorporates the final file-by-file review corrections:
- canonical API status values and internal-to-API mapping;
- explicit logical-to-physical data-contract mapping;
- finalized-record immutability and correction-state semantics;
- API/RBAC authorization alignment;
- Phase 11 authoritative reading dependencies;
- frozen validation specification for Phase 05;
- updated package/document version to v2.2.0.

The package is intended to be supplied to the implementation agent as a controlled baseline. The agent MUST still execute only the assigned phase and must stop on any unresolved contract conflict.

## v2.2.0 Dataset Strategy Update

This release replaces the previous assumption of a permanently primary Bangalore/Indian dataset pair with a provenance-controlled multi-source dataset portfolio. The initial Phase 2 source pool is UCI Water Treatment Plant, Melbourne Water Eastern Treatment Plant inlet/outlet wastewater-quality data, and selected CPCB STP performance-evaluation records. The existing Bangalore and Indian datasets remain retained as legacy/current-state assets.

The canonical data contract, simulator interface, FastAPI layer and downstream trust pipeline remain source-agnostic. Dataset-specific parsing is confined to Phase 2 preprocessing. Unrelated source records must never be row-wise merged to fabricate a treatment event.
