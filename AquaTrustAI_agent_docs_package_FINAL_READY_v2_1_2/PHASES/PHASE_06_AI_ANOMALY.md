# Phase 06 — Isolation Forest Anomaly Detection

## Status
NOT STARTED

## Phase objective
Implement Isolation Forest for BOD, COD, TSS, pH, ammoniacal nitrogen and total nitrogen within the approved anomaly-detection workflow.

## Previous-phase dependency
05

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
10. `MASTER/ML_SPECIFICATION.md`
11. `MASTER/ARCHITECTURE_INTERFACE_MAP.md`
12. `MASTER/TEST_STRATEGY.md`
13. This phase document
14. Previous completion report, if applicable

## Scope
Implement Isolation Forest for BOD, COD, TSS, pH, ammoniacal nitrogen and total nitrogen within the approved anomaly-detection workflow.

## Explicitly out of scope
Do not add XGBoost, LSTM, forecasting or predictive maintenance as core functionality.

## Implementation requirements
Feature preparation, model training lifecycle, model serialization, versioning, feature-set versioning, inference, anomaly score/status, reproducibility tests and model artifact provenance.

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

A fixed model/configuration produces reproducible inference; model/version metadata is stored with results; anomaly output is separate from quality/compliance status.

Additionally:
- no fake production behavior;
- no undocumented contract changes;
- no known critical regression;
- no future-phase implementation hidden inside this phase.

## Required completion report

Create/update:

`COMPLETION/PHASE_06_REPORT.md`

using `TEMPLATES/PHASE_COMPLETION_REPORT_TEMPLATE.md`.

## Stop condition

Do not begin Phase 07. The next phase must be started as a separate execution task after this phase is reviewed/frozen.

## Contract freeze requirement

Before implementation, confirm that the assigned work does not require changing a frozen contract. If it does, stop and follow `MASTER/CHANGE_CONTROL.md`; do not silently reinterpret the contract.
