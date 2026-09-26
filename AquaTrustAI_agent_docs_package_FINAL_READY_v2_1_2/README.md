# AquaTrust AI — Agent Documentation Package v2.1.2

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

## v2.1.2 contract-freeze update
This release resolves the major interpretation gaps identified during the v2 review: API authority, database precision, cryptographic signature encoding, ML baseline features, compliance range semantics, finalization eligibility, Fabric implementation baseline, RBAC action mapping, data provenance, and experiment comparability.


## v2.1.2 Final Contract Corrections

This package incorporates the final file-by-file review corrections:
- canonical API status values and internal-to-API mapping;
- explicit logical-to-physical data-contract mapping;
- finalized-record immutability and correction-state semantics;
- API/RBAC authorization alignment;
- Phase 11 authoritative reading dependencies;
- frozen validation specification for Phase 05;
- updated package/document version to v2.1.2.

The package is intended to be supplied to the implementation agent as a controlled baseline. The agent MUST still execute only the assigned phase and must stop on any unresolved contract conflict.
