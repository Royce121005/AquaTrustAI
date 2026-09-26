# Phase 02 — Dataset Portfolio, Pipeline & Preprocessing

## Status
NOT STARTED

## Phase objective
Implement the provenance-controlled, source-agnostic dataset pipeline for the approved wastewater dataset portfolio. The pipeline must audit, ingest, normalize and version public wastewater sources while preserving source-level lineage and producing canonical records suitable for the simulator.

## Previous-phase dependency
01

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
10. `MASTER/DATABASE_SCHEMA.md`
11. `MASTER/ARCHITECTURE_INTERFACE_MAP.md`
12. `MASTER/DATA_PROVENANCE_SPECIFICATION.md`
13. This phase document
14. Previous completion report, if applicable
15. `MASTER/WORKLOAD_AND_BENCHMARK_SPECIFICATION.md`
16. `MASTER/CHANGE_RECORD_REVIEW_002.md`

## Scope
Implement dataset ingestion, provenance tracking, cleaning, normalization, parameter mapping, unit normalization and deterministic preprocessing for the approved wastewater dataset portfolio.

The initial source pool is defined in `MASTER/DATASET_PORTFOLIO_SPECIFICATION.md`: UCI Water Treatment Plant, Melbourne Water ETP inlet/outlet wastewater-quality data and selected CPCB STP performance-evaluation records. Existing Bangalore and Indian datasets are audited as legacy/current-state assets.

The final Phase 2 manifest determines which audited sources are actually used. Do not treat the entire source pool as automatically approved experiment input.

## Mandatory source-separation rules

- Do not row-wise merge unrelated datasets or physical facilities to fabricate complete treatment events. Do not pair Melbourne inlet/outlet rows by date as one physical event when their sampling windows/methods differ.
- Preserve `dataset_id`, source row identity and processing version.
- Preserve observed-versus-simulated provenance. Classify source records as measurement, regulatory_limit or narrative_or_metadata; only measurement records may become observed readings.
- Dataset-specific columns must remain inside adapters/preprocessing and must not become downstream API fields.
- A new source can be added without changing downstream contracts when the canonical reading semantics remain unchanged.

## Explicitly out of scope
Do not add predictive ML, forecasting, maintenance logic or DLT anchoring. Do not silently discard records without a documented rule.

## Implementation requirements
Produce deterministic processed datasets and metadata. Preserve source provenance, preprocessing version and transformation logs. Provide repeatable preprocessing tests.

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

Same source checksum + same processing version + same configuration produces the same processed output. Every selected source has a reproducible manifest and documented parameter/unit/timestamp/stage semantics. Invalid/missing cases are handled according to the contract.

The phase must demonstrate that at least one approved source can enter the canonical pipeline and that adding another source does not require downstream schema changes.

Additionally:
- no fake production behavior;
- no undocumented contract changes;
- no known critical regression;
- no future-phase implementation hidden inside this phase.

## Required completion report

Create/update:

`COMPLETION/PHASE_02_REPORT.md`

using `TEMPLATES/PHASE_COMPLETION_REPORT_TEMPLATE.md`.

## Stop condition

Do not begin Phase 03. The next phase must be started as a separate execution task after this phase is reviewed/frozen.

## Contract freeze requirement

Before implementation, confirm that the assigned work does not require changing a frozen contract. If it does, stop and follow `MASTER/CHANGE_CONTROL.md`; do not silently reinterpret the contract.

## Required Reading
- `MASTER/VALIDATION_SPECIFICATION.md`
- `MASTER/DATASET_PORTFOLIO_SPECIFICATION.md`
- `MASTER/CHANGE_RECORD_DATASET_001.md`
