# Phase 16 — Final Validation + Research Evidence

## Status
NOT STARTED

## Phase objective
Perform complete end-to-end acceptance testing of the final AquaTrust AI workflow and assemble the research evidence package.

## Previous-phase dependency
15

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
10. `MASTER/TRACEABILITY_MATRIX.md`
11. `MASTER/TEST_STRATEGY.md`
12. `MASTER/DOCUMENT_VERSION_FREEZE.md`
13. `MASTER/FINALIZATION_POLICY.md`
14. `MASTER/CRYPTOGRAPHY_SPECIFICATION.md`
15. `MASTER/FABRIC_ARCHITECTURE.md`
16. `MASTER/RBAC_PERMISSION_MATRIX.md`
17. `MASTER/EXPERIMENT_PROTOCOL.md`
18. This phase document
19. Previous completion report, if applicable

## Scope
Perform complete end-to-end acceptance testing of the final AquaTrust AI workflow and assemble the research evidence package.

## Explicitly out of scope
Do not introduce new architecture or features. Fix defects found in validation rather than hiding them.

## Implementation requirements
Normal/invalid/missing/duplicate/anomalous/non-compliant flows; certificate; hash; signature; Fabric; verification; tampering; correction; audit; RBAC; failure/recovery; regression; documentation/evidence packaging.

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

All final acceptance criteria pass or every remaining limitation is explicitly documented and approved. Final architecture and evidence are internally consistent.

Additionally:
- no fake production behavior;
- no undocumented contract changes;
- no known critical regression;
- no future-phase implementation hidden inside this phase.

## Required completion report

Create/update:

`COMPLETION/PHASE_16_REPORT.md`

using `TEMPLATES/PHASE_COMPLETION_REPORT_TEMPLATE.md`.

## Stop condition

Do not begin Phase 17. The next phase must be started as a separate execution task after this phase is reviewed/frozen.

## Contract freeze requirement

Before implementation, confirm that the assigned work does not require changing a frozen contract. If it does, stop and follow `MASTER/CHANGE_CONTROL.md`; do not silently reinterpret the contract.

## Required Reading
- `MASTER/VALIDATION_SPECIFICATION.md`
