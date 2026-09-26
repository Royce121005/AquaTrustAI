**Contract release: 2.2.1**

# AquaTrust AI — Documentation Version Freeze

**Package:** Agent Documentation Package v2.2.1  
**Master specification:** v2.2.1 controlled release  
**Purpose:** Prevent agents from treating older blueprint text, historical completion reports or ad-hoc decisions as authoritative.

## Authority order

1. `MASTER/MASTER_PROJECT_SPECIFICATION.md` — overall functional/architectural baseline.
2. Exact engineering/research contracts in `MASTER/`, including `DATABASE_SCHEMA.md`, `API_ENDPOINT_REGISTRY.md`, `DATA_CONTRACTS.md`, `DATA_PROVENANCE_SPECIFICATION.md`, `DATASET_PORTFOLIO_SPECIFICATION.md`, `VALIDATION_SPECIFICATION.md`, `ML_SPECIFICATION.md`, `COMPLIANCE_RULE_SPECIFICATION.md`, `FINALIZATION_POLICY.md`, `CRYPTOGRAPHY_SPECIFICATION.md`, `FABRIC_ARCHITECTURE.md`, `RBAC_PERMISSION_MATRIX.md`, `EXPERIMENT_PROTOCOL.md` and `WORKLOAD_AND_BENCHMARK_SPECIFICATION.md`.
3. `MASTER/ARCHITECTURE_FREEZE.md`, `API_CONTRACT.md`, `INTEGRATION_RULES.md`, `SECURITY_RULES.md`, `CODING_RULES.md`, `DEPENDENCY_GRAPH.md`, `DEFINITION_OF_DONE.md`, `AGENT_EXECUTION_PROTOCOL.md`, `CHANGE_CONTROL.md`.
4. Phase files — execution scope only; they cannot override master contracts.
5. Completion reports — historical/evidence artifacts only; they cannot redefine requirements.
6. Templates — formatting/instructions only.

## Contract-version rule

The **package release** is v2.2.1. Individual historical documents may carry an earlier internal version when they are retained as evidence; they do not override the v2.2.1 master contracts. All actively authoritative master contracts updated by REVIEW-002 use v2.2.1.

## Conflict rule

When documents conflict, the agent must stop and report the conflict rather than choosing silently.

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
