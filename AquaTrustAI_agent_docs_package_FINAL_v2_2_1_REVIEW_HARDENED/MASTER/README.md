> **Package v2.2.1:** This MASTER directory now includes an engineering contract layer. Exact schema/API/crypto/Fabric/ML/compliance/RBAC/experiment/test rules are authoritative where present.

# AquaTrust AI — Agent Implementation Documentation

This `docs/` directory is the controlled implementation documentation package for AquaTrust AI.

## Authority hierarchy

1. `MASTER_PROJECT_SPECIFICATION.md` — authoritative project scope, architecture, workflows, feature disposition and research requirements.
2. `ARCHITECTURE_FREEZE.md` — architectural invariants that must not be changed casually.
3. `DATA_CONTRACTS.md` — canonical domain objects and status semantics.
4. `API_CONTRACT.md` — API conventions and integration contract.
5. `INTEGRATION_RULES.md` — cross-phase integration and regression rules.
6. `SECURITY_RULES.md` — security, integrity and audit requirements.
7. `CODING_RULES.md` — implementation quality rules.
8. `DEPENDENCY_GRAPH.md` — phase order and gates.
9. `DEFINITION_OF_DONE.md` — mandatory completion criteria.
10. `PHASES/PHASE_XX_*.md` — the only implementation scope for the currently assigned phase.
11. `COMPLETION/` — evidence produced after each phase.

## Agent rule

The agent must implement **one phase only**. It must not begin the next phase in the same task.

The agent must read the master documents plus the assigned phase document before editing code.

## Phase lifecycle

AUDIT → PLAN → IMPLEMENT → TEST → INTEGRATE → REGRESSION TEST → SELF-AUDIT → COMPLETION REPORT → HUMAN REVIEW → FREEZE → NEXT PHASE

## v2.2.1 authority note
The following are authoritative engineering contracts and must be read before implementing the phases that depend on them: `DATABASE_SCHEMA.md`, `API_ENDPOINT_REGISTRY.md`, `ML_SPECIFICATION.md`, `COMPLIANCE_RULE_SPECIFICATION.md`, `CRYPTOGRAPHY_SPECIFICATION.md`, `FABRIC_ARCHITECTURE.md`, `FINALIZATION_POLICY.md`, `DATA_PROVENANCE_SPECIFICATION.md`, and `RBAC_PERMISSION_MATRIX.md`. If any older section conflicts with these contracts, the authoritative contract wins and the conflict must be reported rather than silently resolved.


### Added v2.2.1 authoritative contract
- `VALIDATION_SPECIFICATION.md` — deterministic pre-AI data-trust validation rules, versioning and change-control requirements.
- `DATASET_PORTFOLIO_SPECIFICATION.md` — source-agnostic multi-source dataset strategy.
- `CHANGE_RECORD_DATASET_001.md` — approved dataset-strategy revision.


## v2.2.1 additions

- `WORKLOAD_AND_BENCHMARK_SPECIFICATION.md` freezes benchmark workload identity and parity.
- `CHANGE_RECORD_REVIEW_002.md` records the approved cross-contract consistency fixes.
- `DATA_CONTRACTS.md` now preserves treatment-stage semantics and explicit status states.
- `DATA_PROVENANCE_SPECIFICATION.md` distinguishes measurements from regulatory limits and supports multi-source simulation lineage.
