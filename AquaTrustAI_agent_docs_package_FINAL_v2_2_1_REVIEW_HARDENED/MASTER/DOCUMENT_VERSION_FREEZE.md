**Contract release: 2.2.1**

# AquaTrust AI — Documentation Version Freeze

**Package:** Agent Documentation Package v2.2.1  
**Master specification:** v2.2.1 controlled release  
**Purpose:** Prevent agents from treating older blueprint text, historical completion reports or ad-hoc decisions as authoritative.

## Authority order

1. **Current Implementation (Tier 1 Authority):** Merged dataset/canonical contracts in `datasets/canonical/models.py`, `datasets/canonical/canonical_reading_schema.json`, `datasets/src/`, `datasets/tests/`, and backend foundation in `backend/app/`. Implementation code and executable tests supersede explanatory prose or historical contract text.
2. `MASTER/MASTER_PROJECT_SPECIFICATION.md` — overall functional/architectural baseline.
3. Exact engineering/research contracts in `MASTER/`, including `DATABASE_SCHEMA.md`, `API_ENDPOINT_REGISTRY.md`, `DATA_CONTRACTS.md`, `DATA_PROVENANCE_SPECIFICATION.md`, `DATASET_PORTFOLIO_SPECIFICATION.md`, `VALIDATION_SPECIFICATION.md`, `ML_SPECIFICATION.md`, `COMPLIANCE_RULE_SPECIFICATION.md`, `FINALIZATION_POLICY.md`, `CRYPTOGRAPHY_SPECIFICATION.md`, `FABRIC_ARCHITECTURE.md`, `RBAC_PERMISSION_MATRIX.md`, `EXPERIMENT_PROTOCOL.md` and `WORKLOAD_AND_BENCHMARK_SPECIFICATION.md`.
4. `MASTER/ARCHITECTURE_FREEZE.md`, `API_CONTRACT.md`, `INTEGRATION_RULES.md`, `SECURITY_RULES.md`, `CODING_RULES.md`, `DEPENDENCY_GRAPH.md`, `DEFINITION_OF_DONE.md`, `AGENT_EXECUTION_PROTOCOL.md`, `CHANGE_CONTROL.md`.
5. Phase files — execution scope only; they cannot override Tier 1 implementation contracts or master specifications.
6. Completion reports — historical/evidence artifacts only; they cannot redefine requirements.

## Implementation-as-Authority Rule

The active repository implementation (`datasets/canonical/models.py` and `backend/app/`) is the single source of truth for schema definitions, field names, data types, status vocabularies, and runtime contracts. Documentation must match implementation. Historical documents that conflict with the current implementation are superseded.

## Phase packet rule

Every coding agent receives:
- the assigned phase document;
- all master documents explicitly listed by that phase;
- the previous phase completion report;
- the repository state/commit SHA being audited.

## Completion rule

A phase is not complete because code exists. It is complete only when the phase scope, tests, integration gate, self-audit and completion report are satisfied.

## v2.2.1 authoritative additions

- `VALIDATION_SPECIFICATION.md` — deterministic pre-AI data-trust validation rules.
- `DATASET_PORTFOLIO_SPECIFICATION.md` — source-agnostic multi-source dataset strategy and selection gate.
- `WORKLOAD_AND_BENCHMARK_SPECIFICATION.md` — workload and benchmark reproducibility contract.
- `CHANGE_RECORD_REVIEW_002.md` — approved cross-contract consistency/reproducibility hardening.
