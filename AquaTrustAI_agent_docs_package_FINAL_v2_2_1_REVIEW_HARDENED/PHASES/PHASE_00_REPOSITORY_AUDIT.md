# Phase 00 — Repository Audit & Baseline

## Status
NOT STARTED

## Phase objective
Perform a read-only audit of the current AquaTrustAI repository before implementation.
Inspect the frontend, all existing dataset assets, package/dependency configuration, existing routes/components/services, mock/provisional services, deployment configuration and any backend/database/AI/DLT material already present.


## Previous-phase dependency
NONE

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
10. `MASTER/DOCUMENT_VERSION_FREEZE.md`
11. `MASTER/ARCHITECTURE_INTERFACE_MAP.md`
12. `MASTER/TRACEABILITY_MATRIX.md`
13. This phase document
14. Previous completion report, if applicable

## Scope
Perform a read-only audit of the current AquaTrustAI repository before implementation.
Inspect the frontend, all existing dataset assets, package/dependency configuration, existing routes/components/services, mock/provisional services, deployment configuration and any backend/database/AI/DLT material already present.

For datasets, distinguish legacy/current-state assets from the v2.2.1 multi-source dataset strategy. Do not assume existing Bangalore/Indian files are the permanent research dataset.

## Explicitly out of scope
Do not redesign or implement features. Do not delete existing work. Do not make speculative architectural changes.

## Implementation requirements
Create CURRENT_STATE.md documenting KEEP, MODIFY, REPLACE, REMOVE and MISSING items. Record evidence by file/path. Establish the baseline test/build status.

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

A complete evidence-based inventory exists; baseline commands have been run; no implementation changes are made; blockers are documented.

Additionally:
- no fake production behavior;
- no undocumented contract changes;
- no known critical regression;
- no future-phase implementation hidden inside this phase.

## Required completion report

Create/update:

`COMPLETION/PHASE_00_REPORT.md`

using `TEMPLATES/PHASE_COMPLETION_REPORT_TEMPLATE.md`.

## Stop condition

Do not begin Phase 01. The next phase must be started as a separate execution task after this phase is reviewed/frozen.

## Contract freeze requirement

Before implementation, confirm that the assigned work does not require changing a frozen contract. If it does, stop and follow `MASTER/CHANGE_CONTROL.md`; do not silently reinterpret the contract.

## Phase 00 execution override
Phase 00 is strictly read-only. Its workflow is `AUDIT → BASELINE TESTS → CURRENT_STATE REPORT → SELF-AUDIT → COMPLETION REPORT → STOP`. No implementation, migration, dependency upgrade, schema modification, or refactor is permitted in Phase 00.
