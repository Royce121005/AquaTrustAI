# Phase 11 — Independent Verification + Append-only Corrections

## Status
NOT STARTED

## Phase objective
Implement independent record verification, tamper detection and the complete append-only correction workflow.

## Previous-phase dependency
10

This phase is governed by all MASTER documents. The phase file does not override the master specification.

## Read before implementation
1. `MASTER/MASTER_PROJECT_SPECIFICATION.md`
2. `MASTER/ARCHITECTURE_FREEZE.md`
3. `MASTER/DATA_CONTRACTS.md`
4. `MASTER/API_CONTRACT.md`
5. `MASTER/INTEGRATION_RULES.md`
6. `MASTER/SECURITY_RULES.md`
7. `MASTER/CODING_RULES.md`
8. `MASTER/DEPENDENCY_GRAPH.md`
9. `MASTER/DEFINITION_OF_DONE.md`
10. `MASTER/CRYPTOGRAPHY_SPECIFICATION.md`
11. `MASTER/DATABASE_SCHEMA.md`
12. `MASTER/ARCHITECTURE_INTERFACE_MAP.md`
13. `MASTER/TEST_STRATEGY.md`
14. This phase document
15. Previous completion report, if applicable

## Scope
Implement independent record verification, tamper detection and the complete append-only correction workflow.

## Explicitly out of scope
Do not trust a submitted hash. Do not update/delete the original finalized evidence to implement a correction.

## Implementation requirements
Retrieve record → reconstruct canonical representation → recompute SHA-256 → compare → verify signature → verify DLT anchor. Implement correction request, authorization, new record/certificate/hash/signature/anchor and lineage.

## Required pre-change audit

Before editing:
- inspect the current repository;
- inspect relevant existing files;
- identify already-implemented functionality;
- identify previous-phase contracts;
- identify callers/dependents of files being changed;
- identify tests covering affected behavior;
- record any discrepancy between documentation and implementation.

## Required implementation workflow

```text
AUDIT
  ↓
PLAN
  ↓
IMPLEMENT
  ↓
UNIT TEST
  ↓
INTEGRATION TEST
  ↓
REGRESSION TEST
  ↓
SELF-AUDIT
  ↓
COMPLETION REPORT
  ↓
STOP
```

## Database requirements
Any schema change must:
- use the repository's migration mechanism;
- avoid destructive changes unless explicitly approved;
- include migration tests or validation;
- document affected tables/indexes/constraints.

If this phase does not require database changes, state that explicitly in the completion report.

## API requirements
Any API change must document:
- endpoint;
- method;
- request;
- response;
- errors;
- authentication/authorization;
- consumers;
- compatibility impact.

## Integration requirements

The phase must integrate with all frozen predecessor functionality. Do not create a parallel implementation of an existing responsibility.

## Testing requirements

At minimum, add or update applicable:
- unit tests;
- integration tests;
- negative/error-path tests;
- regression tests.

Run the repository's relevant build/lint/type-check/test commands.

## Exit criteria

Tampering causes verification failure. Legitimate correction creates a new evidence object while preserving the original and complete lineage.

Additionally:
- no fake production behavior;
- no undocumented contract changes;
- no known critical regression;
- no future-phase implementation hidden inside this phase.

## Required completion report

Create/update:

`COMPLETION/PHASE_11_REPORT.md`

using `TEMPLATES/PHASE_COMPLETION_REPORT_TEMPLATE.md`.

## Stop condition

Do not begin Phase 12. The next phase must be started as a separate execution task after this phase is reviewed/frozen.

## Contract freeze requirement

Before implementation, confirm that the assigned work does not require changing a frozen contract. If it does, stop and follow `MASTER/CHANGE_CONTROL.md`; do not silently reinterpret the contract.

## Required Reading
- `MASTER/API_ENDPOINT_REGISTRY.md`
- `MASTER/RBAC_PERMISSION_MATRIX.md`
- `MASTER/FINALIZATION_POLICY.md`
